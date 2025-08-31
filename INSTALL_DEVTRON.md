# Installing Devtron on EKS

Manual installation guide for Devtron with CI/CD on an EKS cluster.

> **Note**: Devtron installation is now a manual process. The CDK deployment creates only the EKS cluster infrastructure.

## Prerequisites

Before installing Devtron, ensure you have:

1. **EKS Cluster**: Deployed via CDK (see README.md for deployment instructions)
2. **Cluster Connection**: Run `npm run connect-cluster` to connect to your EKS cluster
3. **kubectl**: Configured and connected to your cluster
4. **Helm**: Version 3.x installed

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

After Devtron installation, the service selector needs to be corrected:

```bash
# Fix the service selector to point to the correct pods
kubectl patch svc devtron-service -n devtroncd --type merge -p '{"spec":{"selector":{"app":"dashboard"}}}'
```

**Or use the npm script:**
```bash
npm run fix-devtron-service
```

**⏱️ Estimated time: 1-2 minutes**

**What this fixes:**
- **Service Selector**: Changes from `app=devtron` to `app=dashboard` (correct pod selector)

## Useful Commands

```bash
npm run status                    # Check cluster status
npm run devtron-status           # Get Devtron admin password
npm run fix-devtron-service     # Fix service selector configuration
npm run cost-analysis           # Cost analysis

# Port forwarding (run in separate terminal)
kubectl port-forward svc/devtron-service -n devtroncd 8080:80
```

## Basic Troubleshooting

- **Slow installation:** Wait 15-20 minutes, it's normal
- **Not accessible:** Run `npm run fix-devtron-service` to fix service configuration
- **Port forwarding not working:** Ensure `kubectl port-forward` is running and try different local ports
- **Service selector issue:** Run `npm run fix-devtron-service` to fix pod selector
- **Error logs:** `kubectl logs -f -l app=inception -n devtroncd`
- **Check service configuration:** `kubectl describe svc devtron-service -n devtroncd`

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
5. **Fix service configuration**: Run `npm run fix-devtron-service` if needed
6. **Verify installation**: Run `npm run devtron-status` to check Devtron status

## Resources

- 📖 [Complete Devtron Documentation](https://docs.devtron.ai/)
- 🏠 [README.md](README.md) - Project start and configuration
- 🔧 [INSTALL_KUBERNETES.md](INSTALL_KUBERNETES.md) - To install kubectl/Helm
