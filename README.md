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

#### 🎯 **After CDK Deployment:**

**⏱️ Total time until cluster ready: 15-20 minutes**
- **CDK Deploy**: 15-20 minutes (measured: ~17.9 minutes)
- **EKS Cluster creation**: Included in CDK deploy
- **Essential add-ons**: VPC CNI, CoreDNS, kube-proxy, EBS CSI Driver

**📊 Expected progress:**
```
0:00 - 0:20: CDK Deploy + Cluster creation
```

**✅ At completion you'll have:**
- Fully operational EKS cluster
- Essential add-ons installed and configured
- Ready for application deployment

### ⚠️ **Why is Devtron installation separate?**

**A comprehensive explanation of the technical challenges and architectural decisions:**

#### ❌ **CDK Technical Limitations:**
- **Helm Timeout Constraints**: CDK has a maximum 15-minute timeout per Helm operation. Devtron's complex multi-stage installation (operator deployment, CRDs, service accounts, RBAC, PostgreSQL, etc.) frequently exceeds this limit
- **State Management Complexity**: CDK assumes resources are immediately ready after creation. Devtron's asynchronous installation process (Downloaded → Applied states) doesn't fit this model
- **Dependency Chain Issues**: Devtron requires sequential operations (operator → CRDs → PostgreSQL → services) that CDK's declarative approach struggles to orchestrate reliably
- **Rollback Complexity**: When Devtron installation fails mid-process, CDK's rollback mechanism becomes unpredictable with partially deployed resources

#### ❌ **Devtron Installation Complexity:**
- **Multi-Stage Process**: Devtron installation involves 15+ sequential steps including custom resource definitions, database initialization, service mesh configuration, and ingress setup
- **Resource Dependencies**: Requires PostgreSQL, Redis, NATS, and multiple microservices to be fully operational before dashboard access
- **Network Configuration**: LoadBalancer provisioning and service mesh setup can take 5-15 minutes depending on AWS region and capacity
- **Version Compatibility**: Devtron versions may have specific Kubernetes version requirements that need validation before installation

#### ❌ **Historical Problems Encountered:**
- **Timeout Failures**: Multiple deployments failed at 15-minute mark during PostgreSQL initialization or CRD propagation
- **Inconsistent States**: Partial installations left clusters in unusable states requiring manual cleanup
- **Resource Conflicts**: CDK-managed resources conflicted with Devtron's Helm-managed resources
- **Debugging Difficulty**: Combined stack failures made it hard to isolate infrastructure vs application issues
- **Update Complexity**: Devtron updates required coordinated CDK and Helm changes
- **Cost Inefficiency**: Failed deployments wasted AWS resources and increased costs

#### ❌ **Operational Challenges:**
- **Monitoring Gaps**: CDK doesn't provide visibility into Devtron's internal installation progress
- **Error Recovery**: Failed Devtron installations required manual intervention and cluster recreation
- **Version Pinning**: CDK's strict versioning made Devtron updates challenging
- **Security Considerations**: Devtron's service accounts and RBAC setup needed careful sequencing

#### ✅ **Architectural Benefits of Separation:**

**Phase 1 - Infrastructure Foundation:**
- **Predictable Deployment**: EKS cluster + add-ons deploy consistently in 15-20 minutes
- **Resource Optimization**: Infrastructure components (VPC, subnets, node groups) are stable and reusable
- **Error Isolation**: Infrastructure issues don't affect application deployment
- **Cost Control**: Failed infrastructure deployments are quick to identify and fix
- **Reusability**: Same EKS cluster can host different applications

**Phase 2 - Application Installation:**
- **Flexible Timing**: Install Devtron when infrastructure is stable and verified
- **Version Control**: Update Devtron independently of infrastructure
- **Debugging Clarity**: Clear separation between infrastructure and application issues
- **Resource Management**: Application-specific resources managed separately
- **Operational Control**: Pause/resume installation at any point

#### ✅ **Technical Advantages:**
- **Helm Native**: Devtron uses its official Helm charts with proper dependency management
- **Progress Monitoring**: Real-time visibility into installation states via kubectl
- **Error Recovery**: Failed installations can be retried without recreating infrastructure
- **Version Flexibility**: Update Devtron without touching CDK infrastructure
- **Cost Optimization**: No wasted resources on failed combined deployments

**Result:** Reliable, maintainable deployment process with clear separation of concerns and predictable outcomes. 🚀

### 📊 **How to Monitor Progress After Deploy**

**After CDK deployment (EKS cluster ready):**

```bash
npm run connect-cluster
npm run status
npm run nodes
npm run pods
```

**⏱️ Verification checklist:**
- [ ] CDK deploy completed (15-20 min)
- [ ] EKS cluster operational
- [ ] Essential add-ons installed (VPC CNI, CoreDNS, kube-proxy, EBS CSI)
- [ ] Node group auto-scaling working
- [ ] kubectl connection established

#### 🎯 **Next Steps: Install Devtron**

**After EKS cluster is ready (15-20 minutes):**
- EKS cluster with all essential add-ons deployed
- Ready for Devtron installation
- Follow [INSTALL_DEVTRON.md](INSTALL_DEVTRON.md) for Devtron deployment

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
- **EKS Cluster**: Ready in 15-20 minutes
- **Devtron Installation**: Additional 20-50 minutes (follow INSTALL_DEVTRON.md)
- **Monitoring**: Use `npm run progress` to see real-time status
- **Production**: Increase nodes and configure auto-scaling according to needs
- **Development**: Cluster ready for applications immediately
- **Wait times**:
  - **Cluster only**: 15-20 minutes (measured: ~17.9 minutes)
  - **With Devtron**: 35-70 minutes total
  - **LoadBalancer fix**: 3-7 additional minutes if needed

### ⚡ Quick Commands by Scenario

#### **After EKS Deploy:**
```bash
npm run connect-cluster    # Connect kubectl
npm run status            # View cluster status
npm run nodes             # Check node group
npm run pods              # List all pods
```

#### **After Devtron Installation:**
```bash
npm run devtron-status    # Get Devtron URL and password
npm run progress          # View Devtron installation progress
watch -n 300 "kubectl -n devtroncd get installers installer-devtron -o jsonpath='{.status.sync.status}'"  # Monitor Devtron
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
- **Wait times**: CDK deploy 15-20 min, service initialization 20+ min
- **Optimized outputs**: Removed duplicates, added useful commands

## 🛠️ Available Scripts

| Command | Description | Estimated Time |
|---------|-------------|----------------|
| `npm run deploy` | Deploy complete EKS cluster | 15-70 min (cluster only: 15-20 min, measured: ~17.9 min) |
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
| `npm run fix-devtron-service` | Fix Devtron service selector and LoadBalancer | 3-7 min |
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

Your EKS cluster will be ready in 15-20 minutes! 🎉

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