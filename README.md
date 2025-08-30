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
- **Node.js** 18+ (recommended 20 LTS)
- **AWS CLI v2** (2.13.0+)
- **AWS CDK CLI** (2.100.0+)
- **AWS Account** with permissions for EKS, EC2, VPC, and IAM

> ⚠️ **Note**: Make sure to use compatible versions. The project is tested with Node.js 20 LTS and AWS CDK 2.100+.

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

## 🚀 Quick Start (5 minutes)

### ⚡ Ultra-Fast Option (1 command)

```bash
npm run deploy
```

**What does this do?**
- ✅ **CDK Deploy**: Creates EKS cluster with VPC, Node Group and add-ons
- ✅ **Auto-configuration**: Automatically installs all essential add-ons
- ✅ **Outputs**: Shows all important commands and endpoints
- ✅ **Verification**: Confirms everything is working correctly

#### 🎯 **If `installDevtron: true` (Default in dev environment):**

**⏱️ Total time until dashboard ready: 20-50 minutes**
- **CDK Deploy**: 5-15 minutes
- **Devtron Installation**: 3-8 minutes (Helm)
- **Complete initialization**: 10-20 minutes (pods, databases, services)
- **LoadBalancer internet-facing**: 2-5 minutes (AWS recreates ALB)

**📊 Expected progress:**
```
0:00 - 0:15: CDK Deploy + Cluster creation
0:15 - 0:25: Devtron Helm install
0:25 - 0:45: Service initialization
0:45 - 0:50: Dashboard ready to use
```

**✅ At completion you'll have:**
- Fully operational EKS cluster
- Devtron installed and configured
- Dashboard URL available
- Admin credentials generated

### ⚠️ **Why don't we wait automatically?**

**CDK has technical limitations that prevent including complete waiting:**

#### ❌ **Timeout Issues:**
- **Helm timeout**: CDK waits maximum 15 minutes per Helm operation
- **Cluster stabilization**: Kubernetes can take 20+ minutes to stabilize
- **LoadBalancer provisioning**: AWS takes 2-5 minutes to create ALB

#### ❌ **CDK Architecture:**
- **Stack dependencies**: CDK doesn't handle complex asynchronous dependencies well
- **Rollback issues**: If initialization fails, rollback is problematic
- **State management**: CDK assumes resources are ready immediately

#### ✅ **Adopted Solution:**
- **Fast deploy**: CDK creates basic infrastructure (5-15 min)
- **Separate initialization**: Devtron is installed but doesn't wait for completion
- **Manual monitoring**: User verifies progress with npm commands
- **Flexibility**: User decides when to verify vs wait automatically

**Result:** Reliable deploy vs deploy that might fail due to timeouts. 🚀

### 📊 **How to Monitor Progress After Deploy**

**After running `npm run deploy` with `installDevtron: true`:**

```bash
npm run connect-cluster
watch -n 300 "kubectl -n devtroncd get installers installer-devtron -o jsonpath='{.status.sync.status}'"
npm run progress
npm run devtron-status
```

**Devtron States:**
- `Downloaded` → Installing (wait 10-15 min)
- `Applied` → ✅ Ready to use
- `OutOfSync` → ❌ Error (check logs)

**⏱️ Verification checklist:**
- [ ] CDK deploy completed (5-15 min)
- [ ] EKS cluster operational
- [ ] Devtron installed (status: Applied)
- [ ] LoadBalancer accessible
- [ ] Dashboard responds correctly

#### 🎯 **If `installDevtron: false` (EKS cluster only):**

**⏱️ Time: 5-15 minutes**
- Only deploys basic EKS cluster
- You must manually follow [INSTALL_DEVTRON.md](INSTALL_DEVTRON.md)

> ⚠️ **Important**: Before running `npm run deploy`, make sure you have configured the environment variables. See the **"Configure Environment Variables"** section below.

### 🔄 Step-by-Step Option (Manual)

### 1. Configure AWS Credentials
```bash
aws configure --profile AWS_PROFILE
aws configure sso --profile AWS_PROFILE
aws sso login --profile AWS_PROFILE
```

### 2. Prepare CDK Project
```bash
npm install
npx cdk bootstrap --profile AWS_PROFILE
npm run build
```

### 3. Configure Environment Variables
```bash
export ENV_NAME=dev
export PROJECT_NAME=devtron
export AWS_ACCOUNT=xxxx81713846
export AWS_REGION=us-east-1

cat > .env << EOF
ENV_NAME=dev
PROJECT_NAME=devtron
AWS_ACCOUNT=xxxx81713846
AWS_REGION=us-east-1
EOF

source .env

echo "=== Project Variables ==="
echo "ENV_NAME: $ENV_NAME"
echo "PROJECT_NAME: $PROJECT_NAME"
echo "AWS_ACCOUNT: $AWS_ACCOUNT"
echo "AWS_REGION: $AWS_REGION"
echo "=============================="
```

