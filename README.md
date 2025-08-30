# Devtron EKS CDK Project

This is a CDK project for deploying EKS infrastructure optimized for Devtron platform using TypeScript. The project supports both AWS SSO authentication and traditional AWS access keys.

## Prerequisites

Before deploying, ensure you have the following installed:

- **Node.js** (version 18 or later)
- **npm** or **yarn**
- **AWS CLI** (version 2 recommended)
- **AWS CDK CLI**

### Installation Instructions by OS

#### Windows
```powershell
# Install Node.js from https://nodejs.org or using Chocolatey
choco install nodejs

# Install AWS CLI
winget install Amazon.AWSCLI

# Install CDK CLI globally
npm install -g aws-cdk
```

#### macOS
```bash
# Install Node.js using Homebrew
brew install node

# Install AWS CLI
brew install awscli

# Install CDK CLI globally
npm install -g aws-cdk
```

#### Linux (Ubuntu/Debian)
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install CDK CLI globally
npm install -g aws-cdk
```

## AWS Authentication Configuration

Choose your preferred authentication method:

### Option A: AWS SSO (Recommended for Organizations)

This project is optimized for AWS SSO authentication with the `AWS_PROFILE` profile.

#### Step 1: Configure SSO Profile
```bash
aws configure sso --profile $AWS_PROFILE
```

You'll be prompted for:
- **SSO session name**: `aws-session` (or your preferred name)
- **SSO start URL**: Your organization's SSO URL
- **SSO region**: `us-east-1` (or your SSO region)
- **SSO registration scopes**: `sso:account:access`

#### Step 2: Select Account and Role
After running the command above, you'll:
1. Be redirected to a browser to authenticate
2. Select your AWS account
3. Choose the `AdministratorAccess` role
4. Set default region: `us-east-1`
5. Set default output format: `json`

#### Step 3: Login to SSO
```bash
aws sso login --profile $AWS_PROFILE
```

#### Step 4: Verify SSO Configuration
```bash
# Check your identity
aws sts get-caller-identity --profile $AWS_PROFILE

# Test EKS access
aws eks list-clusters --region us-east-1 --profile $AWS_PROFILE
```

### Option B: Traditional AWS Access Keys

If you prefer using traditional AWS access keys or don't have SSO access:

#### Method 1: AWS CLI Configuration
```bash
aws configure --profile $AWS_PROFILE
```
Enter your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `us-east-1`
- Default output format: `json`

#### Method 2: Environment Variables
```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=us-east-1
export AWS_PROFILE=your-profile-name
```

#### Method 3: Direct Profile Configuration
```bash
# Configure the AWS_PROFILE directly
aws configure set aws_access_key_id YOUR_ACCESS_KEY --profile $AWS_PROFILE
aws configure set aws_secret_access_key YOUR_SECRET_KEY --profile $AWS_PROFILE
aws configure set region us-east-1 --profile $AWS_PROFILE
aws configure set output json --profile $AWS_PROFILE
```

#### Verify Traditional Configuration
```bash
# Check your identity
aws sts get-caller-identity --profile $AWS_PROFILE

# List available profiles
aws configure list-profiles
```

### SSO Session Management (SSO Users Only)

```bash
# Login when session expires
aws sso login --profile $AWS_PROFILE

# Check session status
aws sts get-caller-identity --profile $AWS_PROFILE

# Logout (optional)
aws sso logout --profile $AWS_PROFILE
```

## Devtron Installation Options

This CDK project supports two methods for installing Devtron:

### 🔧 Option 1: Traditional Script Installation

**Legacy Method**: CDK prepares configuration, then use scripts for installation.

#### How it works:
```typescript
// Default behavior - Direct Installation (recommended)
const eksFactory = new EksFactory(this, "EksFactory", {
  params
  // installDevtronDirectly defaults to true
  // CDK will wait for complete Devtron installation
});
```

#### Deployment Process:
```bash
# 1. Deploy infrastructure
npx cdk deploy --profile AWS_PROFILE

