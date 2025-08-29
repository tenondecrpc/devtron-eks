# CDK TypeScript Project

This is a CDK project for deploying AWS infrastructure using TypeScript.

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

## AWS Configuration

### 1. Configure AWS Credentials

Choose one of the following methods:

#### Option A: AWS CLI Configuration
```bash
aws configure
```
Enter your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., `us-east-1`)
- Default output format (e.g., `json`)

#### Option B: Environment Variables
```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=us-east-1
```

#### Option C: AWS Profiles
```bash
aws configure --profile your-profile-name
```

### 2. Verify AWS Configuration
```bash
aws sts get-caller-identity
```

## Deployment Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Bootstrap CDK (First-time setup)
```bash
# Bootstrap for default account/region
npx cdk bootstrap

# Bootstrap for specific account/region
npx cdk bootstrap aws://ACCOUNT-NUMBER/REGION

# Bootstrap with specific profile
npx cdk bootstrap --profile your-profile-name
```

### 3. Build the Project
```bash
npm run build
```

### 4. Deploy the Stack

#### Deploy to Default Account/Region
```bash
npx cdk deploy
```

#### Deploy with Specific Profile
```bash
npx cdk deploy --profile your-profile-name
```

#### Deploy to Specific Region
```bash
npx cdk deploy --region us-west-2
```

#### Deploy All Stacks
```bash
npx cdk deploy --all
```

#### Deploy with Approval Skip (for CI/CD)
```bash
npx cdk deploy --require-approval never
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

### CDK Commands
* `npx cdk synth` - Generate CloudFormation template
* `npx cdk diff` - Compare deployed stack with current state
* `npx cdk deploy` - Deploy stack to AWS
* `npx cdk destroy` - Delete the stack from AWS
* `npx cdk ls` - List all stacks in the app
* `npx cdk docs` - Open CDK documentation

### Troubleshooting
* `npx cdk doctor` - Check for common configuration issues
* `aws sts get-caller-identity` - Verify AWS credentials
* `npx cdk context --clear` - Clear CDK context cache

## Multi-Environment Deployment

For deploying to multiple environments (dev, staging, prod):

```bash
# Deploy to development
npx cdk deploy --context environment=dev

# Deploy to staging
npx cdk deploy --context environment=staging

# Deploy to production
npx cdk deploy --context environment=prod
```

## CI/CD Considerations

For automated deployments:

1. Use IAM roles instead of access keys when possible
2. Set `--require-approval never` for automated deployments
3. Use `--outputs-file` to capture stack outputs
4. Consider using `--rollback` for safer deployments

Example CI/CD command:
```bash
npx cdk deploy --require-approval never --outputs-file outputs.json --rollback
```
