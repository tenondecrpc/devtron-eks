import { Construct } from "constructs";
import { CfnOutput } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as eksv2 from '@aws-cdk/aws-eks-v2-alpha';
import { EksConstruct } from "../../construct/eks-construct";
import { ParamsConfig } from "../shared/util/env-config";

export interface EksFactoryProps {
    params: ParamsConfig;
    vpc?: ec2.IVpc;
    enableDevtron?: boolean;
    devtronConfig?: {
        adminEmail?: string;
        adminPassword?: string;
        enableIngress?: boolean;
        ingressClass?: string;
        storageClass?: string;
        enableMonitoring?: boolean;
    };
}

/**
 * Centralized factory for creating EKS clusters optimized for Devtron platform
 * Devtron is a comprehensive DevOps platform for Kubernetes applications
 */
export class EksFactory extends Construct {
    public readonly cluster: EksConstruct;
    public readonly devtronNamespace: string = 'devtroncd';
    public devtronServiceAccount?: eksv2.ServiceAccount;
    public devtronHelmChart?: eksv2.HelmChart;

    constructor(scope: Construct, id: string, props: EksFactoryProps) {
        super(scope, id);

        const { params, vpc, enableDevtron = true, devtronConfig = {} } = props;
        const { envName, projectName } = params;
        const isProd = envName === "prod";

        // Create EKS cluster with simplified configuration
        this.cluster = new EksConstruct(this, 'EksCluster', {
            clusterName: `${projectName}-${envName}-cluster`,
            vpc: vpc,
            kubernetesVersion: eksv2.KubernetesVersion.V1_31,
            nodeGroupInstanceTypes: [
                new ec2.InstanceType('t3.large'), // Devtron needs more resources
            ],
            minSize: 2,
            maxSize: 10,
            desiredSize: isProd ? 4 : 2,
            tags: {
                Environment: envName,
                Project: projectName,
                Purpose: 'Devtron-Platform',
                ManagedBy: 'CDK-EksFactory',
            },
        });

        // Install essential add-ons using aws-eks-v2
        this.cluster.installEksAddons();

        // Skip Devtron installation for now - can be installed manually later
        // if (enableDevtron) {
        //     this.installDevtron(devtronConfig);
        // }

        // Create outputs for easy access
        this.createOutputs();
    }

    /**
     * Create CloudFormation outputs for easy access
     */
    private createOutputs(): void {
        new CfnOutput(this, 'DevtronClusterName', {
            value: this.cluster.cluster.clusterName,
            description: 'EKS Cluster name for Devtron',
        });

        new CfnOutput(this, 'DevtronNamespace', {
            value: this.devtronNamespace,
            description: 'Kubernetes namespace where Devtron is installed',
        });

        new CfnOutput(this, 'DevtronKubectlCommand', {
            value: `aws eks update-kubeconfig --region ${this.node.tryGetContext('aws:region') || 'us-east-1'} --name ${this.cluster.cluster.clusterName}`,
            description: 'Command to configure kubectl for this cluster',
        });
    }
}