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

### ⚠️ Important: LoadBalancer Internet-Facing

If you cannot access from the internet, configure the LoadBalancer:

```bash
npm run fix-lb-public
```

**⏱️ Estimated time: 3-7 minutes** (wait for AWS to recreate the LoadBalancer)

## Useful Commands

```bash
npm run status
npm run devtron-status
npm run verify-lb
npm run cost-analysis
```

## Basic Troubleshooting

- **Slow installation:** Wait 15-20 minutes, it's normal
- **Not accessible:** Run `npm run fix-lb-public` and wait 3-7 minutes
- **Error logs:** `kubectl logs -f -l app=inception -n devtroncd`

## Resources

- 📖 [Complete Devtron Documentation](https://docs.devtron.ai/)
- 🏠 [README.md](README.md) - Project start and configuration
- 🔧 [INSTALL_KUBERNETES.md](INSTALL_KUBERNETES.md) - To install kubectl/Helm
