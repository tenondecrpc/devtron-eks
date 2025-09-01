import { Construct } from "constructs";
import { CfnOutput } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as eksv2 from '@aws-cdk/aws-eks-v2-alpha';
import { EksConstruct } from "../../construct/eks-construct";
import { ParamsConfig } from "../shared/util/env-config";

export interface EksFactoryProps {
    params: ParamsConfig;
    vpc?: ec2.IVpc;
}

/**
 * Centralized factory for creating EKS clusters with essential add-ons
 * Provides a clean, optimized EKS cluster ready for your applications
 */
export class EksFactory extends Construct {
    public readonly cluster: EksConstruct;

    constructor(scope: Construct, id: string, props: EksFactoryProps) {
        super(scope, id);

        const { params, vpc } = props;
        const { envName, projectName, ssoRoleName, isProd } = params;

        // Create EKS cluster with optimized configuration
        this.cluster = new EksConstruct(this, 'EksCluster', {
            clusterName: `${projectName}-${envName}-cluster`,
            vpc: vpc,
            kubernetesVersion: eksv2.KubernetesVersion.V1_32,
            nodeGroupInstanceTypes: [
                // Cost optimization: t3.medium for dev, t3.large for prod
                isProd ? new ec2.InstanceType('t3.large') : new ec2.InstanceType('t3.medium'),
            ],
            minSize: 3,
            maxSize: isProd ? 15 : 8,
            desiredSize: isProd ? 6 : 3,
            tags: {
                Environment: envName,
                Project: projectName,
                Purpose: 'EKS-Cluster',
                ManagedBy: 'CDK-EksFactory',
            },
            authMethod: 'sso',
            ssoRoleName: ssoRoleName,
        });

        // Install essential EKS add-ons
        this.cluster.installEksAddons();

        // Create outputs for easy access
        this.createOutputs();
    }

    /**
     * Create essential CloudFormation outputs (non-redundant with npm scripts)
     */
    private createOutputs(): void {
        const clusterName = this.cluster.cluster.clusterName;
        const region = this.node.tryGetContext('aws:region') || 'us-east-1';

        // Essential cluster information (no redundant with npm scripts)
        new CfnOutput(this, 'EksClusterName', {
            value: clusterName,
            description: 'EKS Cluster name for reference',
        });

        new CfnOutput(this, 'EksClusterEndpoint', {
            value: this.cluster.cluster.clusterEndpoint,
            description: 'EKS Cluster API endpoint (use with npm run connect-cluster)',
        });

        // Configuration info (useful for automation/terraform)
        new CfnOutput(this, 'EksRegion', {
            value: region,
            description: 'AWS Region where cluster is deployed',
        });

        new CfnOutput(this, 'EksVpcId', {
            value: this.cluster.cluster.vpc.vpcId,
            description: 'VPC ID for network configuration',
        });

        // Quick reference for cluster operations
        new CfnOutput(this, 'EksQuickStart', {
            value: `npm run connect-cluster && npm run status && npm run cost-analysis`,
            description: 'Quick commands to verify cluster after deployment',
        });
    }



}