# 2. Run Devtron manager script
./scripts/devtron-manager.sh

# 3. Select option 1: "Complete Auto-Installation"
```

### 🎯 Option 2: Direct CDK Installation (Default & Recommended)

**Default Method**: Install Devtron directly as part of the CDK deployment process.

#### Benefits:
- ✅ **Single Command Deployment**: EKS cluster + Devtron installed together
- ✅ **Infrastructure as Code**: Everything managed by CDK
- ✅ **Automatic Dependencies**: Namespace and configurations created automatically
- ✅ **Version Controlled**: Devtron version pinned in CDK code
- ✅ **No Manual Steps**: No additional scripts needed

#### How it works (Default):
```typescript
// In lib/stack/main-stack.ts
const eksFactory = new EksFactory(this, "EksFactory", {
  params
  // installDevtronDirectly defaults to true - no need to specify!
});
```

#### Deployment:
```bash
# Single command deploys EKS + Devtron
npx cdk deploy --profile AWS_PROFILE
```

### 🔧 Option 2: Traditional Script Installation

**Legacy Method**: CDK prepares configuration, then use scripts for installation.

#### Benefits:
- ✅ **Flexible**: Can modify configuration before installation
- ✅ **Debugging**: Step-by-step installation process
- ✅ **Backup Option**: If direct installation fails

#### How to Use:
```typescript
// In lib/stack/main-stack.ts
const eksFactory = new EksFactory(this, "EksFactory", {
  params,
  installDevtronDirectly: false  // Use traditional approach
});
```

#### Deployment Process:
```bash
# 1. Deploy infrastructure
npx cdk deploy --profile AWS_PROFILE

# 2. Run Devtron manager script
./scripts/devtron-manager.sh

# 3. Select option 1: "Complete Auto-Installation"
```

### 📊 Configuration Comparison

| Feature | Script Installation | Direct CDK Installation (Default) |
|---------|----------------------|----------------------------------|
| **Default Behavior** | ❌ Must be disabled | ✅ Yes |
| **Deployment Steps** | 2-3 commands | 1 command |
| **Installation Wait** | ❌ Manual verification | ✅ CDK waits for completion |
| **Devtron Version** | Dynamic from Helm repo | Fixed in CDK code (v0.6.0) |
| **Configuration** | User-modifiable before install | CDK-managed with defaults |
| **LoadBalancer** | ✅ Configurable | ✅ Automatic |
| **Monitoring** | ✅ Optional | ✅ Enabled by default |
| **Storage Class** | ✅ Configurable | ✅ GP2 optimized |
| **Persistence** | ✅ Requires EBS volumes | ✅ Uses local storage (emptyDir) |
| **Blob Storage** | ❌ Manual configuration | ✅ MinIO enabled by default (S3 optional) |
| **CI/CD Ready** | ⚠️ Requires additional setup | ✅ Full CI/CD functionality |
| **Debugging** | Multiple log sources | CDK logs only |
| **Rollback** | Manual cleanup | CDK rollback |
| **Recommended For** | Development, testing, debugging | Production, CI/CD, new projects |

### ⚙️ Devtron Configuration Structure

The project uses a centralized configuration system:

```
lib/config/devtron/
├── config.ts          # TypeScript configuration with defaults
├── devtron-values.yaml # YAML configuration file
└── README.md         # Configuration documentation

