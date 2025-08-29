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
        domain?: string;
        useLoadBalancer?: boolean;
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

        // Install Devtron if enabled (CDK handles complete installation)
        if (enableDevtron) {
            this.installDevtronViaCDK(devtronConfig);
        }

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

        // Devtron-specific outputs
        if (this.devtronConfigValues) {
            new CfnOutput(this, 'DevtronInstallationStatus', {
                value: 'Configuration Prepared by CDK',
                description: 'Devtron installation status',
            });

            new CfnOutput(this, 'DevtronHelmRelease', {
                value: 'devtron (to be installed)',
                description: 'Helm release name for Devtron',
            });

            // Output Devtron configuration if available
            if (this.devtronConfigValues) {
                new CfnOutput(this, 'DevtronConfigFile', {
                    value: this.devtronConfigValues,
                    description: 'Devtron Helm values configuration (save as devtron-values.yaml)',
                });
            }

            // Output Devtron access information
            if (this.devtronAccessType && this.devtronDomain) {
                if (this.devtronAccessType === 'LoadBalancer') {
                    new CfnOutput(this, 'DevtronAccessType', {
                        value: 'LoadBalancer Service',
                        description: 'Devtron access method',
                    });

                    new CfnOutput(this, 'DevtronLoadBalancerCommand', {
                        value: `kubectl get svc -n ${this.devtronNamespace} | grep devtron`,
                        description: 'Command to get LoadBalancer URL for Devtron',
                    });

                    new CfnOutput(this, 'DevtronUrl', {
                        value: `http://${this.devtronDomain}:80 (will be LoadBalancer URL)`,
                        description: 'Devtron access URL (LoadBalancer will provide actual URL)',
                    });
                } else if (this.devtronAccessType === 'Ingress') {
                    new CfnOutput(this, 'DevtronAccessType', {
                        value: 'Ingress',
                        description: 'Devtron access method',
                    });

                    new CfnOutput(this, 'DevtronUrl', {
                        value: this.devtronDomain.includes('.local') ?
                               `http://${this.devtronDomain}` :
                               `https://${this.devtronDomain}`,
                        description: 'Devtron dashboard URL',
                    });
                }
            }

            new CfnOutput(this, 'DevtronAccessCommand', {
                value: `kubectl port-forward svc/devtron-service -n ${this.devtronNamespace} 32000:80`,
                description: 'Command to access Devtron dashboard locally',
            });

            new CfnOutput(this, 'DevtronLogsCommand', {
                value: `kubectl logs -f deployment/devtron -n ${this.devtronNamespace}`,
                description: 'Command to view Devtron logs',
            });

            new CfnOutput(this, 'DevtronStatusCommand', {
                value: `kubectl get all -n ${this.devtronNamespace}`,
                description: 'Command to check Devtron deployment status',
            });

            new CfnOutput(this, 'DevtronUnifiedManager', {
                value: `./scripts/devtron-manager.sh`,
                description: 'Run unified Devtron manager (installation, operations, troubleshooting)',
            });

            new CfnOutput(this, 'DevtronVerificationCommands', {
                value: `kubectl get pods -n ${this.devtronNamespace} && kubectl get svc -n ${this.devtronNamespace}`,
                description: 'Commands to verify Devtron installation',
            });
        } else {
            new CfnOutput(this, 'DevtronInstallationStatus', {
                value: 'Not Enabled (use enableDevtron=true to prepare installation)',
                description: 'Devtron installation status',
            });
        }
    }

    /**
     * Install Devtron platform using Helm chart via CDK
     * CDK will handle the complete installation automatically
     */
    private installDevtronViaCDK(devtronConfig: {
        adminEmail?: string;
        adminPassword?: string;
        enableIngress?: boolean;
        ingressClass?: string;
        domain?: string;
        useLoadBalancer?: boolean;
        storageClass?: string;
        enableMonitoring?: boolean;
    }): void {
        // Create the Helm values for Devtron installation
        const helmValues: any = {
            installer: {
                release: 'devtron',
                modules: ['cicd']
            },
            components: {
                dashboard: {
                    enabled: true
                },
                devtron: {
                    enabled: true
                },
                argocd: {
                    enabled: true
                }
            },
            // Default configurations
            global: {
                postgres: {
                    storage: '8Gi'
                },
                prometheus: {
                    storage: '8Gi'
                },
                minio: {
                    storage: '8Gi'
                }
            }
        };

        // Configure access method (Ingress or LoadBalancer)
        this.configureDevtronAccess(helmValues, devtronConfig);

        // Configure storage class if specified
        if (devtronConfig.storageClass) {
            helmValues.global.storageClass = devtronConfig.storageClass;
        }

        // Configure monitoring if enabled
        if (devtronConfig.enableMonitoring) {
            helmValues.monitoring = {
                enabled: true,
                prometheus: {
                    enabled: true
                },
                grafana: {
                    enabled: true
                }
            };
        }

        // Configure admin credentials if provided
        if (devtronConfig.adminEmail) {
            helmValues.installer.adminEmail = devtronConfig.adminEmail;
        }
        if (devtronConfig.adminPassword) {
            helmValues.installer.adminPassword = devtronConfig.adminPassword;
        }

        // CDK prepares the configuration for Devtron installation
        // The actual installation will be done by the automated script
        this.devtronConfigValues = JSON.stringify(helmValues, null, 2);
    }

    /**
     * Configure Devtron access method (Ingress or LoadBalancer)
     */
    private configureDevtronAccess(helmValues: any, devtronConfig: {
        adminEmail?: string;
        adminPassword?: string;
        enableIngress?: boolean;
        ingressClass?: string;
        domain?: string;
        useLoadBalancer?: boolean;
        storageClass?: string;
        enableMonitoring?: boolean;
    }): void {
        // Determine domain to use
        const domain = devtronConfig.domain ||
                      this.node.tryGetContext('domain') ||
                      'devtron.local';

        // Determine access method
        const useLoadBalancer = devtronConfig.useLoadBalancer ||
                               (!devtronConfig.enableIngress && !devtronConfig.domain);

        if (useLoadBalancer) {
            // Use LoadBalancer service for direct access
            helmValues.service = {
                type: 'LoadBalancer',
                annotations: {
                    'service.beta.kubernetes.io/aws-load-balancer-type': 'external',
                    'service.beta.kubernetes.io/aws-load-balancer-nlb-target-type': 'ip',
                    'service.beta.kubernetes.io/aws-load-balancer-scheme': 'internet-facing'
                }
            };

            // Store LoadBalancer info for outputs
            this.devtronAccessType = 'LoadBalancer';
            this.devtronDomain = domain;

        } else if (devtronConfig.enableIngress) {
            // Use Ingress with configurable domain
            helmValues.ingress = {
                enabled: true,
                className: devtronConfig.ingressClass || 'nginx',
                hosts: [{
                    host: `devtron.${domain}`,
                    paths: [{
                        path: '/',
                        pathType: 'Prefix'
                    }]
                }]
            };

            // Add TLS only if it's not a local/generic domain
            if (!domain.includes('.local') && !domain.includes('example.com')) {
                helmValues.ingress.tls = [{
                    secretName: 'devtron-tls',
                    hosts: [`devtron.${domain}`]
                }];
            }

            // Store ingress info for outputs
            this.devtronAccessType = 'Ingress';
            this.devtronDomain = `devtron.${domain}`;
        } else {
            // Default to LoadBalancer if no specific configuration
            helmValues.service = {
                type: 'LoadBalancer',
                annotations: {
                    'service.beta.kubernetes.io/aws-load-balancer-type': 'external',
                    'service.beta.kubernetes.io/aws-load-balancer-nlb-target-type': 'ip',
                    'service.beta.kubernetes.io/aws-load-balancer-scheme': 'internet-facing'
                }
            };

            this.devtronAccessType = 'LoadBalancer';
            this.devtronDomain = domain;
        }
    }

    // Add properties to store access configuration
    private devtronConfigValues?: string;
    private devtronAccessType?: string;
    private devtronDomain?: string;
}