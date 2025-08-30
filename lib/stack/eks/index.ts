import { Construct } from "constructs";
import { CfnOutput, Duration } from "aws-cdk-lib";
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
        const { envName, projectName } = params;
        const isProd = envName === "prod";

        // Create EKS cluster with optimized configuration
        this.cluster = new EksConstruct(this, 'EksCluster', {
            clusterName: `${projectName}-${envName}-cluster`,
            vpc: vpc,
            kubernetesVersion: eksv2.KubernetesVersion.V1_32,
            nodeGroupInstanceTypes: [
                new ec2.InstanceType('t3.medium'),
            ],
            minSize: 2,
            maxSize: 10,
            desiredSize: isProd ? 4 : 2,
            tags: {
                Environment: envName,
                Project: projectName,
                Purpose: 'EKS-Cluster',
                ManagedBy: 'CDK-EksFactory',
            },
        });

        // Install essential EKS add-ons
        this.cluster.installEksAddons();

        // Create outputs for easy access
        this.createOutputs();
    }

    /**
     * Create CloudFormation outputs for easy access
     */
    private createOutputs(): void {
        const clusterName = this.cluster.cluster.clusterName;
        const region = this.node.tryGetContext('aws:region') || 'us-east-1';

        // Essential cluster information
        new CfnOutput(this, 'EksClusterName', {
            value: clusterName,
            description: 'EKS Cluster name',
        });

        new CfnOutput(this, 'EksClusterEndpoint', {
            value: this.cluster.cluster.clusterEndpoint,
            description: 'EKS Cluster API endpoint',
        });

        new CfnOutput(this, 'EksClusterArn', {
            value: this.cluster.cluster.clusterArn,
            description: 'EKS Cluster ARN',
        });

        // Useful commands
        new CfnOutput(this, 'EksKubectlConfig', {
            value: `aws eks update-kubeconfig --region ${region} --name ${clusterName} --profile EKS_PROFILE`,
            description: 'Command to configure kubectl for this cluster',
        });

        new CfnOutput(this, 'EksConnectCommand', {
            value: `npm run connect-cluster`,
            description: 'Quick connect command using npm script',
        });

        new CfnOutput(this, 'EksClusterStatus', {
            value: `kubectl cluster-info && kubectl get nodes`,
            description: 'Commands to verify cluster status',
        });

        new CfnOutput(this, 'EksPodsStatus', {
            value: `kubectl get pods -A --field-selector=status.phase!=Running`,
            description: 'Check for non-running pods across all namespaces',
        });

        new CfnOutput(this, 'EksServicesStatus', {
            value: `kubectl get svc -A`,
            description: 'List all services in the cluster',
        });

        new CfnOutput(this, 'EksNodeGroups', {
            value: `kubectl get nodes --label-columns=eks.amazonaws.com/nodegroup`,
            description: 'View EKS node group information',
        });

        new CfnOutput(this, 'EksStorageClasses', {
            value: `kubectl get storageclass`,
            description: 'List available storage classes',
        });

        new CfnOutput(this, 'EksClusterEvents', {
            value: `kubectl get events --sort-by=.metadata.creationTimestamp`,
            description: 'View recent cluster events',
        });

        new CfnOutput(this, 'EksResourceUsage', {
            value: `kubectl top nodes && echo "---" && kubectl top pods -A`,
            description: 'Check resource usage for nodes and pods',
        });

        new CfnOutput(this, 'EksQuickConnect', {
            value: `npm run connect-cluster`,
            description: 'Quick command to connect to the cluster',
        });
    }

}