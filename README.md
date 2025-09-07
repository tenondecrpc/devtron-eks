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
> - **EKS Cluster**: 15-20 minutes (fully configured and ready)
> - **Devtron Installation**: 5-8 minutes
> - **Total**: ~20-28 minutes until fully operational

**What this creates:**
- ✅ EKS cluster with VPC and networking
- ✅ Node groups with auto-scaling (2-10 nodes)
- ✅ Essential add-ons (VPC CNI, CoreDNS, EBS CSI)
- ✅ gp3 StorageClass as default (kubectl provider enabled)
- ✅ Security groups and IAM roles
- ✅ Ready for immediate Devtron installation

### ✅ **Automated Infrastructure Setup**

The CDK deployment creates a production-ready EKS cluster including:
- ✅ EBS CSI Driver addon (AWS managed)
- ✅ gp3 StorageClass created automatically as default
- ✅ kubectl provider configured (enables Kubernetes manifests)
- ✅ Optimized configuration (3000 IOPS, 125 MiB/s throughput)
- ✅ Volume expansion enabled
- ✅ WaitForFirstConsumer binding mode

**No manual configuration required** - the cluster is ready for Devtron installation.

### 📊 **Quick Verification (Optional)**

**After CDK deployment completes, optionally verify everything is ready:**

```bash
# 1. Connect to cluster and verify it's ready
aws eks update-kubeconfig --region us-east-1 --name devtron-dev-cluster --profile AWS_PROFILE
kubectl cluster-info && kubectl get nodes

# 2. Verify Storage Class is configured (should show gp3 as default)
kubectl get storageclass

# ✅ If both commands succeed, you're ready for Devtron installation!
```

### 🎯 **Next: Install Devtron (5-8 minutes)**

Your EKS cluster is ready for Devtron installation.

Follow [INSTALL_DEVTRON.md](INSTALL_DEVTRON.md) for the standard Helm installation.

**What to expect:**
- Standard Helm installation completes in 5-8 minutes
- No manual configuration needed
- All dependencies automatically resolved

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
```

### Cleanup cluster
```bash
npx cdk destroy --profile your-profile
```

> **💡 Note:** Previous issues with Storage Class configuration, kubectl provider, and manual setup steps have been resolved. The deployment now works seamlessly!

## 📚 Resources

- 📖 **[Devtron Installation Guide](INSTALL_DEVTRON.md)**: Complete Devtron deployment
- **AWS EKS Documentation**: https://docs.aws.amazon.com/eks/
- **CDK Documentation**: https://docs.aws.amazon.com/cdk/

## 🎯 Key Points

- **EKS Cluster**: Ready in 15-20 minutes (fully automated)
- **Storage Class**: Created automatically (gp3 as default)
- **kubectl provider**: Pre-configured (enables Kubernetes manifests)
- **Devtron**: Installs in 5-8 minutes after cluster setup
- **Total time**: ~20-28 minutes until fully operational
- **No manual steps**: Storage Class and kubectl provider configured automatically

### Essential Commands

```bash
# 1. Deploy EKS cluster (includes Storage Class creation)
cdk deploy --require-approval never --profile your-profile

# 2. Connect to cluster (AFTER deployment)
aws eks update-kubeconfig --region us-east-1 --name devtron-dev-cluster --profile your-profile

# 3. Verify everything works
kubectl cluster-info && kubectl get nodes && kubectl get storageclass

# 4. Cleanup when done
npx cdk destroy --profile your-profile
```



## 🔄 Kubernetes Version

- **Current**: 1.32 (Standard support until March 2026)
- **To change**: Edit `kubernetesVersion` in `lib/stack/eks/index.ts`

## 📦 What's Included

- ✅ EKS cluster with VPC and networking
- ✅ Node groups with auto-scaling (2-10 nodes)
- ✅ Essential add-ons (VPC CNI, CoreDNS, EBS CSI)
- ✅ gp3 StorageClass as default (automatic)
- ✅ Security groups and IAM roles