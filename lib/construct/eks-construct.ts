import * as cdk from 'aws-cdk-lib';
import * as eksv2 from '@aws-cdk/aws-eks-v2-alpha';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { KubectlV32Layer } from '@aws-cdk/lambda-layer-kubectl-v32';
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
    readonly ssoRoleName?: string;
    readonly accessRoleName?: string;
}

export class EksConstruct extends Construct {
    public readonly cluster: eksv2.Cluster;
    public readonly nodeGroup: eksv2.Nodegroup;
    public readonly vpc: ec2.IVpc;

    constructor(scope: Construct, id: string, props: EksConstructProps) {
        super(scope, id);

        // Create VPC with public/private subnets
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

        // Create Security Group for Load Balancer
        const albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for Application Load Balancer',
            allowAllOutbound: true,
        });

        albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP');
        albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS');

        this.cluster = new eksv2.Cluster(this, 'EksCluster', {
            clusterName: props.clusterName,
            version: props.kubernetesVersion || eksv2.KubernetesVersion.V1_32,
            vpc: this.vpc,
            vpcSubnets: [
                { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
                { subnetType: ec2.SubnetType.PUBLIC }
            ],
            endpointAccess: eksv2.EndpointAccess.PUBLIC_AND_PRIVATE,
            kubectlProviderOptions: {
                kubectlLayer: new KubectlV32Layer(this, 'KubectlLayer'),
            },
        });

        // Create IAM policy for EBS operations
        const ebsPolicy = new iam.ManagedPolicy(this, 'EbsCsiNodePolicy', {
            description: 'Allows EKS nodes to perform EBS operations for persistent volumes',
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'ec2:CreateVolume', 'ec2:AttachVolume', 'ec2:DetachVolume', 'ec2:DeleteVolume',
                        'ec2:DescribeVolumes', 'ec2:DescribeVolumesModifications', 'ec2:CreateTags', 'ec2:DescribeTags',
                    ],
                    resources: ['*'],
                }),
            ],
        });

        this.nodeGroup = new eksv2.Nodegroup(this, 'EksNodeGroup', {
            cluster: this.cluster,
            instanceTypes: props.nodeGroupInstanceTypes || [new ec2.InstanceType('t3.medium')],
            minSize: props.minSize || 1,
            maxSize: props.maxSize || 3,
            desiredSize: props.desiredSize || 2,
            amiType: eksv2.NodegroupAmiType.AL2_X86_64,
            capacityType: eksv2.CapacityType.ON_DEMAND,
        });

        this.nodeGroup.role.addManagedPolicy(ebsPolicy);

        // Configure LoadBalancer subnets
        const publicSubnets = this.vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC });
        
        cdk.Tags.of(this.cluster).add(`kubernetes.io/cluster/${props.clusterName}`, 'owned');
        cdk.Tags.of(this.cluster).add('kubernetes.io/role/elb', '');
        publicSubnets.subnets.forEach((subnet) => {
            cdk.Tags.of(subnet).add(`kubernetes.io/cluster/${props.clusterName}`, 'owned');
            cdk.Tags.of(subnet).add('kubernetes.io/role/elb', '');
        });

        // Apply custom and default tags
        if (props.tags) {
            Object.entries(props.tags).forEach(([key, value]) => {
                cdk.Tags.of(this).add(key, value);
            });
        }
        cdk.Tags.of(this).add('Component', 'EKS');
        cdk.Tags.of(this).add('ManagedBy', 'CDK');

        // Add cluster admin access
        if (!props.skipClusterAdmin) {
            this.addClusterAdmin(props, props.adminPrincipalArn, props.authMethod);
        }
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
    private addClusterAdmin(props: EksConstructProps, customPrincipalArn?: string, authMethod: 'sso' | 'access-keys' | 'auto' = 'auto'): void {
        let principalArn: string;

        if (customPrincipalArn) {
            principalArn = customPrincipalArn;
        } else {
            principalArn = this.getDefaultPrincipalArn(props, authMethod);
        }

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
    private getDefaultPrincipalArn(props: EksConstructProps, authMethod: 'sso' | 'access-keys' | 'auto' = 'auto'): string {
        const account = cdk.Stack.of(this).account;

        switch (authMethod) {
            case 'sso':
                const ssoRoleName = props.ssoRoleName || 'aws-reserved/sso.amazonaws.com/AWSReservedSSO_AdministratorAccess';
                return `arn:aws:iam::${account}:role/${ssoRoleName}`;

            case 'access-keys':
                const accessRoleName = props.accessRoleName || 'OrganizationAccountAccessRole';
                return `arn:aws:iam::${account}:role/${accessRoleName}`;

            case 'auto':
            default:
                const defaultRoleName = props.ssoRoleName || 'aws-reserved/sso.amazonaws.com/AWSReservedSSO_AdministratorAccess';
                return `arn:aws:iam::${account}:role/${defaultRoleName}`;
        }
    }

    /**
     * Ensure default Storage Class exists for EKS
     * Creates gp3 StorageClass as default via KubernetesManifest
     */
    private ensureDefaultStorageClass(): void {
        // EBS CSI Driver addon and gp3 StorageClass will be installed
    }

    /**
     * Install EKS Add-ons with storage configuration
     */
    public installEksAddons(): void {
        this.ensureDefaultStorageClass();

        new eksv2.Addon(this, 'VpcCniAddon', {
            cluster: this.cluster,
            addonName: 'vpc-cni',
        });

        new eksv2.Addon(this, 'CoreDnsAddon', {
            cluster: this.cluster,
            addonName: 'coredns',
        });

        new eksv2.Addon(this, 'KubeProxyAddon', {
            cluster: this.cluster,
            addonName: 'kube-proxy',
        });

        new eksv2.Addon(this, 'EbsCsiDriverAddon', {
            cluster: this.cluster,
            addonName: 'aws-ebs-csi-driver',
        });

        // Create gp3 StorageClass as default
        new eksv2.KubernetesManifest(this, 'Gp3StorageClass', {
            cluster: this.cluster,
            manifest: [{
                apiVersion: 'storage.k8s.io/v1',
                kind: 'StorageClass',
                metadata: {
                    name: 'gp3',
                    annotations: {
                        'storageclass.kubernetes.io/is-default-class': 'true',
                    },
                },
                provisioner: 'ebs.csi.aws.com',
                parameters: {
                    type: 'gp3',
                    fsType: 'ext4',
                    iops: '3000',
                    throughput: '125',
                },
                reclaimPolicy: 'Delete',
                allowVolumeExpansion: true,
                volumeBindingMode: 'WaitForFirstConsumer',
            }],
        });
    }
}