import * as cdk from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface EksConstructProps {
    readonly clusterName: string;
    readonly vpc?: ec2.IVpc;
    readonly vpcName?: string;
    readonly kubernetesVersion?: eks.KubernetesVersion;
    readonly nodeGroupInstanceTypes?: ec2.InstanceType[];
    readonly nodeGroupAmiType?: eks.NodegroupAmiType;
    readonly minSize?: number;
    readonly maxSize?: number;
    readonly desiredSize?: number;
    readonly enableLogging?: boolean;
    readonly enableFargate?: boolean;
    readonly enableAutoMode?: boolean;
    readonly securityGroups?: {
        cluster?: ec2.ISecurityGroup;
        nodeGroup?: ec2.ISecurityGroup;
        alb?: ec2.ISecurityGroup;
    };
    readonly securityGroupConfig?: {
        allowInboundCidrs?: string[];
        customIngressRules?: { port: ec2.Port; source: ec2.IPeer; description?: string }[];
        restrictNodeAccess?: boolean;
        enableVpcEndpointAccess?: boolean;
    };
    readonly tags?: { [key: string]: string };
}

export class EksConstruct extends Construct {
    public readonly cluster: eks.Cluster;
    public readonly nodeGroup?: eks.Nodegroup;
    public readonly vpc: ec2.IVpc;
    public readonly securityGroups: {
        cluster: ec2.ISecurityGroup;
        nodeGroup: ec2.ISecurityGroup;
        alb: ec2.ISecurityGroup;
    };

    constructor(scope: Construct, id: string, props: EksConstructProps) {
        super(scope, id);

        const { vpcName } = props;

        // Use existing VPC or create new one
        this.vpc = props.vpc || new ec2.Vpc(this, 'EksVpc', {
            vpcName: vpcName,
            maxAzs: 3,
            natGateways: 2,
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'PublicSubnet',
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 24,
                    name: 'PrivateSubnet',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
            ],
        });

        // Setup Security Groups
        this.securityGroups = this.setupSecurityGroups(props);

