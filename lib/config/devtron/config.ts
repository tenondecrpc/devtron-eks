import * as fs from 'fs';
import * as path from 'path';

/**
 * Devtron Helm Chart Configuration
 * Centralized configuration for Devtron installation with CI/CD and GitOps
 *
 * Based on official Devtron documentation:
 * https://docs.devtron.ai/install/install-devtron-with-cicd-with-gitops
 *
 * Installation command equivalent:
 * helm install devtron devtron/devtron-operator \
 * --create-namespace --namespace devtroncd \
 * --set installer.modules={cicd} \
 * --set argo-cd.enabled=true
 */
export interface DevtronHelmValues {
  installer: {
    release: string;
    modules: string; // Changed from string[] to string to match Helm --set syntax
    adminEmail?: string;
    adminPassword?: string;
  };
  // ArgoCD configuration at root level to match Helm --set argo-cd.enabled=true
  'argo-cd': {
    enabled: boolean;
  };
  components: {
    dashboard: { enabled: boolean };
    devtron: { enabled: boolean };
    argocd: { enabled: boolean };
  };
  postgresql: {
    enabled: boolean;
    auth: {
      enablePostgresUser: boolean;
      username: string;
      password: string;
      database: string;
    };
    architecture: string;
    primary: {
      initdb: {
        scripts: {
          'init.sql': string;
        };
      };
    };
    persistence: { enabled: boolean };
    resources: {
      requests: { memory: string; cpu: string };
      limits: { memory: string; cpu: string };
    };
  };
  prometheus: {
    persistence: { enabled: boolean };
    resources: {
      requests: { memory: string; cpu: string };
      limits: { memory: string; cpu: string };
    };
  };
  minio: {
    enabled: boolean;
    persistence: { enabled: boolean };
    resources: {
      requests: { memory: string; cpu: string };
      limits: { memory: string; cpu: string };
    };
  };
  service: {
    type: string;
    annotations: { [key: string]: string };
  };
  monitoring: {
    enabled: boolean;
    prometheus: { enabled: boolean };
    grafana: { enabled: boolean };
  };
  global: {
    storageClass: string;
    postgresql: {
      auth: {
        postgresPassword: string;
        username: string;
        password: string;
        database: string;
      };
    };
  };
}

/**
 * Default Devtron configuration optimized for EKS
 * Prevents resource orphan issues and ensures reliable installation
 *
 * Key optimizations:
 * - MinIO enabled by default for CI/CD blob storage
 * - PostgreSQL and Prometheus persistence disabled to prevent EBS orphan resources
 * - Resource limits configured to prevent resource exhaustion
 * - LoadBalancer service with AWS-specific annotations for reliability
 * - ArgoCD enabled for GitOps functionality
 */
export const DEFAULT_DEVTRON_CONFIG: DevtronHelmValues = {
  installer: {
    release: 'devtron',
    modules: '{cicd}' // Updated to match Helm --set installer.modules={cicd}
  },
  // ArgoCD enabled for GitOps functionality
  'argo-cd': {
    enabled: true // Matches Helm --set argo-cd.enabled=true
  },
  components: {
    dashboard: { enabled: true },
    devtron: { enabled: true },
    argocd: { enabled: true }
  },
  // PostgreSQL with resource limits to prevent resource exhaustion
  postgresql: {
    enabled: true,
    auth: {
      enablePostgresUser: true,
      username: 'postgres',
      password: 'devtron',
      database: 'orchestrator'
    },
    architecture: 'standalone',
    primary: {
      initdb: {
        scripts: {
          'init.sql': `
CREATE DATABASE IF NOT EXISTS casbin;
CREATE DATABASE IF NOT EXISTS git_sensor;
CREATE DATABASE IF NOT EXISTS lens;`
        }
      }
    },
    persistence: { enabled: false }, // Prevent EBS orphan resources
    resources: {
      requests: { memory: '256Mi', cpu: '250m' },
      limits: { memory: '512Mi', cpu: '500m' }
    }
  },
  // Prometheus with resource limits
  prometheus: {
    persistence: { enabled: false }, // Prevent EBS orphan resources
    resources: {
      requests: { memory: '256Mi', cpu: '250m' },
      limits: { memory: '512Mi', cpu: '500m' }
    }
  },
  // MinIO enabled by default for CI/CD blob storage (build logs, cache, artifacts)
  // Note: Only MinIO and S3 are supported for blob storage
  // Required for full CI/CD functionality as per Devtron documentation
  minio: {
    enabled: true, // Required for full CI/CD functionality
    persistence: { enabled: false }, // Prevent EBS orphan resources
    resources: {
      requests: { memory: '256Mi', cpu: '250m' },
      limits: { memory: '512Mi', cpu: '500m' }
    }
  },
  // Enhanced LoadBalancer configuration for AWS reliability
  // Matches the LoadBalancer setup described in Devtron documentation
  service: {
    type: 'LoadBalancer',
    annotations: {
      'service.beta.kubernetes.io/aws-load-balancer-type': 'external',
      'service.beta.kubernetes.io/aws-load-balancer-nlb-target-type': 'ip',
      'service.beta.kubernetes.io/aws-load-balancer-scheme': 'internet-facing',
      // Additional annotations to prevent LoadBalancer issues
      'service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled': 'true',
      'service.beta.kubernetes.io/aws-load-balancer-healthcheck-healthy-threshold': '2',
      'service.beta.kubernetes.io/aws-load-balancer-healthcheck-unhealthy-threshold': '2',
      'service.beta.kubernetes.io/aws-load-balancer-healthcheck-interval': '10',
      'service.beta.kubernetes.io/aws-load-balancer-healthcheck-timeout': '5'
    }
  },
  // Enable monitoring by default
  monitoring: {
    enabled: true,
    prometheus: { enabled: true },
    grafana: { enabled: true }
  },
  // Global configuration
  global: {
    storageClass: 'gp2',
    postgresql: {
      auth: {
        postgresPassword: 'devtron',
        username: 'postgres',
        password: 'devtron',
        database: 'orchestrator'
      }
    }
  }
};

/**
 * Load Devtron configuration from YAML file
 * Falls back to default configuration if file doesn't exist
 */
export function loadDevtronConfig(customConfigPath?: string): DevtronHelmValues {
  const configPath = customConfigPath || path.join(__dirname, 'devtron-values.yaml');

  try {
    if (fs.existsSync(configPath)) {
      // For now, return default config since YAML parsing would require additional dependencies
      // In a production environment, you might want to add yaml parsing
      console.log(`Found custom Devtron config at: ${configPath}`);
      console.log('Using default optimized configuration for EKS');
    }
  } catch (error) {
    console.warn('Could not load custom Devtron config, using defaults:', error);
  }

  return DEFAULT_DEVTRON_CONFIG;
}

/**
 * Get the path to the Devtron values file
 */
export function getDevtronValuesPath(): string {
  return path.join(__dirname, 'devtron-values.yaml');
}