**📋 Project variables:**
- **`ENV_NAME`**: Deployment environment (dev, staging, prod)
- **`PROJECT_NAME`**: Project name (devtron)
- **`AWS_ACCOUNT`**: Your AWS account ID (xxxx81713846)
- **`AWS_REGION`**: Region where cluster will be deployed (us-east-1)

### 4. Deploy EKS Cluster
```bash
npx cdk deploy --require-approval never --profile AWS_PROFILE
```

### 5. Configure kubectl
```bash
aws eks update-kubeconfig --region us-east-1 --name your-project-name-dev-cluster --profile AWS_PROFILE
kubectl cluster-info
kubectl get nodes
```

### 6. Verify installation
```bash
kubectl get all --all-namespaces
kubectl get pods -n kube-system
kubectl get nodes --label-columns=eks.amazonaws.com/nodegroup
```

### 7. Next Steps
```bash
# After having the cluster ready:
# 1. Install kubectl and Helm by following [INSTALL_KUBERNETES.md](INSTALL_KUBERNETES.md)
# 2. Install Devtron by following [INSTALL_DEVTRON.md](INSTALL_DEVTRON.md)
# 3. Start deploying your applications!
```

## 🔧 Common Troubleshooting

### Problem: "Cannot connect to cluster"
```bash
aws sts get-caller-identity --profile AWS_PROFILE
aws eks update-kubeconfig --region us-east-1 --name your-project-name-dev-cluster --profile AWS_PROFILE
kubectl cluster-info
```

### Problem: "Environment variables not configured"
```bash
echo "ENV_NAME: $ENV_NAME"
echo "PROJECT_NAME: $PROJECT_NAME"
echo "AWS_ACCOUNT: $AWS_ACCOUNT"
echo "AWS_REGION: $AWS_REGION"

export ENV_NAME=dev
export PROJECT_NAME=devtron
export AWS_ACCOUNT=xxxx81713846
export AWS_REGION=us-east-1

cat > .env << EOF
ENV_NAME=dev
PROJECT_NAME=devtron
AWS_ACCOUNT=xxxx81713846
AWS_REGION=us-east-1
EOF
```

### Problem: "Nodes are not Ready"
```bash
kubectl get nodes
kubectl describe node <node-name>
kubectl get nodegroups
```

### Problem: "Add-ons are not installing"
```bash
aws eks describe-addon --cluster-name your-cluster-name --addon-name vpc-cni
kubectl get pods -n kube-system
```

### Problem: "Low disk space or CPU"
```bash
kubectl describe nodes
kubectl top nodes
kubectl top pods --all-namespaces
```

### Complete cleanup:
```bash
npx cdk destroy --profile AWS_PROFILE
```

## 📚 More Information

- **AWS EKS Documentation**: https://docs.aws.amazon.com/eks/
- **AWS CDK Documentation**: https://docs.aws.amazon.com/cdk/
- **Custom configurations**: Edit ``lib/construct/eks-construct.ts``
- 📖 **[Kubernetes Installation Guide](INSTALL_KUBERNETES.md)**: Install kubectl and Helm
- 📖 **[Devtron Installation Guide](INSTALL_DEVTRON.md)**: Deploy Devtron on EKS

## 🎯 Tips

- **First time**: Use the direct deployment workflow with `npm run deploy`
- **With installDevtron=true**: Wait 20-50 minutes until dashboard is ready
- **With installDevtron=false**: Follow [INSTALL_DEVTRON.md](INSTALL_DEVTRON.md) after deploy
- **Monitoring**: Use `npm run progress` to see real-time status
- **Production**: Increase nodes and configure auto-scaling according to needs
- **Development**: Cluster ready for applications immediately
- **Wait times**:
  - **Cluster only**: 5-15 minutes
  - **With Devtron**: 20-50 minutes total
  - **LoadBalancer fix**: 3-7 additional minutes if needed

### ⚡ Quick Commands by Scenario

#### **After Deploy with Devtron:**
```bash
npm run connect-cluster    # Connect kubectl
npm run progress          # View complete progress
watch -n 300 "kubectl -n devtroncd get installers installer-devtron -o jsonpath='{.status.sync.status}'"  # Automatic monitoring
npm run devtron-status    # Final URL and password
```

#### **After Deploy without Devtron:**
```bash
npm run connect-cluster    # Connect kubectl
npm run status            # View cluster status
# Then follow INSTALL_DEVTRON.md
```