        // Create EKS Cluster Service Role
        const clusterRole = new iam.Role(this, 'EksClusterRole', {
            assumedBy: new iam.ServicePrincipal('eks.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSClusterPolicy'),
            ],
        });

        // Create EKS Cluster with minimal kubectl layer (using type assertion)
        this.cluster = new eks.Cluster(this, 'EksCluster', {
            clusterName: props.clusterName,
            version: props.kubernetesVersion || eks.KubernetesVersion.V1_31,
            role: clusterRole,
            vpc: this.vpc,
            vpcSubnets: [
                { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            ],
            defaultCapacity: 0, // We'll add node groups manually
            endpointAccess: this.getEndpointAccess(props),
            securityGroup: this.securityGroups.cluster,
            clusterLogging: props.enableLogging ? [
                eks.ClusterLoggingTypes.API,
                eks.ClusterLoggingTypes.AUDIT,
                eks.ClusterLoggingTypes.AUTHENTICATOR,
                eks.ClusterLoggingTypes.CONTROLLER_MANAGER,
                eks.ClusterLoggingTypes.SCHEDULER,
            ] : undefined,
        } as any); // Type assertion to bypass kubectl layer requirement

        // Skip EKS Add-ons for initial deployment - install manually later
        // this.installNativeEksAddons(props);

        // Create Managed Node Group only if Auto Mode is not enabled
        if (!props.enableAutoMode) {
            // Create Node Group Role
            const nodeGroupRole = new iam.Role(this, 'EksNodeGroupRole', {
                assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
                managedPolicies: [
                    iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSWorkerNodePolicy'),
                    iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKS_CNI_Policy'),
                    iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
                ],
            });

            // Create Managed Node Group
            this.nodeGroup = new eks.Nodegroup(this, 'EksNodeGroup', {
                cluster: this.cluster,
                nodeRole: nodeGroupRole,
                instanceTypes: props.nodeGroupInstanceTypes || [
                    new ec2.InstanceType('t3.medium'),
                ],
                minSize: props.minSize || 1,
                maxSize: props.maxSize || 5,
                desiredSize: props.desiredSize || 2,
                subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
                amiType: props.nodeGroupAmiType || eks.NodegroupAmiType.BOTTLEROCKET_X86_64,
                capacityType: eks.CapacityType.ON_DEMAND,
                diskSize: 20,
                forceUpdate: false,
                labels: {
                    'node-type': 'managed',
                },
                taints: [],
            });

            // Add node group to cluster security group for communication
            this.securityGroups.nodeGroup.addIngressRule(
                this.securityGroups.cluster,
                ec2.Port.allTraffic(),
                'Allow cluster to communicate with nodes'
            );
        } else {
            // EKS Auto Mode: AWS automatically manages compute capacity
            // - Automatically provisions and scales EC2 instances
            // - Optimizes instance types based on workload requirements
            // - Handles node lifecycle management
            // - No need to create managed node groups manually
            cdk.Tags.of(this.cluster).add('eks:compute-type', 'auto');

            // Note: EKS Auto Mode must be enabled after cluster creation through:
            // AWS Console, AWS CLI, or AWS API. This construct prepares the cluster
            // by not creating managed node groups, allowing Auto Mode to manage compute.

            // Output instruction for enabling Auto Mode
            new cdk.CfnOutput(this, 'AutoModeInstructions', {
                value: `aws eks put-compute-config --cluster-name ${props.clusterName} --compute-config nodePool=system`,
                description: 'Command to enable EKS Auto Mode after deployment',
            });
        }

        // Add Fargate Profile if enabled
        if (props.enableFargate) {
            const fargateRole = new iam.Role(this, 'EksFargateRole', {
                assumedBy: new iam.ServicePrincipal('eks-fargate-pods.amazonaws.com'),
                managedPolicies: [
                    iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSFargatePodExecutionRolePolicy'),
                ],
            });

            this.cluster.addFargateProfile('DefaultFargateProfile', {
                selectors: [
                    { namespace: 'default' },
                    { namespace: 'kube-system' },
                ],
                fargateProfileName: 'default-fargate-profile',
                podExecutionRole: fargateRole,
            });
        }



        // ALB service account IAM policies (commented out for now)
        // TODO: Re-enable after cluster is successfully created
        
        // albServiceAccount.addToPrincipalPolicy(new iam.PolicyStatement({
        //     effect: iam.Effect.ALLOW,
        //     actions: [
        //         'iam:CreateServiceLinkedRole',
        //         'ec2:DescribeAccountAttributes',
        //         'ec2:DescribeAddresses',
        //         'ec2:DescribeAvailabilityZones',
        //         'ec2:DescribeInternetGateways',
        //         'ec2:DescribeVpcs',
        //         'ec2:DescribeSubnets',
        //         'ec2:DescribeSecurityGroups',
        //         'ec2:DescribeInstances',
        //         'ec2:DescribeNetworkInterfaces',
        //         'ec2:DescribeTags',
        //         'ec2:GetCoipPoolUsage',
        //         'ec2:DescribeCoipPools',
        //         'elasticloadbalancing:DescribeLoadBalancers',
        //         'elasticloadbalancing:DescribeLoadBalancerAttributes',
        //         'elasticloadbalancing:DescribeListeners',
        //         'elasticloadbalancing:DescribeListenerCertificates',
        //         'elasticloadbalancing:DescribeSSLPolicies',
        //         'elasticloadbalancing:DescribeRules',
        //         'elasticloadbalancing:DescribeTargetGroups',
        //         'elasticloadbalancing:DescribeTargetGroupAttributes',
        //         'elasticloadbalancing:DescribeTargetHealth',
        //         'elasticloadbalancing:DescribeTags',
        //     ],
        //     resources: ['*'],
        // }));

        // Apply tags to all resources
        if (props.tags) {
            Object.entries(props.tags).forEach(([key, value]) => {
                cdk.Tags.of(this).add(key, value);
            });
        }

        // Add default tags
        cdk.Tags.of(this).add('Component', 'EKS');
        cdk.Tags.of(this).add('ManagedBy', 'CDK');

        // Output important values
        new cdk.CfnOutput(this, 'ClusterName', {
            value: this.cluster.clusterName,
            description: 'EKS Cluster Name',
        });

        new cdk.CfnOutput(this, 'ClusterEndpoint', {
            value: this.cluster.clusterEndpoint,
            description: 'EKS Cluster Endpoint',
        });

        new cdk.CfnOutput(this, 'ClusterArn', {
            value: this.cluster.clusterArn,
            description: 'EKS Cluster ARN',
        });

        new cdk.CfnOutput(this, 'KubectlRoleArn', {
            value: this.cluster.kubectlRole?.roleArn || 'N/A',
            description: 'kubectl Role ARN',
        });

        new cdk.CfnOutput(this, 'ClusterSecurityGroupId', {
            value: this.securityGroups.cluster.securityGroupId,
            description: 'EKS Cluster Security Group ID',
        });

        new cdk.CfnOutput(this, 'NodeGroupSecurityGroupId', {
            value: this.securityGroups.nodeGroup.securityGroupId,
            description: 'EKS Node Group Security Group ID',
        });

        new cdk.CfnOutput(this, 'AlbSecurityGroupId', {
            value: this.securityGroups.alb.securityGroupId,
            description: 'ALB Security Group ID',
        });
    }



    /**
     * Add a managed node group to the cluster
     */
    public addManagedNodeGroup(id: string, options: {
        instanceTypes?: ec2.InstanceType[];
        minSize?: number;
        maxSize?: number;
        desiredSize?: number;
        labels?: { [key: string]: string };
        taints?: eks.TaintSpec[];
        securityGroup?: ec2.ISecurityGroup;
        amiType?: eks.NodegroupAmiType;
    }): eks.Nodegroup {
        const nodeGroupRole = new iam.Role(this, `${id}NodeGroupRole`, {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSWorkerNodePolicy'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKS_CNI_Policy'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
            ],
        });

        const nodeGroup = new eks.Nodegroup(this, id, {
            cluster: this.cluster,
            nodeRole: nodeGroupRole,
            instanceTypes: options.instanceTypes || [new ec2.InstanceType('t3.medium')],
            minSize: options.minSize || 1,
            maxSize: options.maxSize || 3,
            desiredSize: options.desiredSize || 2,
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            amiType: options.amiType || eks.NodegroupAmiType.BOTTLEROCKET_X86_64,
            labels: options.labels,
            taints: options.taints,
        });

        // Configure security group rules for additional node group
        if (options.securityGroup) {
            options.securityGroup.addIngressRule(
                this.securityGroups.cluster,
                ec2.Port.allTraffic(),
                `Allow cluster to communicate with ${id} nodes`
            );
        }

        return nodeGroup;
    }

    /**
     * Install a Helm chart on the cluster
     */
    public addHelmChart(id: string, options: {
        chart: string;
        repository?: string;
        namespace?: string;
        values?: any;
    }): eks.HelmChart {
        return this.cluster.addHelmChart(id, {
            chart: options.chart,
            repository: options.repository,
            namespace: options.namespace || 'default',
            values: options.values,
        });
    }

    /**
     * Create a Kubernetes service account with IRSA
     */
    public addServiceAccountWithIRSA(id: string, options: {
        name: string;
        namespace?: string;
        policyStatements?: iam.PolicyStatement[];
    }): eks.ServiceAccount {
        const serviceAccount = this.cluster.addServiceAccount(id, {
            name: options.name,
            namespace: options.namespace || 'default',
        });

        if (options.policyStatements) {
            options.policyStatements.forEach(statement => {
                serviceAccount.addToPrincipalPolicy(statement);
            });
        }

        return serviceAccount;
    }

    /**
     * Setup security groups for EKS cluster
     */
    private setupSecurityGroups(props: EksConstructProps): {
        cluster: ec2.ISecurityGroup;
        nodeGroup: ec2.ISecurityGroup;
        alb: ec2.ISecurityGroup;
    } {
        if (props.securityGroups) {
            // Use provided security groups or create defaults for missing ones
            return {
                cluster: props.securityGroups.cluster || this.createDefaultClusterSecurityGroup(props),
                nodeGroup: props.securityGroups.nodeGroup || this.createDefaultNodeGroupSecurityGroup(props),
                alb: props.securityGroups.alb || this.createDefaultAlbSecurityGroup(props),
            };
        }

        // Create all default security groups
        return this.createDefaultSecurityGroups(props);
    }

    /**
     * Create default security groups with configuration
     */
    private createDefaultSecurityGroups(props: EksConstructProps): {
        cluster: ec2.ISecurityGroup;
        nodeGroup: ec2.ISecurityGroup;
        alb: ec2.ISecurityGroup;
    } {
        const clusterSG = this.createDefaultClusterSecurityGroup(props);
        const nodeGroupSG = this.createDefaultNodeGroupSecurityGroup(props);
        const albSG = this.createDefaultAlbSecurityGroup(props);

        // Configure inter-security group rules
        this.configureSecurityGroupRules(clusterSG, nodeGroupSG, albSG, props);

        return {
            cluster: clusterSG,
            nodeGroup: nodeGroupSG,
            alb: albSG,
        };
    }

    /**
     * Create default cluster security group
     */
    private createDefaultClusterSecurityGroup(props: EksConstructProps): ec2.SecurityGroup {
        const clusterSG = new ec2.SecurityGroup(this, 'ClusterSecurityGroup', {
            vpc: this.vpc,
            description: 'EKS Cluster Security Group',
            allowAllOutbound: true,
        });

        // Add custom ingress rules if provided
        if (props.securityGroupConfig?.customIngressRules) {
            props.securityGroupConfig.customIngressRules.forEach((rule, index) => {
                clusterSG.addIngressRule(
                    rule.source,
                    rule.port,
                    rule.description || `Custom rule ${index + 1}`
                );
            });
        }

        // Add CIDR-based rules if provided
        if (props.securityGroupConfig?.allowInboundCidrs) {
            props.securityGroupConfig.allowInboundCidrs.forEach((cidr, index) => {
                clusterSG.addIngressRule(
                    ec2.Peer.ipv4(cidr),
                    ec2.Port.tcp(443),
                    `Allow HTTPS from ${cidr}`
                );
            });
        }

        // Add VPC endpoint access if enabled
        if (props.securityGroupConfig?.enableVpcEndpointAccess) {
            clusterSG.addIngressRule(
                ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
                ec2.Port.tcp(443),
                'Allow VPC endpoint access'
            );
        }

        cdk.Tags.of(clusterSG).add('Name', `${props.clusterName}-cluster-sg`);
        return clusterSG;
    }

    /**
     * Create default node group security group
     */
    private createDefaultNodeGroupSecurityGroup(props: EksConstructProps): ec2.SecurityGroup {
        const nodeGroupSG = new ec2.SecurityGroup(this, 'NodeGroupSecurityGroup', {
            vpc: this.vpc,
            description: 'EKS Node Group Security Group',
            allowAllOutbound: true,
        });

        // Allow nodes to communicate with each other
        nodeGroupSG.addIngressRule(
            nodeGroupSG,
            ec2.Port.allTraffic(),
            'Allow nodes to communicate with each other'
        );

        // Allow kubelet and kube-proxy communication
        nodeGroupSG.addIngressRule(
            nodeGroupSG,
            ec2.Port.tcpRange(1025, 65535),
            'Allow kubelet and kube-proxy communication'
        );

        cdk.Tags.of(nodeGroupSG).add('Name', `${props.clusterName}-nodegroup-sg`);
        return nodeGroupSG;
    }

    /**
     * Create default ALB security group
     */
    private createDefaultAlbSecurityGroup(props: EksConstructProps): ec2.SecurityGroup {
        const albSG = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
            vpc: this.vpc,
            description: 'ALB Security Group for EKS',
            allowAllOutbound: true,
        });

        // Allow HTTP and HTTPS traffic from internet
        albSG.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(80),
            'Allow HTTP from internet'
        );

        albSG.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(443),
            'Allow HTTPS from internet'
        );

        // Add custom CIDR rules for ALB if provided
        if (props.securityGroupConfig?.allowInboundCidrs) {
            props.securityGroupConfig.allowInboundCidrs.forEach((cidr) => {
                albSG.addIngressRule(
                    ec2.Peer.ipv4(cidr),
                    ec2.Port.tcpRange(30000, 32767),
                    `Allow NodePort range from ${cidr}`
                );
            });
        }

        cdk.Tags.of(albSG).add('Name', `${props.clusterName}-alb-sg`);
        return albSG;
    }

    /**
     * Configure security group rules between cluster, nodes, and ALB
     */
    private configureSecurityGroupRules(
        clusterSG: ec2.SecurityGroup,
        nodeGroupSG: ec2.SecurityGroup,
        albSG: ec2.SecurityGroup,
        props: EksConstructProps
    ): void {
        // Cluster to nodes communication
        clusterSG.addEgressRule(
            nodeGroupSG,
            ec2.Port.tcp(443),
            'Allow cluster to communicate with nodes on HTTPS'
        );

        clusterSG.addEgressRule(
            nodeGroupSG,
            ec2.Port.tcpRange(1025, 65535),
            'Allow cluster to communicate with nodes on kubelet ports'
        );

        // Nodes to cluster communication
        nodeGroupSG.addEgressRule(
            clusterSG,
            ec2.Port.tcp(443),
            'Allow nodes to communicate with cluster API'
        );

        // ALB to nodes communication
        albSG.addEgressRule(
            nodeGroupSG,
            ec2.Port.tcpRange(30000, 32767),
            'Allow ALB to communicate with NodePort services'
        );

        // Nodes allow ALB traffic
        nodeGroupSG.addIngressRule(
            albSG,
            ec2.Port.tcpRange(30000, 32767),
            'Allow ALB to reach NodePort services'
        );

        // If restricted node access is enabled, only allow cluster SG
        if (props.securityGroupConfig?.restrictNodeAccess) {
            // Remove default SSH access and only allow cluster communication
            nodeGroupSG.addIngressRule(
                clusterSG,
                ec2.Port.tcp(22),
                'Allow SSH only from cluster security group'
            );
        }
    }

    /**
     * Get endpoint access configuration based on security settings
     */
    private getEndpointAccess(props: EksConstructProps): eks.EndpointAccess {
        if (props.securityGroupConfig?.enableVpcEndpointAccess) {
            return eks.EndpointAccess.PRIVATE;
        }

        if (props.securityGroupConfig?.allowInboundCidrs?.length) {
            // If specific CIDRs are allowed, use public and private access
            return eks.EndpointAccess.PUBLIC_AND_PRIVATE;
        }

        // Default to private access for security
        return eks.EndpointAccess.PRIVATE;
    }

    /**
     * Install EKS Add-ons using native AWS APIs (no kubectl required)
     */
    private installNativeEksAddons(props: EksConstructProps): void {
        const cfnTags = this.convertToCfnTags(props.tags);

        // Install EBS CSI Driver Add-on
        new eks.CfnAddon(this, 'EbsCsiDriverAddon', {
            clusterName: this.cluster.clusterName,
            addonName: 'aws-ebs-csi-driver',
            addonVersion: 'v1.34.0-eksbuild.1', // Compatible version
            resolveConflicts: 'OVERWRITE',
            serviceAccountRoleArn: this.createEbsCsiServiceAccountRole().roleArn,
            tags: cfnTags,
        });

        // Install VPC CNI Add-on
        new eks.CfnAddon(this, 'VpcCniAddon', {
            clusterName: this.cluster.clusterName,
            addonName: 'vpc-cni',
            addonVersion: 'v1.18.1-eksbuild.1', // Compatible version
            resolveConflicts: 'OVERWRITE',
            tags: cfnTags,
        });

        // Install CoreDNS Add-on
        new eks.CfnAddon(this, 'CoreDnsAddon', {
            clusterName: this.cluster.clusterName,
            addonName: 'coredns',
            addonVersion: 'v1.11.1-eksbuild.4', // Compatible version
            resolveConflicts: 'OVERWRITE',
            tags: cfnTags,
        });

        // Install kube-proxy Add-on
        new eks.CfnAddon(this, 'KubeProxyAddon', {
            clusterName: this.cluster.clusterName,
            addonName: 'kube-proxy',
            addonVersion: 'v1.29.0-eksbuild.1', // Compatible version for EKS 1.29
            resolveConflicts: 'OVERWRITE',
            tags: cfnTags,
        });

        // Skip AWS Load Balancer Controller Add-on for now - install manually later
        // new eks.CfnAddon(this, 'AwsLoadBalancerControllerAddon', {
        //     clusterName: this.cluster.clusterName,
        //     addonName: 'aws-load-balancer-controller',
        //     addonVersion: 'v2.8.0-eksbuild.1',
        //     resolveConflicts: 'OVERWRITE',
        //     serviceAccountRoleArn: this.createAlbServiceAccountRole().roleArn,
        //     tags: cfnTags,
        // });
    }

    /**
     * Convert tags object to CfnTag array format
     */
    private convertToCfnTags(tags?: { [key: string]: string }): cdk.CfnTag[] | undefined {
        if (!tags) return undefined;
        
        return Object.entries(tags).map(([key, value]) => ({
            key,
            value,
        }));
    }

    /**
     * Create IAM role for EBS CSI Driver service account
     */
    private createEbsCsiServiceAccountRole(): iam.Role {
        const role = new iam.Role(this, 'EbsCsiServiceAccountRole', {
            assumedBy: new iam.ServicePrincipal('pods.eks.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEBSCSIDriverPolicy'),
            ],
        });

        return role;
    }

    /**
     * Create IAM role for AWS Load Balancer Controller service account
     */
    private createAlbServiceAccountRole(): iam.Role {
        const role = new iam.Role(this, 'AlbServiceAccountRole', {
            assumedBy: new iam.ServicePrincipal('pods.eks.amazonaws.com'),
        });

        // Add inline policy for ALB Controller
        role.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'iam:CreateServiceLinkedRole',
                'ec2:DescribeAccountAttributes',
                'ec2:DescribeAddresses',
                'ec2:DescribeAvailabilityZones',
                'ec2:DescribeInternetGateways',
                'ec2:DescribeVpcs',
                'ec2:DescribeVpcPeeringConnections',
                'ec2:DescribeSubnets',
                'ec2:DescribeSecurityGroups',
                'ec2:DescribeInstances',
                'ec2:DescribeNetworkInterfaces',
                'ec2:DescribeTags',
                'ec2:GetCoipPoolUsage',
                'ec2:DescribeCoipPools',
                'elasticloadbalancing:DescribeLoadBalancers',
                'elasticloadbalancing:DescribeLoadBalancerAttributes',
                'elasticloadbalancing:DescribeListeners',
                'elasticloadbalancing:DescribeListenerCertificates',
                'elasticloadbalancing:DescribeSSLPolicies',
                'elasticloadbalancing:DescribeRules',
                'elasticloadbalancing:DescribeTargetGroups',
                'elasticloadbalancing:DescribeTargetGroupAttributes',
                'elasticloadbalancing:DescribeTargetHealth',
                'elasticloadbalancing:DescribeTags',
            ],
            resources: ['*'],
        }));

        role.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'cognito-idp:DescribeUserPoolClient',
                'acm:ListCertificates',
                'acm:DescribeCertificate',
                'iam:ListServerCertificates',
                'iam:GetServerCertificate',
                'waf-regional:GetWebACL',
                'waf-regional:GetWebACLForResource',
                'waf-regional:AssociateWebACL',
                'waf-regional:DisassociateWebACL',
                'wafv2:GetWebACL',
                'wafv2:GetWebACLForResource',
                'wafv2:AssociateWebACL',
                'wafv2:DisassociateWebACL',
                'shield:DescribeProtection',
                'shield:GetSubscriptionState',
                'shield:DescribeSubscription',
                'shield:CreateProtection',
                'shield:DeleteProtection',
            ],
            resources: ['*'],
        }));

        role.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'elasticloadbalancing:CreateLoadBalancer',
                'elasticloadbalancing:CreateTargetGroup',
            ],
            resources: ['*'],
            conditions: {
                StringEquals: {
                    'elasticloadbalancing:CreateAction': [
                        'CreateTargetGroup',
                        'CreateLoadBalancer',
                    ],
                },
            },
        }));

        return role;
    }
}