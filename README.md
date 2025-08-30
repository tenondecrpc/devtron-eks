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
- **Node.js** 18+
- **AWS CLI v2**
- **AWS CDK CLI**
- **Cuenta AWS** con permisos para EKS, EC2, VPC, y IAM

### Versiones de Kubernetes soportadas:
- **1.33** (Próximamente - soporte estándar - ver documentación AWS)
- **1.32** (Disponible en CDK - usada en el proyecto)
- **1.31** (Soporte estándar - actual)
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

# Verificar el despliegue
npm run status
```

**¿Qué hace esto?**
- ✅ **CDK Deploy**: Crea cluster EKS con VPC, Node Group y add-ons
- ✅ **Auto-configuración**: Instala todos los add-ons esenciales automáticamente
- ✅ **Outputs**: Muestra todos los comandos y endpoints importantes
- ✅ **Verificación**: Confirma que todo esté funcionando correctamente

### 🔄 Opción Paso a Paso (Manual)

### 1. Configurar AWS
```bash
# Configura tu perfil AWS (elige una opción):

# Opción A: Access Keys (simple)
aws configure --profile EKS_PROFILE
# Ingresa tu Access Key ID, Secret Access Key, región us-east-1

# Opción B: SSO (para organizaciones)
aws configure sso --profile EKS_PROFILE
aws sso login --profile EKS_PROFILE
```

### 2. Preparar el proyecto
```bash
# Clona e instala dependencias
npm install

# Configura CDK (solo primera vez)
npx cdk bootstrap --profile EKS_PROFILE

# Compila el proyecto
npm run build
```

### 3. Desplegar EKS Cluster
```bash
# Desplegar cluster EKS con todos los add-ons
npx cdk deploy --require-approval never --profile EKS_PROFILE
```

### 4. Configurar kubectl
```bash
# Configura kubectl para acceder al cluster
aws eks update-kubeconfig --region us-east-1 --name your-project-name-dev-cluster --profile EKS_PROFILE

# Verificar conexión
kubectl cluster-info
kubectl get nodes
```

### 5. Verificar instalación
```bash
# Ver todos los recursos del cluster
kubectl get all --all-namespaces

# Verificar add-ons
kubectl get pods -n kube-system

# Verificar node groups
kubectl get nodes --label-columns=eks.amazonaws.com/nodegroup
```

## 🔧 Solución de problemas comunes

### Problema: "No se puede conectar al cluster"
```bash
# Verifica tu perfil AWS
aws sts get-caller-identity --profile EKS_PROFILE

# Actualiza la configuración de kubectl
aws eks update-kubeconfig --region us-east-1 --name your-project-name-dev-cluster --profile EKS_PROFILE

# Verifica la conexión
kubectl cluster-info
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
npx cdk destroy --profile EKS_PROFILE
```

## 📚 Más información

- **Documentación AWS EKS**: https://docs.aws.amazon.com/eks/
- **AWS CDK Documentation**: https://docs.aws.amazon.com/cdk/
- **Configuraciones personalizadas**: Edita `lib/construct/eks-construct.ts`

## 🎯 Consejos

- **Primera vez**: Usa el workflow de despliegue directo con `npm run deploy`
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
  - **Recursos**: `npm run top` (uso de CPU/memoria)
  - **Almacenamiento**: `npm run storage` (storage classes y PVCs)
  - **Salud**: `npm run health` (verificación de estado)
  - **Destruir**: `npm run destroy` (elimina todo el cluster)
- **Configuración**: Edita `lib/stack/eks/index.ts` para personalizar el cluster
- **Outputs optimizados**: Eliminados duplicados, agregados comandos útiles

## 🛠️ Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run deploy` | Desplegar cluster EKS |
| `npm run connect` | Mostrar instrucciones detalladas de conexión |
| `npm run connect-cluster` | Conectar automáticamente al cluster (con verificación) |
| `npm run status` | Verificar estado del cluster |
| `npm run pods` | Listar todos los pods |
| `npm run services` | Listar todos los servicios |
| `npm run nodes` | Información de node groups |
| `npm run events` | Eventos recientes del cluster |
| `npm run top` | Uso de CPU/memoria |
| `npm run storage` | Storage classes y PVCs |
| `npm run health` | Verificación de estado completo |
| `npm run destroy` | Eliminar cluster EKS |

### Comandos Interactivos:
| Comando | Uso |
|---------|-----|
| `npm run logs <pod-name>` | Ver logs de un pod |
| `npm run describe <resource>` | Describir un recurso |
| `npm run exec <pod-name>` | Ejecutar comandos en un pod |
| `npm run scale <deployment>` | Escalar un deployment |
| `npm run port-forward <svc>` | Port forwarding |
| `npm run apply <file>` | Aplicar manifest YAML |
| `npm run delete <resource>` | Eliminar recursos |
| `npm run watch` | Monitorear pods en tiempo real |

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
aws eks update-kubeconfig --region us-east-1 --name TU-CLUSTER-NAME --profile EKS_PROFILE
```

## 🔄 Versiones de Kubernetes

### Versión actual del proyecto: **1.32** (Soporte estándar)
- ✅ **Disponible**: Sí (usada actualmente en el proyecto)
- ✅ **Liberada en CDK**: Disponible
- ✅ **Próxima liberación AWS EKS**: Enero 2025 (según documentación)
- ✅ **Fin soporte estándar**: Marzo 2026
- ✅ **Fin soporte extendido**: Marzo 2027
- ✅ **Última versión disponible** en CDK

### Según documentación AWS EKS:
La [documentación oficial](https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html) menciona:
- **1.33** (Liberación: Mayo 2025)
- **1.32** (Liberación: Enero 2025) ← *Usada en el proyecto*

### Para cambiar la versión:
```typescript
// En lib/stack/eks/index.ts
kubernetesVersion: eksv2.KubernetesVersion.V1_32, // Actual (usada por defecto)
// o
kubernetesVersion: eksv2.KubernetesVersion.V1_31, // Soporte estándar
// o
kubernetesVersion: eksv2.KubernetesVersion.V1_30, // Soporte extendido
// o cuando esté disponible:
// kubernetesVersion: eksv2.KubernetesVersion.V1_33,
```

> 📋 **Nota**: El proyecto usa la versión más reciente disponible en AWS CDK. Según la [documentación oficial de AWS EKS](https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html), la versión 1.33 estará disponible próximamente.

## 💡 ¿Qué incluye la instalación?

| Componente | Estado | Descripción |
|------------|--------|-------------|
| **EKS Cluster** | ✅ Automático | Cluster Kubernetes 1.32 con control plane |
| **VPC** | ✅ Automático | VPC dedicada con subnets públicas/privadas |
| **Node Group** | ✅ Automático | Grupo de nodos con auto-scaling (2-10 nodos) |
| **VPC CNI** | ✅ Automático | Networking para pods |
| **CoreDNS** | ✅ Automático | Servicio de DNS del cluster |
| **Kube Proxy** | ✅ Automático | Proxy de red para servicios |
| **EBS CSI Driver** | ✅ Automático | Storage persistente con EBS |

¡Tu cluster EKS estará listo en menos de 15 minutos! 🎉