import { Construct } from "constructs";
import { Duration, RemovalPolicy, CfnOutput } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as eks from "aws-cdk-lib/aws-eks";
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
    public devtronServiceAccount?: eks.ServiceAccount;
    public devtronHelmChart?: eks.HelmChart;

    constructor(scope: Construct, id: string, props: EksFactoryProps) {
        super(scope, id);

        const { params, vpc, enableDevtron = true, devtronConfig = {} } = props;
        const { envName, projectName } = params;
        const isProd = envName === "prod";

        // Create EKS cluster optimized for Devtron
        this.cluster = new EksConstruct(this, 'EksCluster', {
            clusterName: `${projectName}-${envName}-cluster`,
            vpc: vpc,
            vpcName: `${projectName}-${envName}-vpc`,
            kubernetesVersion: eks.KubernetesVersion.V1_31,
            nodeGroupInstanceTypes: [
                new ec2.InstanceType('t3.large'), // Devtron needs more resources
                new ec2.InstanceType('t3.xlarge'),
            ],
            minSize: 2,
            maxSize: 10,
            desiredSize: isProd ? 4 : 2,
            enableLogging: true,
            enableFargate: false, // Devtron works better with managed node groups
            enableAutoMode: false, // Use managed node groups for better control
            securityGroupConfig: {
                allowInboundCidrs: ['0.0.0.0/0'], // Allow access for Devtron UI
                enableVpcEndpointAccess: true,
                restrictNodeAccess: false,
            },
            tags: {
                Environment: envName,
                Project: projectName,
                Purpose: 'Devtron-Platform',
                ManagedBy: 'CDK-EksFactory',
            },
        });

        // Install essential add-ons using Kubernetes manifests (no kubectl required)
        this.installEssentialAddonsWithManifests();

        // Skip Devtron installation for now - can be installed manually later
        // if (enableDevtron) {
        //     this.installDevtron(devtronConfig);
        // }

        // Create outputs for easy access
        this.createOutputs();
    }

    /**
     * Install essential Kubernetes add-ons required for Devtron
     */
    private installEssentialAddons(): void {
        // Install EBS CSI Driver for persistent storage
        const ebsCsiServiceAccount = this.cluster.addServiceAccountWithIRSA('EbsCsiDriverServiceAccount', {
            name: 'ebs-csi-controller-sa',
            namespace: 'kube-system',
            policyStatements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'ec2:CreateSnapshot',
                        'ec2:AttachVolume',
                        'ec2:DetachVolume',
                        'ec2:ModifyVolume',
                        'ec2:DescribeAvailabilityZones',
                        'ec2:DescribeInstances',
                        'ec2:DescribeSnapshots',
                        'ec2:DescribeTags',
                        'ec2:DescribeVolumes',
                        'ec2:DescribeVolumesModifications',
                    ],
                    resources: ['*'],
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'ec2:CreateTags',
                    ],
                    resources: [
                        'arn:aws:ec2:*:*:volume/*',
                        'arn:aws:ec2:*:*:snapshot/*',
                    ],
                    conditions: {
                        StringEquals: {
                            'ec2:CreateAction': ['CreateVolume', 'CreateSnapshot'],
                        },
                    },
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'ec2:DeleteTags',
                    ],
                    resources: [
                        'arn:aws:ec2:*:*:volume/*',
                        'arn:aws:ec2:*:*:snapshot/*',
                    ],
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'ec2:CreateVolume',
                    ],
                    resources: ['*'],
                    conditions: {
                        StringLike: {
                            'aws:RequestedRegion': '*',
                        },
                    },
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'ec2:DeleteVolume',
                    ],
                    resources: ['*'],
                    conditions: {
                        StringLike: {
                            'ec2:ResourceTag/ebs.csi.aws.com/cluster': 'true',
                        },
                    },
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'ec2:DeleteSnapshot',
                    ],
                    resources: ['*'],
                    conditions: {
                        StringLike: {
                            'ec2:ResourceTag/CSIVolumeSnapshotName': '*',
                        },
                    },
                }),
            ],
        });

        // Install EBS CSI Driver
        this.cluster.addHelmChart('EbsCsiDriver', {
            chart: 'aws-ebs-csi-driver',
            repository: 'https://kubernetes-sigs.github.io/aws-ebs-csi-driver',
            namespace: 'kube-system',
            values: {
                controller: {
                    serviceAccount: {
                        create: false,
                        name: 'ebs-csi-controller-sa',
                    },
                },
            },
        });

        // Install Metrics Server for HPA and monitoring
        this.cluster.addHelmChart('MetricsServer', {
            chart: 'metrics-server',
            repository: 'https://kubernetes-sigs.github.io/metrics-server/',
            namespace: 'kube-system',
            values: {
                args: [
                    '--cert-dir=/tmp',
                    '--secure-port=4443',
                    '--kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname',
                    '--kubelet-use-node-status-port',
                    '--metric-resolution=15s',
                ],
            },
        });

        // Install Cluster Autoscaler
        const clusterAutoscalerServiceAccount = this.cluster.addServiceAccountWithIRSA('ClusterAutoscalerServiceAccount', {
            name: 'cluster-autoscaler',
            namespace: 'kube-system',
            policyStatements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'autoscaling:DescribeAutoScalingGroups',
                        'autoscaling:DescribeAutoScalingInstances',
                        'autoscaling:DescribeLaunchConfigurations',
                        'autoscaling:DescribeTags',
                        'autoscaling:SetDesiredCapacity',
                        'autoscaling:TerminateInstanceInAutoScalingGroup',
                        'ec2:DescribeLaunchTemplateVersions',
                    ],
                    resources: ['*'],
                }),
            ],
        });

        this.cluster.addHelmChart('ClusterAutoscaler', {
            chart: 'cluster-autoscaler',
            repository: 'https://kubernetes.github.io/autoscaler',
            namespace: 'kube-system',
            values: {
                autoDiscovery: {
                    clusterName: this.cluster.cluster.clusterName,
                },
                awsRegion: this.cluster.cluster.stack.region,
                rbac: {
                    serviceAccount: {
                        create: false,
                        name: 'cluster-autoscaler',
                    },
                },
            },
        });
    }

    /**
     * Install Devtron platform on the EKS cluster
     */
    private installDevtron(config: EksFactoryProps['devtronConfig'] = {}): void {
        const {
            adminEmail = 'admin@devtron.ai',
            adminPassword = 'devtron123',
            enableIngress = true,
            ingressClass = 'alb',
            storageClass = 'gp2',
            enableMonitoring = true,
        } = config;

        // Create Devtron namespace
        this.cluster.cluster.addManifest('DevtronNamespace', {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: {
                name: this.devtronNamespace,
                labels: {
                    'app.kubernetes.io/name': 'devtron',
                    'app.kubernetes.io/managed-by': 'cdk',
                },
            },
        });

        // Create service account for Devtron with necessary permissions
        this.devtronServiceAccount = this.cluster.addServiceAccountWithIRSA('DevtronServiceAccount', {
            name: 'devtron',
            namespace: this.devtronNamespace,
            policyStatements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'ecr:GetAuthorizationToken',
                        'ecr:BatchCheckLayerAvailability',
                        'ecr:GetDownloadUrlForLayer',
                        'ecr:BatchGetImage',
                        'ecr:DescribeRepositories',
                        'ecr:ListImages',
                        'ecr:DescribeImages',
                    ],
                    resources: ['*'],
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        's3:GetObject',
                        's3:PutObject',
                        's3:DeleteObject',
                        's3:ListBucket',
                    ],
                    resources: ['*'],
                }),
            ],
        });

        // Install Devtron using Helm chart
        this.devtronHelmChart = this.cluster.addHelmChart('DevtronPlatform', {
            chart: 'devtron-operator',
            repository: 'https://helm.devtron.ai',
            namespace: this.devtronNamespace,
            values: {
                installer: {
                    modules: ['cicd', 'security', 'notifier', 'monitoring'],
                    release: 'v0.7.0',
                },
                configs: {
                    POSTGRESQL_PASSWORD: 'change-me',
                    GRAFANA_PASSWORD: 'change-me',
                    ADMIN_PASSWORD: adminPassword,
                },
                components: {
                    devtron: {
                        service: {
                            type: enableIngress ? 'ClusterIP' : 'LoadBalancer',
                        },
                    },
                    postgresql: {
                        persistence: {
                            storageClass: storageClass,
                            size: '20Gi',
                        },
                    },
                    minio: {
                        persistence: {
                            storageClass: storageClass,
                            size: '50Gi',
                        },
                    },
                },
                monitoring: {
                    grafana: {
                        enabled: enableMonitoring,
                        persistence: {
                            storageClass: storageClass,
                            size: '5Gi',
                        },
                    },
                    prometheus: {
                        enabled: enableMonitoring,
                        persistence: {
                            storageClass: storageClass,
                            size: '20Gi',
                        },
                    },
                },
            },
        });

        // Create ingress for Devtron if enabled
        if (enableIngress) {
            this.createDevtronIngress(ingressClass);
        }

        // Create admin user secret
        this.cluster.cluster.addManifest('DevtronAdminSecret', {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
                name: 'devtron-admin-secret',
                namespace: this.devtronNamespace,
            },
            type: 'Opaque',
            stringData: {
                email: adminEmail,
                password: adminPassword,
            },
        });

        // Create monitoring configuration if enabled
        if (enableMonitoring) {
            this.setupDevtronMonitoring();
        }
    }

    /**
     * Create ALB ingress for Devtron dashboard
     */
    private createDevtronIngress(ingressClass: string): void {
        this.cluster.cluster.addManifest('DevtronIngress', {
            apiVersion: 'networking.k8s.io/v1',
            kind: 'Ingress',
            metadata: {
                name: 'devtron-ingress',
                namespace: this.devtronNamespace,
                annotations: {
                    'kubernetes.io/ingress.class': ingressClass,
                    'alb.ingress.kubernetes.io/scheme': 'internet-facing',
                    'alb.ingress.kubernetes.io/target-type': 'ip',
                    'alb.ingress.kubernetes.io/listen-ports': '[{"HTTP": 80}, {"HTTPS": 443}]',
                    'alb.ingress.kubernetes.io/ssl-redirect': '443',
                    'alb.ingress.kubernetes.io/healthcheck-path': '/health',
                    'alb.ingress.kubernetes.io/healthcheck-interval-seconds': '30',
                    'alb.ingress.kubernetes.io/healthcheck-timeout-seconds': '5',
                    'alb.ingress.kubernetes.io/healthy-threshold-count': '2',
                    'alb.ingress.kubernetes.io/unhealthy-threshold-count': '3',
                },
            },
            spec: {
                rules: [
                    {
                        http: {
                            paths: [
                                {
                                    path: '/',
                                    pathType: 'Prefix',
                                    backend: {
                                        service: {
                                            name: 'devtron-service',
                                            port: {
                                                number: 80,
                                            },
                                        },
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        });
    }

    /**
     * Setup monitoring and observability for Devtron
     */
    private setupDevtronMonitoring(): void {
        // Create ServiceMonitor for Prometheus scraping
        this.cluster.cluster.addManifest('DevtronServiceMonitor', {
            apiVersion: 'monitoring.coreos.com/v1',
            kind: 'ServiceMonitor',
            metadata: {
                name: 'devtron-metrics',
                namespace: this.devtronNamespace,
                labels: {
                    app: 'devtron',
                    'app.kubernetes.io/name': 'devtron',
                },
            },
            spec: {
                selector: {
                    matchLabels: {
                        app: 'devtron',
                    },
                },
                endpoints: [
                    {
                        port: 'http-metrics',
                        interval: '30s',
                        path: '/metrics',
                    },
                ],
            },
        });

        // Create Grafana dashboard ConfigMap
        this.cluster.cluster.addManifest('DevtronGrafanaDashboard', {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            metadata: {
                name: 'devtron-dashboard',
                namespace: this.devtronNamespace,
                labels: {
                    grafana_dashboard: '1',
                },
            },
            data: {
                'devtron-dashboard.json': JSON.stringify({
                    dashboard: {
                        id: null,
                        title: 'Devtron Platform Metrics',
                        tags: ['devtron', 'kubernetes'],
                        timezone: 'browser',
                        panels: [
                            {
                                title: 'Application Deployments',
                                type: 'stat',
                                targets: [
                                    {
                                        expr: 'sum(devtron_app_deployments_total)',
                                        legendFormat: 'Total Deployments',
                                    },
                                ],
                            },
                            {
                                title: 'Pipeline Success Rate',
                                type: 'stat',
                                targets: [
                                    {
                                        expr: 'rate(devtron_pipeline_success_total[5m]) / rate(devtron_pipeline_total[5m]) * 100',
                                        legendFormat: 'Success Rate %',
                                    },
                                ],
                            },
                        ],
                        time: {
                            from: 'now-1h',
                            to: 'now',
                        },
                        refresh: '30s',
                    },
                }),
            },
        });
    }

    /**
     * Get Devtron access information
     */
    public getDevtronAccessInfo(): {
        dashboardUrl?: string;
        adminCredentials: {
            email: string;
            password: string;
        };
        kubectlCommands: string[];
    } {
        return {
            adminCredentials: {
                email: 'admin@devtron.ai',
                password: 'devtron123',
            },
            kubectlCommands: [
                `aws eks update-kubeconfig --region ${this.cluster.cluster.stack.region} --name ${this.cluster.cluster.clusterName}`,
                `kubectl get pods -n ${this.devtronNamespace}`,
                `kubectl get svc -n ${this.devtronNamespace}`,
                `kubectl logs -f deployment/devtron -n ${this.devtronNamespace}`,
            ],
        };
    }

    /**
     * Create CloudFormation outputs for easy access
     */
    private createOutputs(): void {
        new CfnOutput(this, 'DevtronClusterName', {
            value: this.cluster.cluster.clusterName,
            description: 'EKS Cluster Name for Devtron',
        });

        new CfnOutput(this, 'DevtronNamespace', {
            value: this.devtronNamespace,
            description: 'Kubernetes namespace where Devtron is installed',
        });

        new CfnOutput(this, 'DevtronKubectlCommand', {
            value: `aws eks update-kubeconfig --region ${this.cluster.cluster.stack.region} --name ${this.cluster.cluster.clusterName}`,
            description: 'Command to configure kubectl for Devtron cluster',
        });

        new CfnOutput(this, 'DevtronAccessCommands', {
            value: [
                'kubectl get pods -n devtroncd',
                'kubectl get svc -n devtroncd',
                'kubectl port-forward svc/devtron-service 8080:80 -n devtroncd',
            ].join(' && '),
            description: 'Commands to access Devtron dashboard locally',
        });

        new CfnOutput(this, 'DevtronAdminCredentials', {
            value: 'Email: admin@devtron.ai | Password: devtron123',
            description: 'Default admin credentials for Devtron (change after first login)',
        });
    }

    /**
     * Install essential add-ons using Kubernetes manifests (no kubectl required)
     */
    private installEssentialAddonsWithManifests(): void {
        // Create metrics-server deployment using Kubernetes manifest
        this.cluster.cluster.addManifest('MetricsServerDeployment', {
            apiVersion: 'apps/v1',
            kind: 'Deployment',
            metadata: {
                name: 'metrics-server',
                namespace: 'kube-system',
                labels: {
                    'k8s-app': 'metrics-server',
                },
            },
            spec: {
                selector: {
                    matchLabels: {
                        'k8s-app': 'metrics-server',
                    },
                },
                template: {
                    metadata: {
                        labels: {
                            'k8s-app': 'metrics-server',
                        },
                    },
                    spec: {
                        containers: [
                            {
                                name: 'metrics-server',
                                image: 'registry.k8s.io/metrics-server/metrics-server:v0.7.1',
                                args: [
                                    '--cert-dir=/tmp',
                                    '--secure-port=4443',
                                    '--kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname',
                                    '--kubelet-use-node-status-port',
                                    '--metric-resolution=15s',
                                ],
                                ports: [
                                    {
                                        name: 'https',
                                        containerPort: 4443,
                                        protocol: 'TCP',
                                    },
                                ],
                                readinessProbe: {
                                    httpGet: {
                                        path: '/readyz',
                                        port: 'https',
                                        scheme: 'HTTPS',
                                    },
                                    periodSeconds: 10,
                                    failureThreshold: 3,
                                    initialDelaySeconds: 20,
                                },
                                livenessProbe: {
                                    httpGet: {
                                        path: '/livez',
                                        port: 'https',
                                        scheme: 'HTTPS',
                                    },
                                    periodSeconds: 10,
                                    failureThreshold: 3,
                                    initialDelaySeconds: 20,
                                },
                                securityContext: {
                                    allowPrivilegeEscalation: false,
                                    readOnlyRootFilesystem: true,
                                    runAsNonRoot: true,
                                    runAsUser: 1000,
                                    seccompProfile: {
                                        type: 'RuntimeDefault',
                                    },
                                    capabilities: {
                                        drop: ['ALL'],
                                    },
                                },
                                volumeMounts: [
                                    {
                                        name: 'tmp-dir',
                                        mountPath: '/tmp',
                                    },
                                ],
                            },
                        ],
                        volumes: [
                            {
                                name: 'tmp-dir',
                                emptyDir: {},
                            },
                        ],
                        priorityClassName: 'system-cluster-critical',
                        serviceAccountName: 'metrics-server',
                        nodeSelector: {
                            'kubernetes.io/os': 'linux',
                        },
                    },
                },
            },
        });

        // Create metrics-server service
        this.cluster.cluster.addManifest('MetricsServerService', {
            apiVersion: 'v1',
            kind: 'Service',
            metadata: {
                name: 'metrics-server',
                namespace: 'kube-system',
                labels: {
                    'k8s-app': 'metrics-server',
                },
            },
            spec: {
                selector: {
                    'k8s-app': 'metrics-server',
                },
                ports: [
                    {
                        name: 'https',
                        port: 443,
                        protocol: 'TCP',
                        targetPort: 'https',
                    },
                ],
            },
        });

        // Create metrics-server service account
        this.cluster.cluster.addManifest('MetricsServerServiceAccount', {
            apiVersion: 'v1',
            kind: 'ServiceAccount',
            metadata: {
                name: 'metrics-server',
                namespace: 'kube-system',
                labels: {
                    'k8s-app': 'metrics-server',
                },
            },
        });

        // Create metrics-server cluster role
        this.cluster.cluster.addManifest('MetricsServerClusterRole', {
            apiVersion: 'rbac.authorization.k8s.io/v1',
            kind: 'ClusterRole',
            metadata: {
                name: 'system:metrics-server',
                labels: {
                    'k8s-app': 'metrics-server',
                },
            },
            rules: [
                {
                    apiGroups: [''],
                    resources: ['nodes/metrics'],
                    verbs: ['get'],
                },
                {
                    apiGroups: [''],
                    resources: ['pods', 'nodes'],
                    verbs: ['get', 'list', 'watch'],
                },
            ],
        });

        // Create metrics-server cluster role binding
        this.cluster.cluster.addManifest('MetricsServerClusterRoleBinding', {
            apiVersion: 'rbac.authorization.k8s.io/v1',
            kind: 'ClusterRoleBinding',
            metadata: {
                name: 'system:metrics-server',
                labels: {
                    'k8s-app': 'metrics-server',
                },
            },
            roleRef: {
                apiGroup: 'rbac.authorization.k8s.io',
                kind: 'ClusterRole',
                name: 'system:metrics-server',
            },
            subjects: [
                {
                    kind: 'ServiceAccount',
                    name: 'metrics-server',
                    namespace: 'kube-system',
                },
            ],
        });
    }
}