examples/legacy-script-installation/
├── outputs.json      # Example CDK outputs (no longer required)
└── README.md        # Legacy method documentation
```

#### Configuration Defaults

```typescript
// From lib/config/devtron/config.ts
devtronConfig = {
  useLoadBalancer: true,      // LoadBalancer access by default
  enableIngress: false,       // Ingress disabled by default
  enableMonitoring: true,     // Monitoring enabled by default
  storageClass: 'gp2',        // GP2 storage class (available in EKS)
  // Blob storage (required for CI/CD functionality)
  enableMinIO: true,          // MinIO enabled by default
  blobStorageProvider: 'minio' // MinIO for development, S3 for production
}
```

#### Customizing Configuration:
```typescript
const eksFactory = new EksFactory(this, "EksFactory", {
  params,
  // installDevtronDirectly: true, // This is the default, no need to specify
  devtronConfig: {
    // Access Configuration
    useLoadBalancer: true,      // Use LoadBalancer service
    enableIngress: false,       // Disable Ingress (conflicts with LB)
    domain: 'devtron.example.com', // Domain for Ingress (if enabled)

    // Storage Configuration
    storageClass: 'gp2',        // AWS GP2 storage class

    // Blob Storage Configuration (required for full CI/CD functionality)
    enableMinIO: true,          // MinIO enabled by default for blob storage
    blobStorageProvider: 'minio', // Options: 'minio', 's3'

    // AWS S3 Configuration (if using S3 for production)
    // s3Bucket: 'my-devtron-bucket',
    // s3Region: 'us-east-1',

    // Monitoring & Observability
    enableMonitoring: true,     // Enable Prometheus + Grafana

    // Admin Configuration
    adminEmail: 'admin@example.com',
    adminPassword: 'secure-password',

    // Advanced Configuration
    ingressClass: 'nginx'       // Ingress controller class
  }
});
```

### 🎛️ Advanced Configuration Options

#### Disabling Devtron Installation:
```typescript
const eksFactory = new EksFactory(this, "EksFactory", {
  params,
  enableDevtron: false  // Deploy EKS only, no Devtron
});
```

#### Using Ingress Instead of LoadBalancer:
```typescript
const eksFactory = new EksFactory(this, "EksFactory", {
  params,
  // installDevtronDirectly: true, // This is the default
  devtronConfig: {
    useLoadBalancer: false,
    enableIngress: true,
    domain: 'devtron.example.com',
    ingressClass: 'nginx'
  }
});
```

#### Production Configuration Example:
```typescript
const eksFactory = new EksFactory(this, "EksFactory", {
  params,
  // installDevtronDirectly: true, // This is the default
  devtronConfig: {
    useLoadBalancer: true,
    enableMonitoring: true,
    storageClass: 'gp2',
    // Production blob storage configuration
    blobStorageProvider: 's3',
    s3Bucket: 'my-company-devtron-bucket',
    s3Region: 'us-east-1',
    adminEmail: 'admin@company.com',
    adminPassword: process.env.DEVTRON_ADMIN_PASSWORD
  }
});
```

### 💾 Blob Storage Configuration

Devtron requiere configuración de blob storage para una funcionalidad completa de CI/CD. Sin blob storage configurado:

- ❌ No se pueden acceder a los logs de build y deployment después de 1 hora
- ❌ Los tiempos de build son más lentos (sin cache disponible)
- ❌ No se pueden generar reportes de artifacts en etapas pre/post build

#### MinIO (Por Defecto - Recomendado para Desarrollo)
```typescript
devtronConfig: {
  blobStorageProvider: 'minio', // Default
  enableMinIO: true             // Enabled by default
}
```

#### AWS S3 (Recomendado para Producción)
```typescript
devtronConfig: {
  blobStorageProvider: 's3',
  s3Bucket: 'my-devtron-bucket',
  s3Region: 'us-east-1'
  // Credentials configured via IAM roles or secrets
}
```

**Nota**: Para S3, asegúrate de configurar las credenciales apropiadas via IAM roles, secrets de Kubernetes, o variables de entorno. MinIO no requiere configuración adicional de credenciales.

#### Ejemplos de Configuración Rápida

**Para Desarrollo (MinIO por defecto):**
```typescript
// No necesitas configurar nada - MinIO está habilitado por defecto
const eksFactory = new EksFactory(this, "EksFactory", {
  params
});
```

**Para Producción (S3):**
```typescript
const eksFactory = new EksFactory(this, "EksFactory", {
  params,
  devtronConfig: {
    blobStorageProvider: 's3',
    s3Bucket: 'my-company-devtron-bucket',
    s3Region: 'us-east-1'
  }
});
```

## Deployment Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Bootstrap CDK (First-time setup)

Bootstrap CDK with your configured profile:

```bash
# Bootstrap with AWS_PROFILE (works for both SSO and access keys)
npx cdk bootstrap --profile $AWS_PROFILE

