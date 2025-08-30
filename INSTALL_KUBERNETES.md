# Guía de Instalación de Kubernetes y Helm

Esta guía proporciona instrucciones detalladas para instalar Kubernetes (kubectl) y Helm en diferentes sistemas operativos.

## Prerrequisitos

- Conexión a internet estable
- Permisos de administrador/sudo
- Espacio en disco suficiente (~2GB)

## Instalación en macOS

### Opción 1: Usando Homebrew (Recomendado)

```bash
# Instalar Homebrew si no lo tienes
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instalar kubectl
brew install kubectl

# Instalar Helm
brew install helm

# Verificar instalaciones
kubectl version --client
helm version
```

### Opción 2: Instalación Manual

```bash
# Instalar kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/darwin/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Instalar Helm
curl https://get.helm.sh/helm-v3.12.0-darwin-amd64.tar.gz -o helm.tar.gz
tar -zxvf helm.tar.gz
sudo mv darwin-amd64/helm /usr/local/bin/helm
rm -rf darwin-amd64 helm.tar.gz

# Verificar instalaciones
kubectl version --client
helm version
```

## Instalación en Linux

### Ubuntu/Debian

```bash
# Actualizar el sistema
sudo apt update && sudo apt upgrade -y

# Instalar curl si no está instalado
sudo apt install -y curl

# Instalar kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Instalar Helm
curl https://baltocdn.com/helm/signing.asc | gpg --dearmor | sudo tee /usr/share/keyrings/helm.gpg > /dev/null
sudo apt-get install apt-transport-https --yes
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/helm.gpg] https://baltocdn.com/helm/stable/debian/ all main" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list
sudo apt-get update
sudo apt-get install helm

# Verificar instalaciones
kubectl version --client
helm version
```

### CentOS/RHEL/Fedora

```bash
# Instalar kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Instalar Helm
curl https://get.helm.sh/helm-v3.12.0-linux-amd64.tar.gz -o helm.tar.gz
tar -zxvf helm.tar.gz
sudo mv linux-amd64/helm /usr/local/bin/helm
rm -rf linux-amd64 helm.tar.gz

# Verificar instalaciones
kubectl version --client
helm version
```

## Instalación en Windows

### Opción 1: Usando Chocolatey (Recomendado)

```powershell
# Instalar Chocolatey si no lo tienes
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

# Instalar kubectl
choco install kubernetes-cli

# Instalar Helm
choco install kubernetes-helm

# Verificar instalaciones
kubectl version --client
helm version
```

### Opción 2: Usando winget

```powershell
# Instalar kubectl
winget install -e --id Kubernetes.kubectl

# Instalar Helm (descargar manualmente)
curl https://get.helm.sh/helm-v3.12.0-windows-amd64.zip -o helm.zip
Expand-Archive helm.zip .
Move-Item windows-amd64\helm.exe C:\Windows\System32\
Remove-Item -Recurse windows-amd64, helm.zip

# Verificar instalaciones
kubectl version --client
helm version
```

### Opción 3: Instalación Manual

1. **Descargar kubectl:**
   - Ve a: https://dl.k8s.io/release/v1.27.0/bin/windows/amd64/kubectl.exe
   - Mueve el archivo a `C:\Windows\System32\`

2. **Descargar Helm:**
   - Ve a: https://get.helm.sh/helm-v3.12.0-windows-amd64.zip
   - Extrae y mueve `helm.exe` a `C:\Windows\System32\`

3. **Verificar instalaciones:**
   ```cmd
   kubectl version --client
   helm version
   ```

## Configuración Post-Instalación

### Configurar Autocompletado (Opcional)

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

## Verificación Final

Ejecuta estos comandos para verificar que todo esté funcionando correctamente:

```bash
# Verificar versiones
kubectl version --client --output=yaml
helm version --short

# Verificar configuración de kubectl
kubectl config current-context

# Verificar repositorios de Helm
helm repo list
```

## Solución de Problemas

### Error de permisos
Si obtienes errores de permisos, ejecuta los comandos con `sudo` (Linux/macOS) o como Administrador (Windows).

### kubectl no encontrado
Asegúrate de que el directorio donde instalaste kubectl esté en tu PATH:
- Linux/macOS: `/usr/local/bin`
- Windows: `C:\Windows\System32`

### Problemas de red
Si tienes problemas de conectividad:
- Verifica tu conexión a internet
- Algunos firewalls corporativos pueden bloquear las descargas
- Considera usar un proxy si es necesario

## Próximos Pasos

Una vez instalado Kubernetes y Helm, puedes:
1. Configurar un cluster local (Minikube, Kind, etc.)
2. Conectarte a un cluster remoto (EKS, AKS, GKE, etc.)
3. Instalar aplicaciones usando Helm charts
4. Comenzar a trabajar con Kubernetes

## Recursos Adicionales

- [Documentación oficial de Kubernetes](https://kubernetes.io/docs/)
- [Documentación oficial de Helm](https://helm.sh/docs/)
- [Guía de kubectl](https://kubectl.docs.kubernetes.io/)
- [Helm Hub - Repositorio de charts](https://hub.helm.sh/)
