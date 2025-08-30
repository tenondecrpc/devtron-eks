# 🚀 EKS CDK - Cluster Kubernetes en AWS

Despliega automáticamente un cluster Amazon EKS optimizado con add-ons esenciales usando AWS CDK.

## ✨ Qué hace este proyecto

- **Despliega un cluster EKS** completamente configurado
- **Instala add-ons esenciales** automáticamente (VPC CNI, CoreDNS, kube-proxy, EBS CSI Driver)
- **Crea un Node Group** optimizado con auto-scaling
- **Configura networking** con VPC dedicada
- **Proporciona outputs detallados** para fácil acceso
- **Implementa mejores prácticas** de seguridad y tagging

## 📋 Requisitos previos

### Software necesario:
- **Node.js** 20+
- **AWS CLI v2**
- **AWS CDK CLI**
- **Cuenta AWS** con permisos para EKS, EC2, VPC, y IAM

### Versiones de Kubernetes soportadas:
- **1.33** (Próximamente - ver documentación de AWS `@aws-cdk/aws-eks-v2`)
- **1.32** (Disponible en CDK `@aws-cdk/aws-eks-v2` - usada en el proyecto)
- **1.31** (Soporte estándar)
- **1.30** (Soporte extendido)
- **1.29** (Soporte extendido)

> 📖 Para más información sobre versiones: [AWS EKS Kubernetes Versions](https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html)

### Instalación rápida:

**macOS:**
```bash
brew install node awscli
npm install -g aws-cdk
```

**Linux/Ubuntu:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install
npm install -g aws-cdk
```

**Windows:**
```powershell
choco install nodejs awscli
npm install -g aws-cdk
```

## 🚀 Inicio rápido (5 minutos)

### ⚡ Opción Ultra-Rápida (1 comando)

```bash
# Desplegar cluster EKS completo con add-ons
npm run deploy
```

**¿Qué hace esto?**
- ✅ **CDK Deploy**: Crea cluster EKS con VPC, Node Group y add-ons
- ✅ **Auto-configuración**: Instala todos los add-ons esenciales automáticamente
- ✅ **Outputs**: Muestra todos los comandos y endpoints importantes
- ✅ **Verificación**: Confirma que todo esté funcionando correctamente
- 📋 **Próximo paso**: Sigue [INSTALL_KUBERNETES.md](INSTALL_KUBERNETES.md) e [INSTALL_DEVTRON.md](INSTALL_DEVTRON.md)

> ⚠️ **Importante**: Antes de ejecutar `npm run deploy`, asegúrate de tener configuradas las variables de entorno. Ve a la sección **"Configurar Variables de Entorno"** más abajo.

### 🔄 Opción Paso a Paso (Manual)

### 1. Configurar AWS
```bash
# Configura tu perfil AWS (elige una opción):

# Opción A: Access Keys (simple)
aws configure --profile AWS_PROFILE
# Ingresa tu Access Key ID, Secret Access Key, región us-east-1

# Opción B: SSO (para organizaciones)
aws configure sso --profile AWS_PROFILE
aws sso login --profile AWS_PROFILE
```

### 2. Preparar el proyecto
```bash
# Clona e instala dependencias
npm install

# Configura CDK (solo primera vez)
npx cdk bootstrap --profile AWS_PROFILE

# Compila el proyecto
npm run build
```

### 3. Configurar Variables de Entorno
```bash
# Configura las variables de entorno del proyecto

# Opción A: Variables de entorno temporales
export ENV_NAME=dev
export PROJECT_NAME=devtron
export AWS_ACCOUNT=xxxx81713846
export AWS_REGION=us-east-1

# Opción B: Crear archivo .env (recomendado para desarrollo)
cat > .env << EOF
ENV_NAME=dev
PROJECT_NAME=devtron
AWS_ACCOUNT=xxxx81713846
AWS_REGION=us-east-1
EOF

# Opción C: Cargar desde archivo .env existente
source .env

