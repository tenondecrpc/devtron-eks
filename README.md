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

## Quick Start Summary

1. **Install prerequisites** (Node.js, AWS CLI, CDK CLI)
2. **Configure authentication** (SSO or access keys with `AWS_PROFILE` profile)
3. **Clone and setup project**:
   ```bash
   npm install
   npx cdk bootstrap --profile AWS_PROFILE
   npm run build
   ```
4. **Deploy EKS cluster**:
   ```bash
   npx cdk deploy --require-approval never --profile AWS_PROFILE
   ```
5. **Setup kubectl access**:
   ```bash
   ./scripts/setup.sh --quick
   ```
6. **Verify deployment**:
   ```bash
   kubectl get nodes
   ```

🎉 Your Devtron-ready EKS cluster is now deployed and accessible
