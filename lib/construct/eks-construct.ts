import * as cdk from 'aws-cdk-lib';
import * as eksv2 from '@aws-cdk/aws-eks-v2-alpha';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface EksConstructProps {
    readonly clusterName: string;
    readonly vpc?: ec2.IVpc;
    readonly kubernetesVersion?: eksv2.KubernetesVersion;
    readonly nodeGroupInstanceTypes?: ec2.InstanceType[];
    readonly minSize?: number;
    readonly maxSize?: number;
    readonly desiredSize?: number;
    readonly tags?: { [key: string]: string };
    readonly adminPrincipalArn?: string;
    readonly skipClusterAdmin?: boolean;
    readonly authMethod?: 'sso' | 'access-keys' | 'auto';
}

export class EksConstruct extends Construct {
    public readonly cluster: eksv2.Cluster;
    public readonly nodeGroup: eksv2.Nodegroup;
    public readonly vpc: ec2.IVpc;

    constructor(scope: Construct, id: string, props: EksConstructProps) {
        super(scope, id);

        // Use existing VPC or create new one with proper public access configuration
        //
        // ARCHITECTURE DECISIONS:
        // 1. PUBLIC subnets: For LoadBalancers, NAT Gateways, and internet-facing services
        // 2. PRIVATE_WITH_EGRESS subnets: For application pods that need outbound internet access
        // 3. NAT Gateway (1): Provides outbound internet access for private subnet resources
        //    - Allows pods to download container images, install packages, etc.
        //    - Does NOT make LoadBalancers public (that's handled by public subnets)
        //
        this.vpc = props.vpc || new ec2.Vpc(this, 'EksVpc', {
            maxAzs: 2,
            natGateways: 1, // Single NAT Gateway for cost optimization
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'Public',
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 24,
                    name: 'Private',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                }
            ],
        });

        // Create Security Group for Load Balancer with public access
        const albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for Application Load Balancer',
            allowAllOutbound: true,
        });

        // Allow HTTP and HTTPS traffic from anywhere
        albSecurityGroup.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(80),
            'Allow HTTP traffic from anywhere'
        );

        albSecurityGroup.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(443),
            'Allow HTTPS traffic from anywhere'
        );

        // Create EKS Cluster - kubectl provider should be automatically configured
        this.cluster = new eksv2.Cluster(this, 'EksCluster', {
            clusterName: props.clusterName,
            version: props.kubernetesVersion || eksv2.KubernetesVersion.V1_32,
            vpc: this.vpc,
            // Ensure VPC subnets are configured correctly
            vpcSubnets: [
                { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
                { subnetType: ec2.SubnetType.PUBLIC }
            ],
        });

        // EBS CSI DRIVER PERMISSIONS:
        // FIXED: Add EBS permissions to Node Group IAM Role
        //
        // WHY FIXED:
        // - EKS Add-on creates permissions for CSI Driver service account
        // - But Node Group needs permissions to create/attach EBS volumes
        // - Node Group role needs explicit EBS permissions for PVC provisioning
        //

        // Create IAM policy for EBS operations
        const ebsPolicy = new iam.ManagedPolicy(this, 'EbsCsiNodePolicy', {
            description: 'Allows EKS nodes to perform EBS operations for persistent volumes',
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'ec2:CreateVolume',
                        'ec2:AttachVolume',
                        'ec2:DetachVolume',
                        'ec2:DeleteVolume',
                        'ec2:DescribeVolumes',
                        'ec2:DescribeVolumesModifications',
                        'ec2:CreateTags',
                        'ec2:DescribeTags',
                    ],
                    resources: ['*'],
                }),
            ],
        });

        // Create Managed Node Group with EBS permissions
        this.nodeGroup = new eksv2.Nodegroup(this, 'EksNodeGroup', {
            cluster: this.cluster,
            instanceTypes: props.nodeGroupInstanceTypes || [
                new ec2.InstanceType('t3.medium'), // Default optimized for cost
            ],
            minSize: props.minSize || 1,
            maxSize: props.maxSize || 3,
            desiredSize: props.desiredSize || 2,
            amiType: eksv2.NodegroupAmiType.AL2_X86_64,
            capacityType: eksv2.CapacityType.ON_DEMAND,
        });

        // Attach EBS policy to the Node Group role
        this.nodeGroup.role.addManagedPolicy(ebsPolicy);

        // VPC ENDPOINTS FOR ELB:
        // REMOVED: InterfaceVpcEndpoint for ELB - Not needed for public LoadBalancers
        //
        // WHY REMOVED:
        // - VPC Endpoints allow private access to AWS services from within VPC
        // - For PUBLIC LoadBalancers (internet-facing), this is counterproductive
        // - Public LBs need to be in PUBLIC subnets with Internet Gateway
        // - NAT Gateway already handles outbound traffic from private subnets
        // - VPC Endpoint would only be useful for private LBs or cross-region access

        // Configure LoadBalancer subnets to use public subnets
        const publicSubnets = this.vpc.selectSubnets({
            subnetType: ec2.SubnetType.PUBLIC,
        });

        // Add tags for LoadBalancer configuration
        cdk.Tags.of(this.cluster).add('kubernetes.io/cluster/' + props.clusterName, 'owned');
        cdk.Tags.of(this.cluster).add('kubernetes.io/role/elb', '');
        publicSubnets.subnets.forEach((subnet, index) => {
            cdk.Tags.of(subnet).add('kubernetes.io/cluster/' + props.clusterName, 'owned');
            cdk.Tags.of(subnet).add('kubernetes.io/role/elb', '');
        });

        // Apply tags if provided
        if (props.tags) {
            Object.entries(props.tags).forEach(([key, value]) => {
                cdk.Tags.of(this).add(key, value);
            });
        }

        // Add default tags
        cdk.Tags.of(this).add('Component', 'EKS');
        cdk.Tags.of(this).add('ManagedBy', 'CDK');

        // Add the deploying user as cluster admin (if not skipped)
        if (!props.skipClusterAdmin) {
            this.addClusterAdmin(props.adminPrincipalArn, props.authMethod);
        }

        // Outputs are handled by EksFactory to avoid duplicates
    }

    /**
     * Install Devtron with CI/CD module and internet-facing LoadBalancer
     * ⏱️ Time estimate: 3-8 minutes for Helm install + 10-20 minutes for full initialization
     */
    public installDevtron(): eksv2.HelmChart {
        return new eksv2.HelmChart(this, 'DevtronHelmChart', {
            cluster: this.cluster,
            chart: 'devtron-operator',
            repository: 'https://helm.devtron.ai',
            namespace: 'devtroncd',
            createNamespace: true,
            values: {
                installer: {
                    modules: ['cicd']
                }
            },
            // Wait for installation to complete
            wait: false, // Set to false to avoid timeout issues (installation continues in background)
        });
    }

    /**
     * Create Devtron service with internet-facing LoadBalancer configuration
     * This should be called after Devtron is installed
     * ⏱️ Time estimate: 3-7 minutes (AWS LoadBalancer recreation + DNS propagation)
     */
    public createDevtronService(): eksv2.KubernetesManifest {
        return new eksv2.KubernetesManifest(this, 'DevtronServicePatch', {
            cluster: this.cluster,
            manifest: [{
                apiVersion: 'v1',
                kind: 'Service',
                metadata: {
                    name: 'devtron-service-patch',
                    namespace: 'devtroncd',
                    annotations: {
                        // These annotations will make the LoadBalancer internet-facing
                        'service.beta.kubernetes.io/aws-load-balancer-type': 'nlb',
                        'service.beta.kubernetes.io/aws-load-balancer-scheme': 'internet-facing',
                        'service.beta.kubernetes.io/aws-load-balancer-nlb-target-type': 'ip',
                        'service.beta.kubernetes.io/aws-load-balancer-subnets': this.getPublicSubnets()
                            .map(subnet => subnet.subnetId)
                            .join(',')
                    }
                },
                spec: {
                    type: 'LoadBalancer',
                    selector: {
                        app: 'devtron'
                    },
                    ports: [{
                        name: 'devtron',
                        port: 80,
                        targetPort: 'devtron',
                        protocol: 'TCP'
                    }]
                }
            }]
        });
    }

    /**
     * Get public subnets for LoadBalancer services
     */
    public getPublicSubnets(): ec2.ISubnet[] {
        return this.vpc.selectSubnets({
            subnetType: ec2.SubnetType.PUBLIC,
        }).subnets;
    }

    /**
     * Create a public LoadBalancer service configuration
     */
    public createPublicLoadBalancerAnnotations(): { [key: string]: string } {
        return {
            'service.beta.kubernetes.io/aws-load-balancer-type': 'nlb',
            'service.beta.kubernetes.io/aws-load-balancer-scheme': 'internet-facing',
            'service.beta.kubernetes.io/aws-load-balancer-nlb-target-type': 'ip',
            'service.beta.kubernetes.io/aws-load-balancer-subnets': this.getPublicSubnets()
                .map(subnet => subnet.subnetId)
                .join(','),
        };
    }

    /**
     * Add a service account with IRSA
     */
    public addServiceAccount(id: string, options: {
        name: string;
        namespace?: string;
    }): eksv2.ServiceAccount {
        return new eksv2.ServiceAccount(this, id, {
            cluster: this.cluster,
            name: options.name,
            namespace: options.namespace || 'default',
        });
    }

    /**
     * Add a Helm chart
     */
    public addHelmChart(id: string, options: {
        chart: string;
        repository?: string;
        namespace?: string;
        values?: any;
        createNamespace?: boolean;
        wait?: boolean;
        timeout?: cdk.Duration;
    }): eksv2.HelmChart {
        return new eksv2.HelmChart(this, id, {
            cluster: this.cluster,
            chart: options.chart,
            repository: options.repository,
            namespace: options.namespace || 'default',
            values: options.values,
            createNamespace: options.createNamespace,
            wait: options.wait,
            timeout: options.timeout,
        });
    }

    /**
     * Add cluster admin access for the deploying user
     */
    private addClusterAdmin(customPrincipalArn?: string, authMethod: 'sso' | 'access-keys' | 'auto' = 'auto'): void {
        let principalArn: string;

        if (customPrincipalArn) {
            // Use custom principal if provided
            principalArn = customPrincipalArn;
        } else {
            // Get default principal based on auth method
            principalArn = this.getDefaultPrincipalArn(authMethod);
        }

        // Add the principal as cluster admin
        // This allows the specified principal to access the cluster
        new eksv2.AccessEntry(this, 'ClusterAdminAccess', {
            cluster: this.cluster,
            principal: principalArn,
            accessPolicies: [
                eksv2.AccessPolicy.fromAccessPolicyName('AmazonEKSClusterAdminPolicy', {
                    accessScopeType: eksv2.AccessScopeType.CLUSTER,
                }),
            ],
        });
    }

    /**
     * Get the default principal ARN based on authentication method
     */
    private getDefaultPrincipalArn(authMethod: 'sso' | 'access-keys' | 'auto' = 'auto'): string {
        const account = cdk.Stack.of(this).account;

        switch (authMethod) {
            case 'sso':
                // SSO role (current setup)
                return `arn:aws:iam::${account}:role/aws-reserved/sso.amazonaws.com/AWSReservedSSO_AdministratorAccess+_5af960e92c465c55`;

            case 'access-keys':
                // Common roles for access keys - try OrganizationAccountAccessRole first
                return `arn:aws:iam::${account}:role/OrganizationAccountAccessRole`;

            case 'auto':
            default:
                // Default to SSO for backward compatibility
                // TODO: Could implement actual detection logic here
                return `arn:aws:iam::${account}:role/aws-reserved/sso.amazonaws.com/AWSReservedSSO_AdministratorAccess+_5af960e92c465c55`;
        }
    }

    /**
     * Install EKS Add-ons
     */
    public installEksAddons(): void {
        // Install VPC CNI Add-on
        new eksv2.Addon(this, 'VpcCniAddon', {
            cluster: this.cluster,
            addonName: 'vpc-cni',
        });

        // Install CoreDNS Add-on
        new eksv2.Addon(this, 'CoreDnsAddon', {
            cluster: this.cluster,
            addonName: 'coredns',
        });

        // Install kube-proxy Add-on
        new eksv2.Addon(this, 'KubeProxyAddon', {
            cluster: this.cluster,
            addonName: 'kube-proxy',
        });

        // Install EBS CSI Driver Add-on
        new eksv2.Addon(this, 'EbsCsiDriverAddon', {
            cluster: this.cluster,
            addonName: 'aws-ebs-csi-driver',
        });
    }
}