# Verificar configuración
echo "=== Variables del Proyecto ==="
echo "ENV_NAME: $ENV_NAME"
echo "PROJECT_NAME: $PROJECT_NAME"
echo "AWS_ACCOUNT: $AWS_ACCOUNT"
echo "AWS_REGION: $AWS_REGION"
echo "=============================="
```

**📋 Variables del proyecto:**
- **`ENV_NAME`**: Entorno de despliegue (dev, staging, prod)
- **`PROJECT_NAME`**: Nombre del proyecto (devtron)
- **`AWS_ACCOUNT`**: ID de tu cuenta AWS (xxxx81713846)
- **`AWS_REGION`**: Región donde se desplegará el cluster (us-east-1)

### 4. Desplegar EKS Cluster
```bash
# Desplegar cluster EKS con todos los add-ons
npx cdk deploy --require-approval never --profile AWS_PROFILE
```

### 5. Configurar kubectl
```bash
# Configura kubectl para acceder al cluster
aws eks update-kubeconfig --region us-east-1 --name your-project-name-dev-cluster --profile AWS_PROFILE

# Verificar conexión
kubectl cluster-info
kubectl get nodes
```

### 6. Verificar instalación
```bash
# Ver todos los recursos del cluster
kubectl get all --all-namespaces

# Verificar add-ons
kubectl get pods -n kube-system

# Verificar node groups
kubectl get nodes --label-columns=eks.amazonaws.com/nodegroup
```

### 7. Próximos Pasos
```bash
# Después de tener el cluster listo:
# 1. Instala kubectl y Helm siguiendo [INSTALL_KUBERNETES.md](INSTALL_KUBERNETES.md)
# 2. Instala Devtron siguiendo [INSTALL_DEVTRON.md](INSTALL_DEVTRON.md)
# 3. ¡Comienza a desplegar tus aplicaciones!
```

## 🔧 Solución de problemas comunes

### Problema: "No se puede conectar al cluster"
```bash
# Verifica tu perfil AWS
aws sts get-caller-identity --profile AWS_PROFILE

# Actualiza la configuración de kubectl
aws eks update-kubeconfig --region us-east-1 --name your-project-name-dev-cluster --profile AWS_PROFILE

# Verifica la conexión
kubectl cluster-info
```

### Problema: "Variables de entorno no configuradas"
```bash
# Verifica que las variables estén configuradas
echo "ENV_NAME: $ENV_NAME"
echo "PROJECT_NAME: $PROJECT_NAME"
echo "AWS_ACCOUNT: $AWS_ACCOUNT"
echo "AWS_REGION: $AWS_REGION"

# Si están vacías, configúralas:
export ENV_NAME=dev
export PROJECT_NAME=devtron
export AWS_ACCOUNT=xxxx81713846
export AWS_REGION=us-east-1

# O crea un archivo .env:
cat > .env << EOF
ENV_NAME=dev
PROJECT_NAME=devtron
AWS_ACCOUNT=xxxx81713846
AWS_REGION=us-east-1
EOF
```

### Problema: "Nodes no están Ready"
```bash
# Revisa el estado de los nodes
kubectl get nodes
kubectl describe node <nombre-del-node>

# Verifica el node group
kubectl get nodegroups
```

### Problema: "Add-ons no se instalan"
```bash
# Revisa el estado de los add-ons
aws eks describe-addon --cluster-name your-cluster-name --addon-name vpc-cni