# Verify bootstrap
aws cloudformation describe-stacks --stack-name CDKToolkit --profile $AWS_PROFILE
```

**Note**: Bootstrap is required only once per account/region combination.

### 3. Build the Project
```bash
npm run build
```

### 4. Deploy the EKS Stack

Deploy using your configured authentication method:

#### Standard Deployment
```bash
# Deploy with AWS_PROFILE profile (works for both SSO and access keys)
npx cdk deploy --profile AWS_PROFILE

# Deploy without approval prompts (faster)
npx cdk deploy --require-approval never --profile AWS_PROFILE
```

#### Verify Deployment
```bash
# Check stack status
aws cloudformation describe-stacks --stack-name DevtronDevStack --profile AWS_PROFILE

# List EKS clusters
aws eks list-clusters --region us-east-1 --profile AWS_PROFILE
```

#### Troubleshooting Deployment

**For SSO Users:**
```bash
# If you get authentication errors, refresh your SSO session
aws sso login --profile AWS_PROFILE
```

**For Access Key Users:**
```bash
# Verify your credentials are valid
aws sts get-caller-identity --profile AWS_PROFILE
```

## EKS Cluster Access Setup

After successful deployment, use our centralized setup script to configure everything:

### Option 1: Interactive Setup (Recommended)
```bash
# Run the all-in-one setup script
./scripts/setup.sh
```

This interactive script will guide you through:
- AWS profile configuration (SSO or access keys)
- kubectl setup and validation
- Connection testing
- Useful commands reference

### Option 2: Quick Non-Interactive Setup
```bash
# Quick kubectl setup (requires AWS already configured)
./scripts/setup.sh --quick

# Complete setup with validations
./scripts/setup.sh --full

# Configure AWS profile only
./scripts/setup.sh --aws-only

# Configure kubectl only
./scripts/setup.sh --kubectl-only

# Show current configuration status
./scripts/setup.sh --status
```

### Option 3: Manual Setup
```bash
# Configure kubectl manually
aws eks update-kubeconfig --region us-east-1 --name devtron-dev-cluster --profile $AWS_PROFILE

# Test connection
kubectl get nodes
```

## Environment Variables

Copy `.env.example` to `.env` and configure your environment-specific values:

```bash
cp .env.example .env
```

Edit `.env` with your specific configuration values.

## Useful Commands

### Development
* `npm run build` - Compile TypeScript to JavaScript
* `npm run watch` - Watch for changes and compile automatically
* `npm run test` - Run Jest unit tests

### CDK Commands (with Profile)
* `npx cdk synth --profile AWS_PROFILE` - Generate CloudFormation template
* `npx cdk diff --profile AWS_PROFILE` - Compare deployed stack with current state
* `npx cdk deploy --profile AWS_PROFILE` - Deploy stack to AWS
* `npx cdk destroy --profile AWS_PROFILE` - Delete the stack from AWS
* `npx cdk ls --profile AWS_PROFILE` - List all stacks in the app
* `npx cdk docs` - Open CDK documentation

### EKS & kubectl Commands
* `kubectl get nodes` - List cluster nodes
* `kubectl get pods --all-namespaces` - List all pods
* `kubectl cluster-info` - Show cluster information
* `aws eks list-addons --cluster-name CLUSTER_NAME --profile AWS_PROFILE` - List EKS add-ons

### Troubleshooting

#### General Issues
* `npx cdk doctor` - Check for common configuration issues
* `aws sts get-caller-identity --profile AWS_PROFILE` - Verify AWS credentials
* `npx cdk context --clear` - Clear CDK context cache
* `kubectl config current-context` - Check current kubectl context

#### SSO-Specific Issues
* `aws sso login --profile AWS_PROFILE` - Refresh SSO session if expired
* `aws configure list-profiles` - List all configured profiles
* `aws sso logout --profile AWS_PROFILE` - Logout and re-authenticate

#### Access Key Issues
* `aws configure list --profile AWS_PROFILE` - Check profile configuration
* `aws configure set region us-east-1 --profile AWS_PROFILE` - Set correct region
* Check that your access keys have sufficient permissions for EKS operations

## Multi-Environment Deployment

For deploying to multiple environments (dev, staging, prod):

```bash
# Deploy to development
npx cdk deploy --context environment=dev --profile AWS_PROFILE

