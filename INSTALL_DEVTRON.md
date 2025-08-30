# Installing Devtron on EKS

Simplified guide to install Devtron with CI/CD on an EKS cluster.

## Essential Information

- **Version**: Devtron with CI/CD module
- **Namespace**: `devtroncd`
- **Total time**: ~30-45 minutes
- **Documentation**: [https://docs.devtron.ai/install/install-devtron-with-cicd](https://docs.devtron.ai/install/install-devtron-with-cicd)

## Step 1: Connect to EKS Cluster

```bash
npm run connect-cluster
npm run status
```

**⏱️ Estimated time: 1-2 minutes**

## Step 2: Install Devtron

```bash
helm repo add devtron https://helm.devtron.ai
helm repo update devtron

helm install devtron devtron/devtron-operator \
  --create-namespace \
  --namespace devtroncd \
  --set installer.modules={cicd}
```

**⏱️ Estimated time: 3-8 minutes**

## Step 3: Wait for Complete Installation

```bash
kubectl -n devtroncd get installers installer-devtron \
  -o jsonpath='{.status.sync.status}'
```

**States:**
- `Downloaded` → Waiting (normal, wait 10-15 min)
- `Applied` → ✅ Completed
- `OutOfSync` → ❌ Error (check logs)

**Additional verification:**
```bash
kubectl get pods -n devtroncd
kubectl get svc -n devtroncd
```

**⏱️ Estimated time: 10-20 minutes**

## Step 4: Configure Access and Get Credentials

```bash
kubectl get svc -n devtroncd devtron-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'

kubectl -n devtroncd get secret devtron-secret -o jsonpath='{.data.ADMIN_PASSWORD}' | base64 -d
```

**Credentials:**
- **Username:** `admin`
- **Password:** [obtained from the command above]

### ⚠️ Important: Fix Devtron Service Configuration

After Devtron installation, the service needs to be configured correctly for internet access:

```bash
# Fix both the service selector and LoadBalancer annotations
kubectl patch svc devtron-service -n devtroncd --type merge -p '{"spec":{"selector":{"app":"dashboard"}},"metadata":{"annotations":{"service.beta.kubernetes.io/aws-load-balancer-type":"nlb","service.beta.kubernetes.io/aws-load-balancer-scheme":"internet-facing","service.beta.kubernetes.io/aws-load-balancer-nlb-target-type":"ip"}}}'
```

**Or use the npm script:**
```bash
npm run fix-devtron-service
```

**⏱️ Estimated time: 3-7 minutes** (wait for AWS to recreate the LoadBalancer)

**What this fixes:**
- **Service Selector**: Changes from `app=devtron` to `app=dashboard` (correct pod selector)
- **LoadBalancer Type**: Configures NLB (Network Load Balancer)
- **Internet Access**: Enables `internet-facing` scheme
- **Target Type**: Sets to `ip` for better performance

## Useful Commands

```bash
npm run status                    # Check cluster status
npm run devtron-status           # Get Devtron URL and admin password
npm run verify-lb               # Verify LoadBalancer status
npm run fix-devtron-service     # Fix service selector and LoadBalancer config
npm run cost-analysis           # Cost analysis
```

## Basic Troubleshooting

- **Slow installation:** Wait 15-20 minutes, it's normal
- **Not accessible:** Run `npm run fix-devtron-service` and wait 3-7 minutes
- **Service selector issue:** If LoadBalancer shows no endpoints, the service selector needs to be fixed
- **Error logs:** `kubectl logs -f -l app=inception -n devtroncd`
- **Check service configuration:** `kubectl describe svc devtron-service -n devtroncd`

## Step 5: Access Devtron Dashboard

Once the installation is complete and the LoadBalancer is ready, access Devtron:

### Get the Devtron URL

```bash
# Option 1: Get the hostname
kubectl get svc -n devtroncd devtron-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'

# Option 2: Get the complete HTTPS URL
kubectl get svc -n devtroncd devtron-service -o jsonpath='https://{.status.loadBalancer.ingress[0].hostname}'
```

### Get Admin Credentials

```bash
# Get admin password
kubectl -n devtroncd get secret devtron-secret -o jsonpath='{.data.ADMIN_PASSWORD}' | base64 -d
```

### Login Information

- **URL**: [obtained from the command above]
- **Username**: `admin`
- **Password**: [obtained from the command above]

### Verify LoadBalancer Status

```bash
# Check if LoadBalancer is ready
kubectl get svc -n devtroncd devtron-service

# Expected output should show EXTERNAL-IP (hostname) when ready
```

**⏱️ Estimated time for LoadBalancer**: 3-7 minutes after Devtron installation completes

### Troubleshooting Access Issues

If you cannot access the URL:

1. **Wait for LoadBalancer**: The LoadBalancer needs 3-7 minutes to be fully provisioned by AWS
2. **Check LoadBalancer status**: Ensure the EXTERNAL-IP shows a hostname
3. **Fix service configuration**: Run `npm run fix-devtron-service` to fix both selector and LoadBalancer settings
4. **Check service endpoints**: Verify that `kubectl describe svc devtron-service -n devtroncd` shows valid endpoints
5. **Verify installation**: Run `npm run devtron-status` to check Devtron status

## Resources

- 📖 [Complete Devtron Documentation](https://docs.devtron.ai/)
- 🏠 [README.md](README.md) - Project start and configuration
- 🔧 [INSTALL_KUBERNETES.md](INSTALL_KUBERNETES.md) - To install kubectl/Helm