# Verifica pods del sistema
kubectl get pods -n kube-system
```

### Problema: "Falta espacio en disco o CPU"
```bash
# Revisa recursos del cluster
kubectl describe nodes
kubectl top nodes
kubectl top pods --all-namespaces
```

### Limpieza completa:
```bash
# Eliminar todo el cluster EKS (¡cuidado!)
npx cdk destroy --profile AWS_PROFILE
```

## 📚 Más información

- **Documentación AWS EKS**: https://docs.aws.amazon.com/eks/
- **AWS CDK Documentation**: https://docs.aws.amazon.com/cdk/
- **Configuraciones personalizadas**: Edita ``lib/construct/eks-construct.ts``
- 📖 **[Guía de instalación de Kubernetes](INSTALL_KUBERNETES.md)**: Instalar kubectl y Helm
- 📖 **[Guía de instalación de Devtron](INSTALL_DEVTRON.md)**: Desplegar Devtron en EKS

## 🎯 Consejos

- **Primera vez**: Usa el workflow de despliegue directo con `npm run deploy`
- **Después del deploy**: Sigue las guías [INSTALL_KUBERNETES.md](INSTALL_KUBERNETES.md) e [INSTALL_DEVTRON.md](INSTALL_DEVTRON.md)
- **Producción**: Aumenta el número de nodos y configura auto-scaling según tus necesidades
- **Desarrollo**: El cluster está listo para desplegar tus aplicaciones inmediatamente
- **Comandos rápidos**:
  - **Desplegar**: `npm run deploy` (despliega cluster EKS)
  - **Conectar**: `npm run connect-cluster` (configura kubectl automáticamente)
  - **Ayuda conectar**: `npm run connect` (muestra instrucciones de conexión)
  - **Verificar**: `npm run status` (muestra estado del cluster)
  - **Pods**: `npm run pods` (lista todos los pods)
  - **Servicios**: `npm run services` (lista todos los servicios)
  - **Nodos**: `npm run nodes` (información de node groups)
  - **Eventos**: `npm run events` (eventos recientes del cluster)
  - **Logs**: `npm run logs` (ver logs de pods)
  - **Destruir**: `npm run destroy` (elimina todo el cluster)
- **Configuración**: Edita `lib/stack/eks/index.ts` para personalizar el cluster
- **Variables de entorno**: Configura `ENV_NAME`, `PROJECT_NAME`, `AWS_ACCOUNT`, `AWS_REGION` antes del deploy
- **Outputs optimizados**: Eliminados duplicados, agregados comandos útiles

## 🛠️ Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run deploy` | Desplegar cluster EKS |
| `npm run destroy` | Eliminar cluster EKS |
| `npm run connect` | Mostrar instrucciones detalladas de conexión |
| `npm run connect-cluster` | Conectar automáticamente al cluster |
| `npm run status` | Verificar estado del cluster |
| `npm run pods` | Listar todos los pods |
| `npm run services` | Listar todos los servicios |
| `npm run nodes` | Información de node groups |
| `npm run events` | Eventos recientes del cluster |
| `npm run logs` | Ver logs de pods (requiere argumentos) |
| `npm run fix-lb-public` | Corregir LoadBalancer para acceso público |
| `npm run verify-lb` | Verificar estado del LoadBalancer |

### Comandos Interactivos:
| Comando | Uso |
|---------|-----|
| `npm run logs <pod-name>` | Ver logs de un pod específico |
| `kubectl describe <resource>` | Describir recursos (usa kubectl directamente) |
| `kubectl exec -it <pod>` | Ejecutar comandos en un pod |
| `kubectl port-forward <svc>` | Port forwarding de servicios |
| `kubectl apply -f <file>` | Aplicar manifests YAML |
| `kubectl delete <resource>` | Eliminar recursos |

### 🔗 Conexión al Cluster

**Después de desplegar el cluster EKS:**

1. **Ver instrucciones de conexión:**
   ```bash
   npm run connect
   ```

2. **Conectar automáticamente:**
   ```bash
   npm run connect-cluster
   ```

3. **Verificar conexión:**
   ```bash
   npm run status
   ```

**Si el cluster tiene un nombre diferente, conecta manualmente:**
```bash
aws eks update-kubeconfig --region us-east-1 --name devtron-dev-cluster --profile AWS_PROFILE
```

## 🔄 Versiones de Kubernetes