# Deploy to staging  
npx cdk deploy --context environment=staging --profile AWS_PROFILE

# Deploy to production
npx cdk deploy --context environment=prod --profile AWS_PROFILE
```

## Authentication Method Comparison

| Feature | AWS SSO | Access Keys |
|---------|---------|-------------|
| **Security** | ✅ Higher (temporary credentials) | ⚠️ Lower (long-lived keys) |
| **Setup Complexity** | ⚠️ More complex initial setup | ✅ Simple |
| **Session Management** | ⚠️ Requires periodic re-login | ✅ Always active |
| **Enterprise Ready** | ✅ Yes (centralized management) | ❌ Individual key management |
| **Recommended For** | Organizations with SSO | Individual developers, testing |

**Recommendation**: Use AWS SSO for production and team environments, access keys for quick testing or individual development.

## Troubleshooting Resources

### 🔧 Common Issues and Solutions

#### Resources Orphan Issues Fixed ✅
- **Problem**: PersistentVolumeClaims (PVCs) and PersistentVolumes (PVs) left behind after failed installations
- **Solution**: Disabled persistence for PostgreSQL, Prometheus, and MinIO by default
- **Impact**: Prevents EBS volume orphaning, faster installations, more reliable deployments

#### LoadBalancer Provisioning Issues Fixed ✅
- **Problem**: LoadBalancer services stuck in "pending" state
- **Solution**: Enhanced LoadBalancer annotations for better AWS integration
- **Impact**: Faster LoadBalancer provisioning, improved reliability

#### Installation Timeouts Fixed ✅
- **Problem**: Installations timing out due to resource contention
- **Solution**: Added resource limits and improved timeout handling
- **Impact**: More predictable installation times, better resource management

### 🚨 If You Still Have Issues

#### Quick Diagnosis Commands:
```bash
# Check cluster resources
kubectl get nodes
kubectl describe nodes

# Check Devtron status
kubectl get all -n devtroncd
kubectl get pvc -n devtroncd
kubectl get pv | grep devtroncd