#### **Monitoring Commands:**
- **Deploy**: `npm run deploy` (deploys EKS cluster)
- **Connect**: `npm run connect-cluster` (automatically configures kubectl)
- **Connect help**: `npm run connect` (shows connection instructions)
- **Verify**: `npm run status` (shows cluster status)
- **Pods**: `npm run pods` (lists all pods)
- **Services**: `npm run services` (lists all services)
- **Nodes**: `npm run nodes` (node group information)
- **Events**: `npm run events` (recent cluster events)
- **Logs**: `npm run logs` (view pod logs)
- **Destroy**: `npm run destroy` (removes entire cluster)

### ⚙️ Advanced Configuration
- **Customize cluster**: Edit `lib/stack/eks/index.ts`
- **Environment variables**: Configure `ENV_NAME`, `PROJECT_NAME`, `AWS_ACCOUNT`, `AWS_REGION`
- **Wait times**: CDK maximum timeout 15 min, service initialization 20+ min
- **Optimized outputs**: Removed duplicates, added useful commands

## 🛠️ Available Scripts

| Command | Description | Estimated Time |
|---------|-------------|----------------|
| `npm run deploy` | Deploy complete EKS cluster | 5-50 min (depends on installDevtron) |
| `npm run destroy` | Remove EKS cluster | 5-10 min |
| `npm run connect` | Show detailed connection instructions | Instantaneous |
| `npm run connect-cluster` | Automatically connect to cluster | 1-2 min |
| `npm run status` | Check cluster status | Instantaneous |
| `npm run progress` | Complete status with wait times | Instantaneous |
| `npm run time-estimates` | Show installation time estimates | Instantaneous |
| `npm run cost-analysis` | Cost analysis and instances | Instantaneous |
| `npm run devtron-status` | Devtron URL and password | Instantaneous |
| `npm run pods` | List all pods | Instantaneous |
| `npm run services` | List all services | Instantaneous |
| `npm run nodes` | Node group information | Instantaneous |
| `npm run events` | Recent cluster events | Instantaneous |
| `npm run logs <pod>` | View logs of specific pod | Instantaneous |
| `npm run fix-lb-public` | Fix LoadBalancer for public access | 3-7 min |
| `npm run verify-lb` | Verify LoadBalancer status | Instantaneous |

### Interactive Commands:
| Command | Usage |
|---------|-------|
| `npm run logs <pod-name>` | View logs of specific pod |
| `kubectl describe <resource>` | Describe resources (use kubectl directly) |
| `kubectl exec -it <pod>` | Execute commands in a pod |
| `kubectl port-forward <svc>` | Port forwarding of services |
| `kubectl apply -f <file>` | Apply YAML manifests |
| `kubectl delete <resource>` | Delete resources |

### 🔗 Cluster Connection

**After deploying the EKS cluster:**

1. **View connection instructions:**
   ```bash
   npm run connect
   ```

2. **Connect automatically:**
   ```bash
   npm run connect-cluster
   ```

3. **Verify connection:**
   ```bash
   npm run status
   ```

**If the cluster has a different name, connect manually:**
```bash
aws eks update-kubeconfig --region us-east-1 --name devtron-dev-cluster --profile AWS_PROFILE
```

## 🔄 Kubernetes Versions

### 📊 Current Cluster: `devtron-dev-cluster`
- **Version**: 1.32
- **Provider**: Amazon EKS

### 📅 Support Information for Kubernetes 1.32

**Standard Support:**
- ✅ **Available**: Yes (currently used in the project)
- ✅ **Released in CDK**: Available
- ✅ **End of standard support**: March 2026

**Extended Support:**
- ⚠️ **Available after March 2026**
- 💰 **Additional costs** apply during extended support
- 📈 **Recommendation**: Plan upgrade before March 2026 to avoid extended support

### 🎯 Options to Avoid Extended Support

If you don't want to use extended support, you can:

1. **Upgrade the cluster** to version 1.33 when available
2. **Manage the Kubernetes version policy**
3. **Plan the migration** in advance

