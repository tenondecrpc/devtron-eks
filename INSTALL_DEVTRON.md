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
- **Total time**: ~20-50 minutes (varies by AWS region and capacity)
- **Documentation**: [https://docs.devtron.ai/install/install-devtron-with-cicd](https://docs.devtron.ai/install/install-devtron-with-cicd)
- **Helm Version Required**: 3.8+

## Step 1: Connect to EKS Cluster

```bash
aws eks update-kubeconfig --region us-east-1 --name devtron-dev-cluster --profile AWS_PROFILE
kubectl cluster-info && kubectl get nodes
```

**⏱️ Estimated time: 1-2 minutes**

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

Once Devtron shows `Applied` status, configure access:

```bash
# Get the LoadBalancer hostname (for external access)
kubectl get svc -n devtroncd devtron-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'

# Get admin password
kubectl -n devtroncd get secret devtron-secret -o jsonpath='{.data.ADMIN_PASSWORD}' | base64 -d
```

**Credentials:**
- **Username:** `admin`
- **Password:** [output from the command above]
- **URL:** `http://<loadbalancer-hostname>` (external) or `http://localhost:8080` (with port forwarding)

### ⚠️ Important: Fix Devtron Service Configuration

After Devtron installation, the service selector needs to be corrected:

```bash
# Fix the service selector to point to the correct pods
kubectl patch svc devtron-service -n devtroncd --type merge -p '{"spec":{"selector":{"app":"dashboard"}}}'
```

**Or run the command directly:**
```bash
kubectl patch svc devtron-service -n devtroncd --type merge -p '{"spec":{"selector":{"app":"dashboard"}}}'
```

**⏱️ Estimated time: 1-2 minutes**

**What this fixes:**
- **Service Selector**: Changes from `app=devtron` to `app=dashboard` (correct pod selector)

## Useful Commands

```bash
kubectl cluster-info && kubectl get nodes                    # Check cluster status
kubectl get svc -n devtroncd devtron-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' && kubectl -n devtroncd get secret devtron-secret -o jsonpath='{.data.ADMIN_PASSWORD}' | base64 -d          # Get Devtron admin password
kubectl patch svc devtron-service -n devtroncd --type merge -p '{"spec":{"selector":{"app":"dashboard"}}}'    # Fix service selector configuration
kubectl top nodes && echo "EKS: ~$70/month + nodes"          # Cost analysis

# Port forwarding (run in separate terminal)
kubectl port-forward svc/devtron-service -n devtroncd 8080:80
```

## Basic Troubleshooting

### Common Issues and Solutions:

- **Slow installation:** Wait 15-20 minutes, it's normal for PostgreSQL initialization and service mesh setup
- **Stuck in 'Downloaded' state:** Check pod status with `kubectl get pods -n devtroncd -w`
- **Not accessible:** Run `kubectl patch svc devtron-service -n devtroncd --type merge -p '{"spec":{"selector":{"app":"dashboard"}}}'` to fix service selector configuration
- **Port forwarding not working:** Ensure `kubectl port-forward` is running and try different local ports
- **Service selector issue:** Run `kubectl patch svc devtron-service -n devtroncd --type merge -p '{"spec":{"selector":{"app":"dashboard"}}}'` to fix pod selector mismatch

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

**Or get both URL and password:**
```bash
kubectl get svc -n devtroncd devtron-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' && kubectl -n devtroncd get secret devtron-secret -o jsonpath='{.data.ADMIN_PASSWORD}' | base64 -d
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
- **AWS Region**: All regions supported, but LoadBalancer provisioning may vary by region capacity

> **Note**: This guide is optimized for EKS 1.32 (current project default). Devtron generally supports Kubernetes versions 1.24+, but some features may require newer versions.

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify your EKS cluster is healthy with `kubectl cluster-info && kubectl get nodes`
3. Review Devtron operator logs: `kubectl logs -f -l app=devtron -n devtroncd`
4. Check the [Devtron community forums](https://github.com/devtron-labs/devtron/discussions) for similar issues
