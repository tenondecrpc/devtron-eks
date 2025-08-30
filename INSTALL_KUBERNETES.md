# Kubernetes and Helm Installation Guide

This guide provides detailed instructions for installing Kubernetes (kubectl) and Helm on different operating systems.

## Prerequisites

- Stable internet connection
- Administrator/sudo permissions
- Sufficient disk space (~2GB)

## Installation on macOS

### Option 1: Using Homebrew (Recommended)

```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install kubectl
brew install helm

kubectl version --client
helm version
```

### Option 2: Manual Installation

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/darwin/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Install Helm (latest version)
curl https://get.helm.sh/helm-v3.15.4-darwin-amd64.tar.gz -o helm.tar.gz
tar -zxvf helm.tar.gz
sudo mv darwin-amd64/helm /usr/local/bin/helm
rm -rf darwin-amd64 helm.tar.gz

# Verify installations
kubectl version --client
helm version
```

## Installation on Linux

### Ubuntu/Debian

```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Install curl if not installed
sudo apt install -y curl

curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

curl https://baltocdn.com/helm/signing.asc | gpg --dearmor | sudo tee /usr/share/keyrings/helm.gpg > /dev/null
sudo apt-get install apt-transport-https --yes
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/helm.gpg] https://baltocdn.com/helm/stable/debian/ all main" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list
sudo apt-get update
sudo apt-get install helm

kubectl version --client
helm version
```

### CentOS/RHEL/Fedora

```bash
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

curl https://get.helm.sh/helm-v3.15.4-linux-amd64.tar.gz -o helm.tar.gz
tar -zxvf helm.tar.gz
sudo mv linux-amd64/helm /usr/local/bin/helm
rm -rf linux-amd64 helm.tar.gz

kubectl version --client
helm version
```

## Installation on Windows

### Option 1: Using Chocolatey (Recommended)

```powershell
# Install Chocolatey if you don't have it
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

choco install kubernetes-cli
choco install kubernetes-helm

kubectl version --client
helm version
```

### Option 2: Using winget

```powershell
winget install -e --id Kubernetes.kubectl

curl https://get.helm.sh/helm-v3.15.4-windows-amd64.zip -o helm.zip
Expand-Archive helm.zip .
Move-Item windows-amd64\helm.exe C:\Windows\System32\
Remove-Item -Recurse windows-amd64, helm.zip

kubectl version --client
helm version
```

### Option 3: Manual Installation

1. **Download kubectl:**
   - Go to: https://dl.k8s.io/release/v1.32.0/bin/windows/amd64/kubectl.exe
   - Move the file to `C:\Windows\System32\`

2. **Download Helm:**
   - Go to: https://get.helm.sh/helm-v3.15.4-windows-amd64.zip
   - Extract and move `helm.exe` to `C:\Windows\System32\`

3. **Verify installations:**
   ```cmd
   kubectl version --client
   helm version
   ```

## Post-Installation Configuration

### Configure Autocomplete (Optional)

#### Bash (Linux/macOS)
```bash
# kubectl
echo 'source <(kubectl completion bash)' >> ~/.bashrc
source ~/.bashrc

# Helm
echo 'source <(helm completion bash)' >> ~/.bashrc
source ~/.bashrc
```

#### Zsh (macOS/Linux)
```bash
# kubectl
echo 'source <(kubectl completion zsh)' >> ~/.zshrc
source ~/.zshrc

# Helm
echo 'source <(helm completion zsh)' >> ~/.zshrc
source ~/.zshrc
```

#### PowerShell (Windows)
```powershell
# kubectl
kubectl completion powershell >> $PROFILE
.$PROFILE

# Helm
helm completion powershell >> $PROFILE
.$PROFILE
```

## Final Verification

Run these commands to verify everything is working correctly:

```bash
kubectl version --client --output=yaml
helm version --short

kubectl config current-context
helm repo list
```

## Troubleshooting

### Permission Error
If you get permission errors, run commands with `sudo` (Linux/macOS) or as Administrator (Windows).

### kubectl not found
Make sure the directory where you installed kubectl is in your PATH:
- Linux/macOS: `/usr/local/bin`
- Windows: `C:\Windows\System32`

### Network Issues
If you have connectivity problems:
- Check your internet connection
- Some corporate firewalls may block downloads
- Consider using a proxy if necessary

## Next Steps

Once Kubernetes and Helm are installed, you can:
1. Configure a local cluster (Minikube, Kind, etc.)
2. Connect to a remote cluster (EKS, AKS, GKE, etc.)
3. Install applications using Helm charts
4. Start working with Kubernetes

## Additional Resources

- 🏠 **[README.md](README.md)** - Project start and EKS deployment
- 📖 **[INSTALL_DEVTRON.md](INSTALL_DEVTRON.md)** - Install Devtron on your EKS cluster
- [Official Kubernetes Documentation](https://kubernetes.io/docs/)
- [Official Helm Documentation](https://helm.sh/docs/)
- [kubectl Guide](https://kubectl.docs.kubernetes.io/)
- [Helm Hub - Chart Repository](https://hub.helm.sh/)
