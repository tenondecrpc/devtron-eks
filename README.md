# 🚀 EKS CDK - Kubernetes Cluster on AWS

Automatically deploy an optimized Amazon EKS cluster with essential add-ons using AWS CDK.

## ✨ What this project does

- **Deploys a fully configured EKS cluster**
- **Automatically installs essential add-ons** (VPC CNI, CoreDNS, kube-proxy, EBS CSI Driver)
- **Creates an optimized Node Group** with auto-scaling
- **Configures networking** with dedicated VPC
- **Provides detailed outputs** for easy access
- **Implements security best practices** and tagging

## 📋 Prerequisites

### Required Software:
- **Node.js** 20+
- **AWS CLI v2** (2.13.0+)
- **AWS CDK CLI** (2.100.0+)
- **AWS Account** with permissions for EKS, EC2, VPC, and IAM

### Supported Kubernetes Versions:
- **1.33** (Coming soon - see AWS documentation for `@aws-cdk/aws-eks-v2`)
- **1.32** (Available in CDK `@aws-cdk/aws-eks-v2` - used in the project)
- **1.31** (Standard support)
- **1.30** (Extended support)
- **1.29** (Extended support)

> 📖 For more information about versions: [AWS EKS Kubernetes Versions](https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html)

### Quick Installation:

**macOS:**
```bash
brew install node@20
brew link node@20
brew install awscli
npm install -g aws-cdk@latest
```

**Linux/Ubuntu:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install
npm install -g aws-cdk@latest
```

**Windows (PowerShell as Admin):**
```powershell
choco install nodejs-lts
choco install awscli
npm install -g aws-cdk@latest
```

## 🚀 Quick Start (5 minutes setup)

### ⚡ One-Command Deployment

```bash
cdk deploy --require-approval never --profile AWS_PROFILE
```

> **⏱️ Timeline:**
> - **Setup**: ~5 minutes (configure environment)
> - **EKS Cluster**: 15-20 minutes
> - **Post-deploy step**: 1 minute (Storage Class creation)
> - **Total**: ~20-25 minutes until Devtron-ready

**What this creates:**
- ✅ EKS cluster with VPC and networking
- ✅ Node groups with auto-scaling
- ✅ Essential add-ons (VPC CNI, CoreDNS, EBS CSI)
- ✅ Security groups and IAM roles

### ⚠️ **CRITICAL: Post-Deploy Steps Required**

**⚠️ IMPORTANT: After CDK deployment completes, you MUST run these steps in order:**

```bash
# Step 1: Connect to cluster
aws eks update-kubeconfig --region us-east-1 --name devtron-dev-cluster --profile AWS_PROFILE

# Step 2: Create Storage Class (MANDATORY)
# Option 1: Use npm script (recommended)
npm run create-storage-class

# Option 2: Manual kubectl command
kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp2
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp2
  fsType: ext4
reclaimPolicy: Delete
allowVolumeExpansion: false
volumeBindingMode: WaitForFirstConsumer
EOF
```

**Why the Storage Class step is required:**
- EBS CSI Driver doesn't always create the default Storage Class automatically
- Without this, Devtron PVCs will remain in "Pending" state
- PostgreSQL, Redis, and other stateful applications won't start
- **This takes 30 seconds and is mandatory**

**Verify it worked:**
```bash
kubectl cluster-info && kubectl get nodes
kubectl get storageclass  # Should show: gp2 (default)
```

### 📊 **Post-Deploy Verification**

**Use these commands to verify everything is working:**

```bash
# Verify cluster connection and nodes
kubectl cluster-info && kubectl get nodes

# Verify Storage Class is configured correctly
kubectl get storageclass

# Check cluster health
kubectl get pods -n kube-system
```

### 🎯 **Next: Install Devtron**

With Storage Class configured, install Devtron:

Follow [INSTALL_DEVTRON.md](INSTALL_DEVTRON.md) for detailed instructions (Takes 5-8 minutes)

> ⚠️ **Before running `cdk deploy`, configure environment variables below.**

### 📋 Environment Setup

**Required before deployment:**

```bash
# Configure AWS profile
aws configure --profile your-profile
aws configure sso --profile your-profile
aws sso login --profile your-profile

# Set environment variables
export ENV_NAME=dev
export PROJECT_NAME=devtron
export AWS_ACCOUNT=your-aws-account-id
export AWS_REGION=us-east-1

# Bootstrap CDK (first time only)
npx cdk bootstrap --profile your-profile
```

**Replace:**
- `your-profile` with your AWS profile name
- `your-aws-account-id` with your actual AWS account ID



---



## 🔧 Troubleshooting

### Cannot connect to cluster
```bash
aws eks update-kubeconfig --region us-east-1 --name devtron-dev-cluster --profile your-profile
kubectl cluster-info
```

### Environment variables not set
```bash
export ENV_NAME=dev
export PROJECT_NAME=devtron
export AWS_ACCOUNT=your-aws-account-id
export AWS_REGION=us-east-1
export SSO_ROLE_NAME=your-sso-role-name
export ACCESS_ROLE_NAME=your-role-name
```

### Cleanup cluster
```bash
npx cdk destroy --profile your-profile
```

## 📚 Resources

- 📖 **[Devtron Installation Guide](INSTALL_DEVTRON.md)**: Complete Devtron deployment
- **AWS EKS Documentation**: https://docs.aws.amazon.com/eks/
- **CDK Documentation**: https://docs.aws.amazon.com/cdk/

## 🎯 Key Points

- **EKS Cluster**: Ready in 15-20 minutes
- **Post-deploy steps**: Connect to cluster (30s) → Storage Class creation (30s, mandatory)
- **Devtron**: Installs in 5-8 minutes after Storage Class setup
- **Total time**: ~20-25 minutes until Devtron-ready

### Essential Commands

```bash
# 1. Deploy EKS cluster
cdk deploy --require-approval never --profile your-profile

# 2. Connect to cluster (AFTER deployment)
aws eks update-kubeconfig --region us-east-1 --name devtron-dev-cluster --profile your-profile

# 3. Create Storage Class (MANDATORY post-deploy step)
npm run create-storage-class

# 4. Verify everything works
kubectl cluster-info && kubectl get nodes && kubectl get storageclass

# 5. Cleanup when done
npx cdk destroy --profile your-profile
```



## 🔄 Kubernetes Version

- **Current**: 1.32 (Standard support until March 2026)
- **To change**: Edit `kubernetesVersion` in `lib/stack/eks/index.ts`

## 📦 What's Included

- ✅ EKS cluster with VPC and networking
- ✅ Node groups with auto-scaling (2-10 nodes)
- ✅ Essential add-ons (VPC CNI, CoreDNS, EBS CSI)
- ✅ Security groups and IAM roles
- ✅ Post-deploy Storage Class setup (mandatory)