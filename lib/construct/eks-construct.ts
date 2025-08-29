import * as cdk from 'aws-cdk-lib';
import * as eksv2 from '@aws-cdk/aws-eks-v2-alpha';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
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

        // Use existing VPC or create new one
        this.vpc = props.vpc || new ec2.Vpc(this, 'EksVpc', {
            maxAzs: 2,
            natGateways: 1,
        });

        // Create EKS Cluster with minimal configuration
        this.cluster = new eksv2.Cluster(this, 'EksCluster', {
            clusterName: props.clusterName,
            version: props.kubernetesVersion || eksv2.KubernetesVersion.V1_31,
            vpc: this.vpc,
        });

        // Create Managed Node Group with minimal configuration
        this.nodeGroup = new eksv2.Nodegroup(this, 'EksNodeGroup', {
            cluster: this.cluster,
            instanceTypes: props.nodeGroupInstanceTypes || [
                new ec2.InstanceType('t3.medium'),
            ],
            minSize: props.minSize || 1,
            maxSize: props.maxSize || 3,
            desiredSize: props.desiredSize || 2,
            amiType: eksv2.NodegroupAmiType.AL2_X86_64,
            capacityType: eksv2.CapacityType.ON_DEMAND,
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

        new cdk.CfnOutput(this, 'ClusterSecurityGroupId', {
            value: this.cluster.clusterSecurityGroup.securityGroupId,
            description: 'EKS Cluster Security Group ID',
        });

        new cdk.CfnOutput(this, 'OpenIdConnectProviderArn', {
            value: this.cluster.openIdConnectProvider.openIdConnectProviderArn,
            description: 'OIDC Provider ARN for IRSA',
        });
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
    }): eksv2.HelmChart {
        return new eksv2.HelmChart(this, id, {
            cluster: this.cluster,
            chart: options.chart,
            repository: options.repository,
            namespace: options.namespace || 'default',
            values: options.values,
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