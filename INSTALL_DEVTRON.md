# Installing Devtron on EKS

Standard Helm installation guide for Devtron on the CDK-deployed EKS cluster.

## Prerequisites

Before installing Devtron, ensure you have:

1. **EKS Cluster**: Deployed via CDK (see [README.md](README.md#quick-start-5-minutes-setup) for deployment instructions)
2. **Cluster Connection**: Run `aws eks update-kubeconfig --region us-east-1 --name devtron-dev-cluster --profile AWS_PROFILE` to connect to your EKS cluster  
3. **kubectl**: Configured and connected to your cluster
4. **Helm**: Version 3.8+ installed

## Prerequisites Configuration

The EKS cluster created by CDK includes:
- kubectl provider pre-configured
- Storage Class (gp3) created automatically as default
- All necessary add-ons (VPC CNI, CoreDNS, EBS CSI)
- Proper IAM roles and security groups

## Installation Information

- **Method**: Standard Helm installation
- **Version**: Latest stable Devtron with CI/CD module
- **Namespace**: `devtroncd` 
- **Total time**: 5-8 minutes

## Step 1: Connect to EKS Cluster

```bash
# Connect kubectl to your EKS cluster
aws eks update-kubeconfig --region us-east-1 --name devtron-dev-cluster --profile AWS_PROFILE

# Verify cluster connection and status
kubectl cluster-info && kubectl get nodes
```

**⏱️ 🚀 Estimated time: 1-2 minutes**

## Step 2: Install Devtron

```bash
# Verify Helm version (should be 3.8+)
helm version --short

# Add Devtron Helm repository
helm repo add devtron https://helm.devtron.ai
helm repo update devtron

# Install Devtron with CI/CD module 
helm install devtron devtron/devtron-operator \
  --create-namespace \
  --namespace devtroncd \
  --set installer.modules={cicd}
```

**Estimated time: 5-8 minutes**

> **Note**: The standard installation works directly with the CDK-deployed EKS cluster configuration.

## Step 3: Monitor Installation

```bash
# Check installation status
kubectl -n devtroncd get installers installer-devtron \
  -o jsonpath='{.status.sync.status}'
```

**Installation progression:**
- `Downloaded` → Installation in progress (2-5 minutes)
- `Applied` → Installation completed

**Monitor pods (optional):**
```bash
# Watch pods come online
kubectl get pods -n devtroncd -w
```

**Total time: 5-8 minutes**

### 📋 Installation Process

1. **0-1 min**: Helm chart deploys and creates CRDs
2. **1-3 min**: PostgreSQL StatefulSet provisions PVC
3. **3-5 min**: Database initialization and migrations
4. **5-8 min**: All Devtron services start and stabilize
5. **Complete**: All pods reach Running state

## Step 4: Configure Access and Get Credentials

Once Devtron shows `Applied` status, configure access:

```bash
# Get admin password
kubectl -n devtroncd get secret devtron-secret -o jsonpath='{.data.ADMIN_PASSWORD}' | base64 -d

# Start port forwarding to access Devtron dashboard
kubectl port-forward svc/devtron-service -n devtroncd 8080:80
```

**Credentials:**
- **Username:** `admin`
- **Password:** [output from the command above]
- **URL:** `http://localhost:8080`

> **🎯 IMPORTANT!** Keep the port forwarding command running in a separate terminal window. The connection will remain active as long as the command is running.

---

## Step 5: Access Devtron Dashboard

Once port forwarding is running from Step 4:

**Open your browser and navigate to:**
```
http://localhost:8080
```

**Login with:**
- **Username:** `admin`
- **Password:** [obtained from Step 4]

> **💡 Tip**: Keep the port forwarding command from Step 4 running in a separate terminal. Press `Ctrl+C` to stop when finished.

## Useful Commands

```bash
# Check cluster status
kubectl cluster-info && kubectl get nodes

# Get Devtron admin password
kubectl -n devtroncd get secret devtron-secret -o jsonpath='{.data.ADMIN_PASSWORD}' | base64 -d

# Check all Devtron resources
kubectl get all -n devtroncd

# View detailed pod information
kubectl describe pods -n devtroncd

# Check Devtron operator logs
kubectl logs -f -l app=devtron -n devtroncd

# Check PostgreSQL pod logs (if database issues)
kubectl logs -f -l app=postgresql -n devtroncd

# Verify service endpoints
kubectl describe svc devtron-service -n devtroncd
```

## Troubleshooting

The CDK-configured cluster should work without issues. If needed:

### Normal Installation Behavior:
- **Temporary pod states**: Some pods may briefly show "Pending" or restart during initialization - this is normal
- **Expected timeline**: Installation progresses steadily and completes in 5-8 minutes
- **Storage**: PVCs provision automatically (no manual Storage Class needed)

### If Something Goes Wrong:
```bash
# Check installation status
kubectl -n devtroncd get installers installer-devtron -o jsonpath='{.status.sync.status}'

# Check pods (should all reach Running state)
kubectl get pods -n devtroncd
```

### Common Solutions:
- **Port forwarding issues**: Try different local ports (8080, 8081, 9000, etc.)
- **Connection issues**: Verify `kubectl cluster-info` works first

### Debug Commands:

```bash
# Check all Devtron resources
kubectl get all -n devtroncd

# View detailed pod information
kubectl describe pods -n devtroncd

# Check Devtron operator logs
kubectl logs -f -l app=devtron -n devtroncd

# Check PostgreSQL pod logs (if database issues)
kubectl logs -f -l app=postgresql -n devtroncd

# Verify service endpoints
kubectl describe svc devtron-service -n devtroncd
```

## 🗑️ **Devtron On-Demand Removal**

If you need to completely remove Devtron from your cluster at any time:

### 🚀 Quick Removal (npm scripts)

```bash
# Standard cleanup (recommended)
npm run cleanup-devtron

# Force cleanup (if resources are stuck)
npm run cleanup-devtron-force

# Complete destruction (removes everything)
npm run cleanup-devtron-complete
```

### 🔧 Manual Removal Commands

#### **Step 1: Check Existing Resources**
```bash
# See what Devtron resources exist
kubectl get namespaces | grep devtron
kubectl get clusterrole | grep devtron
kubectl get clusterrolebinding | grep devtron
kubectl get crd | grep devtron
```

#### **Step 2: Remove Helm Release**
```bash
# Uninstall Devtron Helm release
helm uninstall devtron -n devtroncd --ignore-not-found=true
```

#### **Step 3: Remove All Namespaces**
```bash
# Remove all Devtron namespaces
kubectl delete namespace devtroncd --ignore-not-found=true
kubectl delete namespace devtron-ci --ignore-not-found=true
kubectl delete namespace devtron-demo --ignore-not-found=true
```

#### **Step 4: Remove Cluster-Level Resources**
```bash
# Remove cluster role binding
kubectl delete clusterrolebinding devtron --ignore-not-found=true

# Remove cluster role
kubectl delete clusterrole devtron --ignore-not-found=true
```

#### **Step 5: Remove Custom Resource Definition**
```bash
# Remove Devtron CRD
kubectl delete crd installers.installer.devtron.ai --ignore-not-found=true
```

### ✅ Verify Complete Cleanup

```bash
# Verify no Devtron resources remain
kubectl get namespaces | grep -i devtron || echo "✅ No Devtron namespaces found"
kubectl get clusterrole | grep -i devtron || echo "✅ No Devtron cluster roles found"
kubectl get clusterrolebinding | grep -i devtron || echo "✅ No Devtron cluster role bindings found"
kubectl get crd | grep -i devtron || echo "✅ No Devtron CRDs found"
helm list -A | grep -i devtron || echo "✅ No Devtron Helm releases found"
```

### ⚠️ **Important Notes**

- **Data Loss**: Removing Devtron will delete all your applications, pipelines, and configurations
- **Backup First**: Consider backing up important data before removal
- **Cluster Impact**: Cluster-level resources (CRDs, cluster roles) affect the entire cluster
- **Reinstallation**: After complete removal, you can reinstall Devtron from scratch

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify your EKS cluster is healthy with `kubectl cluster-info && kubectl get nodes`
3. Review Devtron operator logs: `kubectl logs -f -l app=devtron -n devtroncd`
4. Check the [Devtron community forums](https://github.com/devtron-labs/devtron/discussions) for similar issues

## Summary

### Installation Process
1. **CDK deploys EKS cluster** with kubectl provider and Storage Class configured
2. **Standard Helm installation** completes in 5-8 minutes  
3. **Port forwarding** provides dashboard access
4. **No manual configuration** needed

### Infrastructure Components
- **kubectl provider**: Pre-configured for Kubernetes manifests
- **Storage Class**: gp3 created automatically as default
- **IAM roles**: Proper permissions for EKS and add-ons
- **Add-ons**: VPC CNI, CoreDNS, EBS CSI configured

### Previous Manual Steps (Now Automated)
- Storage Class creation (now automatic)
- kubectl provider setup (now included in CDK)
- Service dependencies configuration

## Resources

- 📖 [Complete Devtron Documentation](https://docs.devtron.ai/)
- 🏠 [README.md](README.md) - Project start and configuration
- 🔧 [INSTALL_KUBERNETES.md](INSTALL_KUBERNETES.md) - To install kubectl/Helm

## Version Compatibility

- **Kubernetes**: Compatible with EKS 1.30+ (tested with 1.32)
- **Helm**: Requires Helm 3.8+
- **Devtron**: Latest stable version (automatically pulled from Helm repo)
- **AWS Region**: All regions supported for EKS cluster deployment

## ⏱️ Installation Timeline Summary

| Step | Duration | What Happens |
|------|----------|-------------|
| **Step 1** | 🚀 1-2 min | Connect to EKS cluster |
| **Step 2** | ⚡ 1-8 min | Install Devtron via Helm |
| **Step 3** | 🕐 **5-8 min** | Wait for complete installation |
| **Step 4** | 🚀 1-2 min | Configure access and get credentials |
| **Step 5** | ✅ Immediate | Access Devtron dashboard |

**Total Time: 5-8 minutes**

## 📊 **Installation Timeline**

| Phase | Duration | What Happens |
|-------|----------|---------------|
| **Helm Install** | ~1 min | Chart deployment |
| **Status: Downloaded** | ~2-4 min | Installation in progress |
| **Status: Applied** | ~5-8 min | Installation complete |
| **All Pods Running** | ~5-8 min | All services operational |

**Total Time: 5-8 minutes**

### **📋 Real Installation Log Example:**

```bash
# Helm install completes quickly
helm install devtron devtron/devtron-operator --create-namespace --namespace devtroncd --set installer.modules={cicd}
# STATUS: deployed (takes ~1 minute)

# Wait for installation to complete
kubectl -n devtroncd get installers installer-devtron -o jsonpath='{.status.sync.status}'
# Downloaded → Applied (takes ~4-5 minutes total)

# All pods running and ready
kubectl get pods -n devtroncd
# All pods show Running status with age ~5 minutes
```

> **🚀 Why So Fast Now?** Recent Devtron versions have optimized EKS deployments, eliminating previous bottlenecks in CRD installation, service mesh setup, and PostgreSQL initialization.