# Check for orphaned resources
kubectl get pvc --all-namespaces | grep -v Bound
kubectl get pv | grep -v Bound
```

#### Emergency Cleanup:
```bash
# Force cleanup all Devtron resources
./scripts/devtron-manager.sh
# Select: 4 (Troubleshoot) → 4 (Force Cleanup)
```

### 📋 Verification Checklist

After installation, verify:
- [ ] All pods are Running: `kubectl get pods -n devtroncd`
- [ ] LoadBalancer is provisioned: `kubectl get svc -n devtroncd`
- [ ] No orphaned PVCs: `kubectl get pvc -n devtroncd`
- [ ] No orphaned PVs: `kubectl get pv | grep devtroncd`

## Quick Start Summary

### 🏁 Default Installation (Direct CDK)

1. **Install prerequisites** (Node.js, AWS CLI, CDK CLI)
2. **Configure authentication** (SSO or access keys with `AWS_PROFILE` profile)
3. **Clone and setup project**:
   ```bash
   npm install
   npx cdk bootstrap --profile AWS_PROFILE
   npm run build
   ```
4. **Deploy EKS + Devtron** (single command - CDK waits for completion):
   ```bash
   npx cdk deploy --require-approval never --profile AWS_PROFILE
   # CDK will install EKS cluster and wait for complete Devtron installation
   ```
5. **Setup kubectl access**:
   ```bash
   ./scripts/setup.sh --quick
   ```
6. **Access Devtron immediately**:
   ```bash
   kubectl get nodes
   kubectl get pods -n devtroncd  # All Devtron components should be ready
   # Get Devtron URL and credentials from CDK outputs
   ```

🎉 **Your Devtron platform is deployed and ready to use!**

### 🚀 Alternative: Script-Based Installation

For advanced use cases requiring custom Devtron configuration before installation:

1. **Enable script installation** in `lib/stack/main-stack.ts`:
   ```typescript
   const eksFactory = new EksFactory(this, "EksFactory", {
     params,
     installDevtronDirectly: false  // Use legacy script method
   });
   ```

2. **Deploy infrastructure only**:
   ```bash
   npx cdk deploy --require-approval never --profile AWS_PROFILE
   ```

3. **Run Devtron installation script**:
   ```bash
   ./scripts/devtron-manager.sh
   # Select option 1: "Complete Auto-Installation"
   ```

4. **Verify deployment**:
   ```bash
   kubectl get nodes
   kubectl get pods -n devtroncd  # Check Devtron pods
   ```

### 📋 Post-Deployment Access

**Get Devtron access information:**
```bash
# Check LoadBalancer URL
kubectl get svc -n devtroncd

# Port forward for local access
kubectl port-forward svc/devtron-service -n devtroncd 32000:80

# Access Devtron at: http://localhost:32000
```

**Default Devtron Credentials:**
- **Username**: `admin` (first login)
- **Password**: Generated during installation (check CDK outputs)

### 🔍 Troubleshooting

**Check Devtron installation status:**
```bash
# View Devtron pods
kubectl get pods -n devtroncd

# Check Devtron logs
kubectl logs -f deployment/devtron -n devtroncd

# Verify LoadBalancer
kubectl get svc -n devtroncd | grep LoadBalancer
```

**Common Issues:**
- **Pods not starting**: Check node resources and storage
- **LoadBalancer pending**: Wait for AWS to provision ELB (~5-10 minutes)
- **Access denied**: Verify security groups and IAM permissions

### 📊 CDK Output Reference

**Direct Installation Outputs:**
```
DevtronInstallationStatus: "Devtron Installed by CDK"
DevtronHelmRelease: "devtron"
DevtronLoadBalancerCommand: kubectl get svc -n devtroncd | grep devtron
DevtronUrl: http://[LOADBALANCER-URL]:80
DevtronStatusCommand: kubectl get all -n devtroncd
DevtronLogsCommand: kubectl logs -f deployment/devtron -n devtroncd
```

**Traditional Installation Outputs:**
```
DevtronInstallationStatus: "Configuration Prepared by CDK"
DevtronHelmRelease: "devtron (to be installed)"
DevtronConfigFile: [JSON configuration for manual installation]
```

### 🧪 Testing the New Installation

After deployment with direct installation, verify everything is working:

#### 1. Check EKS Cluster
```bash
# Verify cluster is ready
kubectl get nodes

# Check cluster status
kubectl cluster-info
```

#### 2. Verify Devtron Installation
```bash
# Check Devtron namespace
kubectl get namespaces | grep devtroncd

# List Devtron pods
kubectl get pods -n devtroncd

# Check Devtron services
kubectl get svc -n devtroncd