### 📊 Clúster Actual: `devtron-dev-cluster`
- **Versión**: 1.32
- **Proveedor**: Amazon EKS

### 📅 Información de Soporte para Kubernetes 1.32

**Soporte Estándar:**
- ✅ **Disponible**: Sí (usada actualmente en el proyecto)
- ✅ **Liberada en CDK**: Disponible
- ✅ **Fin soporte estándar**: Marzo 2026

**Soporte Extendido:**
- ⚠️ **Disponible después de marzo 2026**
- 💰 **Costos adicionales** aplican durante soporte extendido
- 📈 **Recomendación**: Planificar actualización antes de marzo 2026 para evitar soporte extendido

### 🎯 Opciones para Evitar Soporte Extendido

Si no deseas usar soporte extendido, puedes:

1. **Actualizar el clúster** a la versión 1.33 cuando esté disponible
2. **Gestionar la política de versiones** de Kubernetes
3. **Planificar la migración** con antelación

> 💡 **Nota importante**: El soporte extendido tiene costos adicionales. Para más información, consulta la [página de precios de AWS EKS](https://aws.amazon.com/eks/pricing/) y la [documentación de políticas de versiones](https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html).

### 📋 Calendario de Versiones AWS EKS

| Versión | Estado | Soporte Estándar | Soporte Extendido |
|---------|--------|------------------|-------------------|
| **1.32** | Actual | Enero 2025 - Marzo 2026 | Marzo 2026 - Marzo 2027 |
| **1.31** | Estándar | Septiembre 2024 - Noviembre 2025 | Noviembre 2025 - Noviembre 2026 |
| **1.30** | Extendido | Mayo 2024 - Julio 2025 | Julio 2025 - Julio 2026 |
| **1.29** | Extendido | Enero 2024 - Marzo 2025 | Marzo 2025 - Marzo 2026 |

### Para cambiar la versión:
```typescript
// En `lib/stack/eks/index.ts`
kubernetesVersion: eksv2.KubernetesVersion.V1_32, // Actual (usada por defecto)
// o
kubernetesVersion: eksv2.KubernetesVersion.V1_31, // Soporte estándar
// o
kubernetesVersion: eksv2.KubernetesVersion.V1_30, // Soporte extendido
// o cuando esté disponible:
// kubernetesVersion: eksv2.KubernetesVersion.V1_33,
```

> 📋 **Nota**: El proyecto usa la versión más reciente disponible en AWS CDK. Según la [documentación oficial de AWS EKS](https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html), la versión 1.33 estará disponible próximamente en `@aws-cdk/aws-eks-v2`.

## 💡 ¿Qué incluye la instalación?

| Componente | Estado | Descripción |
|------------|--------|-------------|
| **EKS Cluster** | ✅ Automático | Cluster `devtron-dev-cluster` Kubernetes 1.32 con control plane |
| **VPC** | ✅ Automático | VPC dedicada con subnets públicas/privadas |
| **Node Group** | ✅ Automático | Grupo de nodos con auto-scaling (2-10 nodos) |
| **VPC CNI** | ✅ Automático | Networking para pods |
| **CoreDNS** | ✅ Automático | Servicio de DNS del cluster |
| **Kube Proxy** | ✅ Automático | Proxy de red para servicios |
| **EBS CSI Driver** | ✅ Automático | Storage persistente con EBS |

¡Tu cluster EKS estará listo en menos de 15 minutos! 🎉

## 📋 Próximos Pasos Después del Deploy

Una vez que tengas tu cluster EKS desplegado y funcionando, sigue estos pasos para completar la instalación:

### 1. 🛠️ Preparar tu Entorno Local

**Instala los clientes necesarios en tu máquina:**
- 📖 **[Sigue la guía completa](INSTALL_KUBERNETES.md)** para instalar kubectl y Helm
- ⏱️ **Tiempo estimado:** 10-15 minutos
- ✅ **Verificación:** `kubectl version --client` y `helm version`

### 2. 🚀 Instalar Devtron

**Despliega Devtron con CI/CD en tu cluster:**
- 📖 **[Sigue la guía detallada](INSTALL_DEVTRON.md)** para instalar Devtron
- 🎯 **Incluye:** Conexión al cluster, instalación con Helm, configuración inicial
- ✅ **Resultado:** Dashboard de Devtron accesible

### 3. 🔗 Conectar y Verificar

**Conecta a tu cluster y verifica todo esté funcionando:**
```bash
# Conectar automáticamente al cluster
npm run connect-cluster

# Verificar el estado del cluster
npm run status

# Ver todos los pods (después de instalar Devtron)
npm run pods
```

### 4. 🎯 Comenzar a Usar Devtron

Una vez instalado Devtron, podrás:
- ✅ **Configurar pipelines CI/CD**
- ✅ **Desplegar aplicaciones**
- ✅ **Gestionar entornos**
- ✅ **Monitorear tu cluster**

## 📚 Documentación de Instalación

| Guía | Propósito | Tiempo Estimado |
|------|-----------|----------------|
| **[INSTALL_KUBERNETES.md](INSTALL_KUBERNETES.md)** | Instalar kubectl y Helm | 10-15 min |
| **[INSTALL_DEVTRON.md](INSTALL_DEVTRON.md)** | Instalar Devtron en EKS | 15-20 min |

¡Sigue estas guías en orden para tener un entorno completo de desarrollo con Kubernetes y Devtron! 🚀

## 🔧 Variables de Entorno del Proyecto

### 📋 Variables Esenciales para CDK Deploy

**Antes de ejecutar `npm run deploy`, configura estas variables:**

```bash
# Variables del proyecto (obligatorias)
export ENV_NAME=dev
export PROJECT_NAME=devtron
export AWS_ACCOUNT=xxxx81713846
export AWS_REGION=us-east-1
```

### 🗂️ Crear Archivo .env (Recomendado)

```bash
# Crear archivo .env en la raíz del proyecto
cat > .env << EOF
ENV_NAME=dev
PROJECT_NAME=devtron
AWS_ACCOUNT=xxxx81713846
AWS_REGION=us-east-1
EOF

# Cargar variables desde el archivo
source .env
```

### ✅ Verificar Configuración

```bash
# Verificar que todas las variables estén configuradas
echo "=== Variables del Proyecto ==="
echo "ENV_NAME: $ENV_NAME"
echo "PROJECT_NAME: $PROJECT_NAME"
echo "AWS_ACCOUNT: $AWS_ACCOUNT"
echo "AWS_REGION: $AWS_REGION"
echo "============================="

# Verificar que las variables no estén vacías
if [ -z "$ENV_NAME" ] || [ -z "$PROJECT_NAME" ] || [ -z "$AWS_ACCOUNT" ] || [ -z "$AWS_REGION" ]; then
    echo "❌ Error: Algunas variables están vacías"
    exit 1
else
    echo "✅ Todas las variables están configuradas correctamente"
fi
```

### 🚨 Problemas Comunes

**Si obtienes errores de variables no definidas:**
```bash
# Error: ENV_NAME is not set
export ENV_NAME=dev

# Error: PROJECT_NAME is not set
export PROJECT_NAME=devtron

# Error: AWS_ACCOUNT is not set
export AWS_ACCOUNT=xxxx81713846

# Error: AWS_REGION is not set
export AWS_REGION=us-east-1
```

**Para desarrollo local persistente:**
```bash
# Agregar a tu ~/.bashrc o ~/.zshrc
echo 'export ENV_NAME=dev' >> ~/.bashrc
echo 'export PROJECT_NAME=devtron' >> ~/.bashrc
echo 'export AWS_ACCOUNT=xxxx81713846' >> ~/.bashrc
echo 'export AWS_REGION=us-east-1' >> ~/.bashrc

# Recargar configuración
source ~/.bashrc
```