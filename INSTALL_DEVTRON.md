# Installing Devtron on EKS

Manual installation guide for Devtron with CI/CD on an EKS cluster.

> **Note**: Devtron installation is now a manual process. The CDK deployment creates only the EKS cluster infrastructure.
>
> **Why separate?** This approach avoids CDK timeout limitations (15min max per Helm operation) and complex dependency management. Devtron's multi-stage installation (operator → CRDs → PostgreSQL → services) requires careful sequencing that CDK struggles to handle reliably. The separation ensures predictable deployments and easier troubleshooting. See [README.md](README.md#why-is-devtron-installation-separate) for detailed technical explanation.

## Prerequisites

Before installing Devtron, ensure you have:

1. **EKS Cluster**: Deployed via CDK (see [README.md](README.md#quick-start-5-minutes-setup) for deployment instructions)
2. **Cluster Connection**: Run `aws eks update-kubeconfig --region us-east-1 --name devtron-dev-cluster --profile AWS_PROFILE` to connect to your EKS cluster
3. **kubectl**: Configured and connected to your cluster
4. **Helm**: Version 3.8+ installed

## Essential Information

- **Version**: Latest stable Devtron with CI/CD module
- **Namespace**: `devtroncd`
- **Total time**: **⏱️ ~20-50 minutes** (varies by AWS region and capacity)
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

**⏱️ ⚡ Estimated time: 1-8 minutes** (can be as fast as 1 minute if components are cached)

## Step 3: Wait for Complete Installation

```bash
kubectl -n devtroncd get installers installer-devtron \
  -o jsonpath='{.status.sync.status}'
```

**States:**
- `Downloaded` → Installation in progress (may take 1-45 min depending on cluster state)
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

**⏱️ 🕐 Estimated time: 20-50 minutes**

> **🚨 CRITICAL WARNING**: This step can take **20-50 minutes**! Don't panic if you see pods restarting or failing - it's completely normal. The installation time varies significantly based on AWS region, cluster capacity, and network conditions. PostgreSQL initialization (336+ migrations) and PVC provisioning are the most time-consuming steps.

### 📋 Installation Process Timeline

1. **🚀 0-5 min**: Helm chart deployment and CRDs creation
2. **⏳ 5-15 min**: PostgreSQL StatefulSet creation and PVC provisioning (pods may show as Pending)
3. **⏳ 15-30 min**: PostgreSQL initialization and 336+ database migrations
4. **⏳ 30-45 min**: Devtron services start and stabilize (may show CrashLoopBackOff initially)
5. **✅ 45+ min**: All services running and LoadBalancer ready

**Monitor progress with:**
```bash
kubectl get pods -n devtroncd -w
```

## Step 4: Configure Access and Get Credentials

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

**Additional fixes (if needed):**

**Fix service targetPort (if port-forwarding fails with "does not have a named port")**
```bash
kubectl patch svc devtron-service -n devtroncd --type merge -p '{"spec":{"ports":[{"name":"devtron","port":80,"targetPort":8080}]}}'
```

> **🔧 Port Forwarding Issue**: If you get "does not have a named port 'devtron'" error, it's because the service uses a named port but the pod only has numeric ports. The patch above fixes this by changing `targetPort: devtron` to `targetPort: 8080`.

**🔧 Static Assets 404 Errors**: If you see 404 errors for JavaScript/CSS files (like `env-config.js`, `@vendor-DjxZIeJD.css`, `index-DdfPrgXS.js`), this is due to nginx path mapping issues. The dashboard HTML references files with `/dashboard/` prefix but nginx needs proper rewrite rules. Apply the nginx ConfigMap fix above to resolve this.

**🔧 Browser Console Errors (Normal)**: Devtron includes a WidgetBot chat widget that may show console errors. These are **normal** and don't affect functionality:
- `"Orphaned iframed"` - WidgetBot iframe initialization (safe to ignore)
- `WebSocket connection to 'wss://stonks.widgetbot.io/api/graphql' failed` - WidgetBot trying to connect to Discord (safe to ignore)
- `[mobx] Encountered an uncaught exception` - React/MobX state management (usually harmless)
- `Manifest: Line: 1, column: 1, Syntax error` - Fixed by correcting nginx MIME types above
- `Content is cached for offline use` - Service Worker confirmation (normal)

**Fix nginx configuration for static assets (if 404 errors for JS/CSS files)**
```bash
# Create ConfigMap with corrected nginx config
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: dashboard-nginx-config
  namespace: devtroncd
data:
  default.conf: |
    server {
      listen 8080;
      listen [::]:8080;
      root /usr/share/nginx/html;
      index index.html index.htm;

      # Handle /dashboard/ paths by rewriting to root
      location /dashboard/ {
        rewrite ^/dashboard/(.*)$ /$1 break;
      }

      location / {
        set \$fallback_file /index.html;
        set \$cache_control_header "max-age=3600";

        # add the caching header for assets file and fallback to 404
        if (\$uri ~* \.(js|js\.map|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json)$) {
          set \$cache_control_header "public, max-age=31536000, immutable";
          set \$fallback_file =404;
        }

        if (\$uri ~* "\/(service-worker|env-config)\.js$") {
            set \$cache_control_header "no-cache";
        }

        add_header Cache-Control \$cache_control_header;
        try_files \$uri \$uri/ \$fallback_file =404;
      }

      location /health {
        try_files \$uri \$uri/ /health.html =404;
      }
    }
EOF

# Update deployment to use new config
kubectl patch deployment dashboard -n devtroncd --type json -p '[
  {
    "op": "replace",
    "path": "/spec/template/spec/containers/0/volumeMounts",
    "value": [{"name": "nginx-config", "mountPath": "/etc/nginx/conf.d/default.conf", "subPath": "default.conf"}]
  },
  {
    "op": "replace",
    "path": "/spec/template/spec/volumes",
    "value": [{"name": "nginx-config", "configMap": {"name": "dashboard-nginx-config"}}]
  }
]'
```

## Useful Commands

```bash
# Check cluster status
kubectl cluster-info && kubectl get nodes

# Get Devtron admin password
kubectl -n devtroncd get secret devtron-secret -o jsonpath='{.data.ADMIN_PASSWORD}' | base64 -d

# Fix service selector configuration
kubectl patch svc devtron-service -n devtroncd --type merge -p '{"spec":{"selector":{"app":"dashboard"}}}'

# Cost analysis
kubectl top nodes && echo "EKS: ~$70/month + nodes"

# Port forwarding (run in separate terminal)
kubectl port-forward svc/devtron-service -n devtroncd 8080:80
```

## Basic Troubleshooting

### Normal Installation States (Don't Panic!)

During installation, you may see these states which are **completely normal**:

- **Pods in CrashLoopBackOff**: Services like `devtron`, `kubelink`, `kubewatch`, `lens` may restart multiple times while waiting for dependencies
- **Pods in Pending**: `postgresql-postgresql-0`, `devtron-nats-0`, `git-sensor-0` wait for PersistentVolumeClaims to be provisioned
- **Migration pods failing**: `postgresql-migrate-*` pods may show failures but will complete successfully
- **Pods restarting**: All services restart 2-3 times as dependencies become available

### Common Web UI Issues After Installation

If you can access Devtron but see errors in the browser console:

- **"Unexpected number" syntax errors**: Usually caused by corrupted JavaScript files. The automatic nginx fixes should resolve this
- **404 errors for assets**: Indicates nginx path mapping issues. The `/dashboard/` rewrite rules should fix this
- **MIME type errors**: Files served as "text/html" instead of JavaScript. The nginx configuration includes proper MIME type headers

### Common Issues and Solutions:

- **Slow installation:** **⏳ Wait 20-50 minutes**, it's normal for PostgreSQL initialization (336+ migrations), PVC provisioning, and service mesh setup
- **Stuck in 'Downloaded' state:** Check pod status with `kubectl get pods -n devtroncd -w`
- **Pods in CrashLoopBackOff:** This is normal during initialization - services restart as dependencies become available
- **Migration pods failing:** These will complete successfully despite initial failures
- **PostgreSQL migration process:** Devtron runs 336+ database migrations. Migration pods may fail initially if PostgreSQL isn't ready, but they retry automatically and complete successfully
- **Not accessible:** Run `kubectl patch svc devtron-service -n devtroncd --type merge -p '{"spec":{"selector":{"app":"dashboard"}}}'` to fix service selector configuration
- **Port forwarding not working:** Ensure `kubectl port-forward` is running and try different local ports
- **Service selector issue:** Run `kubectl patch svc devtron-service -n devtroncd --type merge -p '{"spec":{"selector":{"app":"dashboard"}}}'` to fix pod selector mismatch
- **Port forwarding disconnects with "sandbox not found":** This is a common EKS/Kubernetes issue. Simply restart port forwarding: `kubectl port-forward svc/devtron-service -n devtroncd 8080:80`
- **Port forwarding fails with "does not have a named port 'devtron'":** Service uses named port but pod only has numeric ports. Run the targetPort fix above before port forwarding
- **404 errors for JavaScript/CSS files after port-forwarding works:** Nginx configuration issue with `/dashboard/` path mapping. Apply the nginx ConfigMap fix above and restart the dashboard pod
- **Browser console shows WidgetBot/WebSocket errors:** These are **normal** - Devtron includes a chat widget that connects to Discord. Errors like "Orphaned iframed" or WebSocket failures are harmless and don't affect functionality
- **404 errors for JavaScript/CSS files or "Unexpected number" syntax errors:** This indicates nginx configuration issues. The automatic fixes above should resolve this, but if problems persist, the files may need manual correction

> **🔧 Important**: The service selector issue (`app=devtron` vs `app=dashboard`) is **NOT related to core installation** - it's a known Helm chart configuration issue that affects the LoadBalancer routing. Always run the service selector fix after installation completes.

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

# Check ingress/load balancer status
kubectl get ingress -n devtroncd
```

### Quick Health Check:

```bash
# Check cluster status
kubectl cluster-info && kubectl get nodes

# Get Devtron installation status
kubectl get svc -n devtroncd devtron-service && kubectl get pods -n devtroncd

# Check cluster resources
kubectl top nodes
kubectl top pods -n devtroncd
```

## Step 5: Access Devtron Dashboard

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

### Background Port Forwarding (Optional)

If you want to run port forwarding in the background:

```bash
# Run in background
kubectl port-forward svc/devtron-service -n devtroncd 8080:80 &

# Check if it's running
ps aux | grep "kubectl port-forward"

# Stop background process (replace PID with actual process ID)
kill <PID>
```

### Troubleshooting Access Issues

If you cannot access Devtron:

1. **Check port forwarding**: Ensure the `kubectl port-forward` command is still running
2. **Try different port**: If 8080 is busy, use another port like `kubectl port-forward svc/devtron-service -n devtroncd 3000:80`
3. **Verify service status**: Run `kubectl get svc devtron-service -n devtroncd`
4. **Check pod status**: Run `kubectl get pods -n devtroncd`
5. **Fix service configuration**: Run `kubectl patch svc devtron-service -n devtroncd --type merge -p '{"spec":{"selector":{"app":"dashboard"}}}'` if needed
6. **Verify installation**: Run `kubectl get svc -n devtroncd devtron-service && kubectl get pods -n devtroncd` to check Devtron status

## Resources

- 📖 [Complete Devtron Documentation](https://docs.devtron.ai/)
- 🏠 [README.md](README.md) - Project start and configuration
- 🔧 [INSTALL_KUBERNETES.md](INSTALL_KUBERNETES.md) - To install kubectl/Helm

## Version Compatibility

- **Kubernetes**: Compatible with EKS 1.30+ (tested with 1.32)
- **Helm**: Requires Helm 3.8+
- **Devtron**: Latest stable version (automatically pulled from Helm repo)
- **AWS Region**: All regions supported for EKS cluster deployment

> **Note**: This guide is optimized for EKS 1.32 (current project default). Devtron generally supports Kubernetes versions 1.24+, but some features may require newer versions.

## ⏱️ Installation Timeline Summary

| Step | Duration | What Happens |
|------|----------|-------------|
| **Step 1** | 🚀 1-2 min | Connect to EKS cluster |
| **Step 2** | ⚡ 1-8 min | Install Devtron via Helm |
| **Step 3** | 🕐 **20-50 min** | Wait for complete installation |
| **Step 4** | 🚀 1-2 min | Configure access and get credentials |
| **Step 5** | ✅ Immediate | Access Devtron dashboard |

> **💡 Pro Tip**: The longest wait is **Step 3** - use `kubectl get pods -n devtroncd -w` to monitor progress!

## 🗑️ **Devtron On-Demand Removal**

If you need to completely remove Devtron from your cluster at any time, you have several options:

### Quick Removal Commands (Recommended)

Use the npm scripts for a clean and automated removal:

```bash
# Complete cleanup of Devtron
npm run cleanup-devtron

# Force cleanup (useful if resources are stuck)
npm run cleanup-devtron-force

# Preview what will be deleted (dry run)
npm run cleanup-devtron-dry-run

# Clean only Persistent Volumes Claims
npm run cleanup-devtron-pvcs
```

### Manual Removal Steps

If you prefer to do it manually or need more control:

#### Step 1: Uninstall Helm Release
```bash
# Remove the Helm release
helm uninstall devtron -n devtroncd --ignore-not-found=true
```

#### Step 2: Remove Namespaces
```bash
# Remove main Devtron namespace
kubectl delete namespace devtroncd --ignore-not-found=true

# Remove related namespaces (if they exist)
kubectl delete namespace devtron-cd --ignore-not-found=true
kubectl delete namespace devtron-ci --ignore-not-found=true
kubectl delete namespace devtron-demo --ignore-not-found=true
```

#### Step 3: Clean Up Persistent Volumes (Optional)
```bash
# Check for remaining PVCs
kubectl get pvc -A | grep -i devtron

# Delete PVCs if needed
kubectl delete pvc -n devtroncd --all

# Check for PVs
kubectl get pv | grep -i devtron
```

#### Step 4: Verify Cleanup
```bash
# Verify no Devtron resources remain
kubectl get namespaces | grep -i devtron || echo "✅ No Devtron namespaces found"
kubectl get pods -A | grep -i devtron || echo "✅ No Devtron pods found"
kubectl get svc -A | grep -i devtron || echo "✅ No Devtron services found"
helm list -A | grep -i devtron || echo "✅ No Devtron Helm releases found"
```

### ⚠️ **Important Notes**

- **Data Loss**: Removing Devtron will delete all your applications, pipelines, and configurations
- **Backup First**: Consider backing up important data before removal
- **PVC Cleanup**: Persistent Volumes Claims may need manual cleanup if they persist
- **LoadBalancer**: The AWS LoadBalancer created by Devtron may take a few minutes to be fully removed
- **Cost Optimization**: Removing Devtron will reduce your AWS costs

### Force Removal (If Normal Cleanup Fails)

If the standard cleanup gets stuck, use force removal:

```bash
# Force delete namespace (use with caution)
kubectl delete namespace devtroncd --ignore-not-found=true --timeout=30s --grace-period=0 --force
kubectl delete namespace devtron-cd --ignore-not-found=true --timeout=30s --grace-period=0 --force
kubectl delete namespace devtron-ci --ignore-not-found=true --timeout=30s --grace-period=0 --force
kubectl delete namespace devtron-demo --ignore-not-found=true --timeout=30s --grace-period=0 --force
```

### 💡 **Reinstallation After Cleanup**

After cleanup, you can reinstall Devtron by following the installation steps again:

```bash
# Reinstall Devtron
helm repo add devtron https://helm.devtron.ai
helm repo update devtron
helm install devtron devtron/devtron-operator \
  --create-namespace \
  --namespace devtroncd \
  --set installer.modules={cicd}
```

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify your EKS cluster is healthy with `kubectl cluster-info && kubectl get nodes`
3. Review Devtron operator logs: `kubectl logs -f -l app=devtron -n devtroncd`
4. Check the [Devtron community forums](https://github.com/devtron-labs/devtron/discussions) for similar issues