# Verify Helm release
helm list -n devtroncd
```

#### 3. Test Devtron Access
```bash
# Get LoadBalancer URL
kubectl get svc -n devtroncd | grep LoadBalancer

# Port forward for local access (if needed)
kubectl port-forward svc/devtron-service -n devtroncd 32000:80

# Access Devtron at: http://localhost:32000
```

#### 4. Monitor Devtron Health
```bash
# Check pod health
kubectl get pods -n devtroncd -o wide

# View Devtron logs
kubectl logs -f deployment/devtron -n devtroncd

# Check resource usage
kubectl top pods -n devtroncd
```

### 🔧 Migration Guide

#### Migrating from Script to Direct Installation

**For existing projects wanting to migrate to the new default:**

1. **Update your main-stack.ts**:
   ```typescript
   // Remove installDevtronDirectly: true (it's now the default)
   const eksFactory = new EksFactory(this, "EksFactory", {
     params
     // installDevtronDirectly defaults to true - simplified!
   });
   ```

2. **Deploy with new configuration**:
   ```bash
   npx cdk deploy --require-approval never --profile AWS_PROFILE
   ```

3. **Enjoy simplified deployment**:
   - No need for `outputs.json`
   - No need for `./scripts/devtron-manager.sh`
   - Devtron installs automatically with CDK

#### Benefits of Migration to Direct Installation:
- ✅ **Simplified workflow**: One command deployment
- ✅ **Reduced complexity**: No manual script execution
- ✅ **Better CI/CD integration**: Pure Infrastructure as Code
- ✅ **Version control**: Devtron version tracked in CDK
- ✅ **Automatic cleanup**: CDK handles all resources
- ✅ **Faster deployment**: No waiting for manual installation steps

#### When to Use Each Method:

**Use Direct Installation (Default):**
- New projects (recommended)
- CI/CD pipelines
- Production environments
- Automated deployments
- Infrastructure as Code workflows
- Most use cases

**Use Script Installation (Legacy):**
- When you need to modify Devtron configuration before installation
- Debugging complex deployment issues
- Existing projects with established workflows
- Development environments requiring manual control

### 🎯 Quick Decision Guide

| Your Situation | Recommended Method | Configuration |
|----------------|-------------------|---------------|
| **First time using this project** | Direct Installation | Default (no changes needed) |
| **New project, want simplicity** | Direct Installation | Default (no changes needed) |
| **CI/CD Pipeline** | Direct Installation | Default (no changes needed) |
| **Production environment** | Direct Installation | Default (no changes needed) |
| **Need custom Devtron config** | Script Installation | `installDevtronDirectly: false` |
| **Debugging deployment issues** | Script Installation | `installDevtronDirectly: false` |

### 📝 Summary

**This CDK project now supports a complete Devtron installation with CI/CD and GitOps:**

1. **🎯 Direct Installation (Default)**: Modern approach with Devtron installed directly by CDK with complete waiting
2. **🔧 Script Installation (Legacy)**: Traditional approach with CDK preparing config, then manual script installation

**Key Points:**
- **Complete CI/CD Setup**: Includes CI/CD modules and ArgoCD for GitOps
- **Blob Storage Ready**: MinIO enabled by default for build logs, cache, and artifacts
- **Simplified Default**: Direct installation is now the default with CDK waiting for completion
- **One-Command Deployment**: Single `cdk deploy` installs EKS + Devtron completely
- **No Persistence Issues**: Uses local storage (emptyDir) for clean, reliable installation
- **Automatic LoadBalancer**: Devtron accessible immediately after deployment
- **Resource Optimized**: Proper resource limits to prevent cluster exhaustion
- **Backward Compatible**: Existing code continues to work unchanged
- **Production Ready**: Supports S3 blob storage for production deployments

**Ready to deploy? Just run `cdk deploy` and you'll have a complete Devtron platform with CI/CD and GitOps!** 🚀