> 💡 **Important note**: Extended support has additional costs. For more information, check the [AWS EKS pricing page](https://aws.amazon.com/eks/pricing/) and the [version policies documentation](https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html).

### 📋 AWS EKS Version Calendar

| Version | Status | Standard Support | Extended Support |
|---------|--------|------------------|-------------------|
| **1.32** | Current | January 2025 - March 2026 | March 2026 - March 2027 |
| **1.31** | Standard | September 2024 - November 2025 | November 2025 - November 2026 |
| **1.30** | Extended | May 2024 - July 2025 | July 2025 - July 2026 |
| **1.29** | Extended | January 2024 - March 2025 | March 2025 - March 2026 |

### To change the version:
```typescript
// In `lib/stack/eks/index.ts`
kubernetesVersion: eksv2.KubernetesVersion.V1_32, // Current (used by default)
// or
kubernetesVersion: eksv2.KubernetesVersion.V1_31, // Standard support
// or
kubernetesVersion: eksv2.KubernetesVersion.V1_30, // Extended support
// or when available:
// kubernetesVersion: eksv2.KubernetesVersion.V1_33,
```

> 📋 **Note**: The project uses the latest available version in AWS CDK. According to the [official AWS EKS documentation](https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html), version 1.33 will be available soon in `@aws-cdk/aws-eks-v2`.

## 💡 What does the installation include?

| Component | Status | Description |
|-----------|--------|-------------|
| **EKS Cluster** | ✅ Automatic | `devtron-dev-cluster` Kubernetes 1.32 cluster with control plane |
| **VPC** | ✅ Automatic | Dedicated VPC with public/private subnets |
| **Node Group** | ✅ Automatic | Node group with auto-scaling (2-10 nodes) |
| **VPC CNI** | ✅ Automatic | Networking for pods |
| **CoreDNS** | ✅ Automatic | Cluster DNS service |
| **Kube Proxy** | ✅ Automatic | Network proxy for services |
| **EBS CSI Driver** | ✅ Automatic | Persistent storage with EBS |

Your EKS cluster will be ready in less than 15 minutes! 🎉

## 📋 Next Steps After Deploy

Once you have your EKS cluster deployed and running, follow these steps to complete the installation:

### 1. 🛠️ Prepare Your Local Environment

**Install the necessary clients on your machine:**
- 📖 **[Follow the complete guide](INSTALL_KUBERNETES.md)** to install kubectl and Helm
- ⏱️ **Estimated time:** 10-15 minutes
- ✅ **Verification:** `kubectl version --client` and `helm version`

### 2. 🚀 Install Devtron

**Deploy Devtron with CI/CD on your cluster:**
- 📖 **[Follow the detailed guide](INSTALL_DEVTRON.md)** to install Devtron
- 🎯 **Includes:** Cluster connection, Helm installation, initial configuration
- ✅ **Result:** Devtron dashboard accessible

### 3. 🔗 Connect and Verify

**Connect to your cluster and verify everything is working:**
```bash
npm run connect-cluster
npm run status

npm run pods
```

### 4. 🎯 Start Using Devtron

Once Devtron is installed, you can:
- ✅ **Configure CI/CD pipelines**
- ✅ **Deploy applications**
- ✅ **Manage environments**
- ✅ **Monitor your cluster**

## 📚 Installation Documentation

| Guide | Purpose | Estimated Time |
|-------|---------|----------------|
| **[INSTALL_KUBERNETES.md](INSTALL_KUBERNETES.md)** | Install kubectl and Helm | 10-15 min |
| **[INSTALL_DEVTRON.md](INSTALL_DEVTRON.md)** | Install Devtron on EKS | 15-20 min |

Follow these guides in order to have a complete development environment with Kubernetes and Devtron! 🚀

## 🔧 Project Environment Variables

### 📋 Essential Variables for CDK Deploy

**Before running `npm run deploy`, configure these variables:**

```bash
export ENV_NAME=dev
export PROJECT_NAME=devtron
export AWS_ACCOUNT=xxxx81713846
export AWS_REGION=us-east-1
```

### 🗂️ Create .env File (Recommended)

```bash
cat > .env << EOF
ENV_NAME=dev
PROJECT_NAME=devtron
AWS_ACCOUNT=xxxx81713846
AWS_REGION=us-east-1
EOF

source .env
```

### ✅ Verify Configuration

```bash
echo "=== Project Variables ==="
echo "ENV_NAME: $ENV_NAME"
echo "PROJECT_NAME: $PROJECT_NAME"
echo "AWS_ACCOUNT: $AWS_ACCOUNT"
echo "AWS_REGION: $AWS_REGION"
echo "============================="

if [ -z "$ENV_NAME" ] || [ -z "$PROJECT_NAME" ] || [ -z "$AWS_ACCOUNT" ] || [ -z "$AWS_REGION" ]; then
    echo "❌ Error: Some variables are empty"
    exit 1
else
    echo "✅ All variables are configured correctly"
fi
```

### 🚨 Common Issues

**If you get undefined variable errors:**
```bash
export ENV_NAME=dev
export PROJECT_NAME=devtron
export AWS_ACCOUNT=xxxx81713846
export AWS_REGION=us-east-1
```

**For persistent local development:**
```bash
echo 'export ENV_NAME=dev' >> ~/.bashrc
echo 'export PROJECT_NAME=devtron' >> ~/.bashrc
echo 'export AWS_ACCOUNT=xxxx81713846' >> ~/.bashrc
echo 'export AWS_REGION=us-east-1' >> ~/.bashrc

source ~/.bashrc
```