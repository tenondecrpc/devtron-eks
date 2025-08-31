# Installing Devtron on EKS

Manual installation guide for Devtron with CI/CD on an EKS cluster.

> **Note**: Devtron installation is now a manual process. The CDK deployment creates only the EKS cluster infrastructure.

## Prerequisites

Before installing Devtron, ensure you have:

1. **EKS Cluster**: Deployed via CDK (see [README.md](README.md#quick-start-5-minutes-setup) for deployment instructions)
2. **Cluster Connection**: Run `aws eks update-kubeconfig --region us-east-1 --name devtron-dev-cluster --profile AWS_PROFILE` to connect to your EKS cluster
3. **kubectl**: Configured and connected to your cluster
4. **Helm**: Version 3.8+ installed

## Essential Information

- **Version**: Latest stable Devtron with CI/CD module
- **Namespace**: `devtroncd`
- **Total time**: **⏱️ ~10-20 minutes** (varies by AWS region and capacity)
- **Documentation**: [https://docs.devtron.ai/install/install-devtron-with-cicd](https://docs.devtron.ai/install/install-devtron-with-cicd)
- **Helm Version Required**: 3.8+

## Step 1: Connect to EKS Cluster

```bash
# Connect kubectl to your EKS cluster
aws eks update-kubeconfig --region us-east-1 --name devtron-dev-cluster --profile AWS_PROFILE

# Verify cluster connection and status
kubectl cluster-info && kubectl get nodes
```

**⏱️ 🚀 Estimated time: 1-2 minutes**

## Step 2: Create Required Namespaces

```bash
# Create all required namespaces for Devtron
kubectl create namespace devtroncd --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace devtron-cd --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace devtron-ci --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace devtron-demo --dry-run=client -o yaml | kubectl apply -f -

# Verify namespaces created
kubectl get namespaces | grep devtron
```

**⏱️ ⚡ Estimated time: 1 minute**

## Step 3: Install Devtron (Standard Installation)

```bash
# Verify Helm version (should be 3.8+)
helm version --short

# Add Devtron Helm repository
helm repo add devtron https://helm.devtron.ai
helm repo update devtron

# Install Devtron with CI/CD module (STANDARD INSTALLATION)
helm install devtron devtron/devtron-operator \
  --create-namespace \
  --namespace devtroncd \
  --set installer.modules={cicd}
```

**⏱️ ⚡ Estimated time: 1-8 minutes** (can be as fast as 1 minute if components are cached)

> **🎯 IMPORTANT**: This is the **PRIMARY installation method**. Use this standard installation first. Only proceed to the alternative methods if you encounter issues.

## Step 4: Wait for Complete Installation

```bash
kubectl -n devtroncd get installers installer-devtron \
  -o jsonpath='{.status.sync.status}'
```

**States:**
- `Downloaded` → Installation in progress (may take 1-15 min depending on cluster state)
- `Applied` → ✅ Completed
- `OutOfSync` → ❌ Error (check logs)

> **⚡ Note**: If installation completes in ~1 minute and shows "Applied", Devtron components may already be cached/installed. This is normal and indicates a successful deployment.

**Additional verification:**
```bash
# Check Devtron pods status
kubectl get pods -n devtroncd

# Check Devtron services status
kubectl get svc -n devtroncd
```

**⏱️ 🕐 Estimated time: 10-20 minutes**

> **🚨 CRITICAL WARNING**: This step can take **10-20 minutes**! Don't panic if you see pods restarting or failing - it's completely normal. The installation time varies significantly based on AWS region, cluster capacity, and network conditions.

### 📋 Installation Process Timeline

1. **🚀 0-5 min**: Helm chart deployment and CRDs creation
2. **⏳ 5-10 min**: PostgreSQL StatefulSet creation and PVC provisioning (pods may show as Pending)
3. **⏳ 10-15 min**: PostgreSQL initialization and database migrations
4. **⏳ 15-20 min**: Devtron services start and stabilize (may show CrashLoopBackOff initially)
5. **✅ 20+ min**: All services running and ready

**Monitor progress with:**
```bash
kubectl get pods -n devtroncd -w
```

## Step 5: Configure Access and Get Credentials

Once Devtron shows `Applied` status, configure access:

```bash
# Get admin password
kubectl -n devtroncd get secret devtron-secret -o jsonpath='{.data.ADMIN_PASSWORD}' | base64 -d
```

**Credentials:**
- **Username:** `admin`
- **Password:** [output from the command above]
- **URL:** `http://localhost:8080` (with port forwarding)

### ⚠️ Important: Fix Devtron Service Configuration

After Devtron installation, the service selector needs to be corrected:

```bash
# Fix the service selector to point to the correct pods
kubectl patch svc devtron-service -n devtroncd --type merge -p '{"spec":{"selector":{"app":"dashboard"}}}'
```

**⏱️ 🚀 Estimated time: 1-2 minutes**

**What this fixes:**
- **Service Selector**: Changes from `app=devtron` to `app=dashboard` (correct pod selector)

## 🔧 **Alternative: Backup Installation Method**

> **⚠️ USE ONLY IF STANDARD INSTALLATION FAILS**
>
> If the standard installation above encounters issues, you can use the backup method with pre-configured resources.

### When to Use This Alternative

- ❌ **Standard installation fails** with timeout or errors
- ❌ **PostgreSQL initialization issues** persist after retries
- ❌ **Service mesh setup problems** that don't resolve
- ❌ **LoadBalancer configuration issues** that prevent access

### Backup Method Details

For detailed instructions on using the backup installation method, see:
**[📚 devtron-manifests/README.md](devtron-manifests/README.md)**

This README contains:
- Pre-configured Helm values optimized for EKS
- CRDs and Service Accounts ready to apply
- Nginx configuration fixes for common issues
- Step-by-step backup installation process

## 🔧 **Advanced Configuration (BACKUP METHOD)**

> **⚠️ USE ONLY IF STANDARD INSTALLATION FAILS**
>
> For detailed instructions on applying pre-configured resources, see:
> **[📚 devtron-manifests/README.md](devtron-manifests/README.md)**

### What's Available

The backup method includes:
- **Pre-configured CRDs** and Service Accounts
- **Optimized Helm values** for EKS
- **Nginx configuration fixes** for static asset issues
- **Automated application script** for easy setup

### Quick Reference

```bash
# Apply all backup configurations
cd devtron-manifests
./apply-configs.sh
```

> **💡 Note**: All backup method details are documented in the `devtron-manifests/README.md` file.

## Step 6: Access Devtron Dashboard

Once Devtron is installed and running, access it using port forwarding:

### Start Port Forwarding

```bash
# Forward local port 8080 to Devtron service port 80
kubectl port-forward svc/devtron-service -n devtroncd 8080:80
```

### Get Admin Credentials

```bash
# Get admin password
kubectl -n devtroncd get secret devtron-secret -o jsonpath='{.data.ADMIN_PASSWORD}' | base64 -d
```

**Note:** Use port forwarding to access Devtron at `http://localhost:8080`

### Access Devtron

**Open your browser and go to:**
```
http://localhost:8080
```

### Login Information

- **URL**: `http://localhost:8080`
- **Username**: `admin`
- **Password**: [obtained from the command above]

### Port Forwarding Notes

**Important:** Keep the port forwarding command running in a terminal window. The connection will remain active as long as the command is running.

**To stop port forwarding:** Press `Ctrl+C` in the terminal where it's running.

**⏱️ Access is immediate** - No waiting time required!

## Useful Commands

```bash
# Check cluster status
kubectl cluster-info && kubectl get nodes

# Get Devtron admin password
kubectl -n devtroncd get secret devtron-secret -o jsonpath='{.data.ADMIN_PASSWORD}' | base64 -d

# Fix service selector configuration
kubectl patch svc devtron-service -n devtroncd --type merge -p '{"spec":{"selector":{"app":"dashboard"}}}'

# Port forwarding (run in separate terminal)
kubectl port-forward svc/devtron-service -n devtroncd 8080:80

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

## Basic Troubleshooting

### 🚨 **When to Use Backup Methods**

**If you encounter these issues, consider using the backup methods:**

- ❌ **Standard installation fails** completely
- ❌ **CRD or Service Account issues** prevent startup
- ❌ **Static asset 404 errors** persist

**For detailed backup method instructions, see:**
**[📚 devtron-manifests/README.md](devtron-manifests/README.md)**

### Normal Installation States (Don't Panic!)

During installation, you may see these states which are **completely normal**:

- **Pods in CrashLoopBackOff**: Services like `devtron`, `kubelink`, `kubewatch`, `lens` may restart multiple times while waiting for dependencies
- **Pods in Pending**: `postgresql-postgresql-0`, `devtron-nats-0`, `git-sensor-0` wait for PersistentVolumeClaims to be provisioned
- **Migration pods failing**: `postgresql-migrate-*` pods may show failures but will complete successfully
- **Pods restarting**: All services restart 2-3 times as dependencies become available

### Common Issues and Solutions:

- **Slow installation:** **⏳ Wait 10-20 minutes**, it's normal for PostgreSQL initialization, PVC provisioning, and service mesh setup
- **Stuck in 'Downloaded' state:** Check pod status with `kubectl get pods -n devtroncd -w`
- **Pods in CrashLoopBackOff:** This is normal during initialization - services restart as dependencies become available
- **Migration pods failing:** These will complete successfully despite initial failures
- **Not accessible:** Run `kubectl patch svc devtron-service -n devtroncd --type merge -p '{"spec":{"selector":{"app":"dashboard"}}}'` to fix service selector configuration
- **Port forwarding not working:** Ensure `kubectl port-forward` is running and try different local ports

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

## 🎯 **Installation Strategy Summary**

### **Primary Approach (Recommended)**
1. **Use standard Helm installation** with default values
2. **Apply critical fixes** (service selector, port forwarding)
3. **Monitor installation progress** and wait for completion

### **Backup Approach (Use Only If Primary Fails)**
1. **Use backup installation method** with pre-configured resources
2. **Apply fixes automatically** using the provided scripts
3. **Follow detailed instructions** in `devtron-manifests/README.md`

### **Critical Practices (Always Apply)**
- ✅ **Service selector fix** after installation
- ✅ **Port forwarding** for dashboard access
- ✅ **Proper namespace creation** before installation

> **💡 Remember**: Start with the standard installation. The backup methods are there to help when you encounter specific issues, not as a replacement for the primary approach.

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
| **Step 2** | ⚡ 1 min | Create required namespaces |
| **Step 3** | ⚡ 1-8 min | Install Devtron via Helm |
| **Step 4** | 🕐 **10-20 min** | Wait for complete installation |
| **Step 5** | 🚀 1-2 min | Configure access and get credentials |
| **Step 6** | ✅ Immediate | Access Devtron dashboard |

> **💡 Pro Tip**: The longest wait is **Step 4** - use `kubectl get pods -n devtroncd -w` to monitor progress!
