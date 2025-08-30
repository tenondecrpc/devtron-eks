# Guía de Instalación de Devtron en EKS

Esta guía proporciona los pasos detallados para instalar Devtron con CI/CD en un cluster EKS usando AWS CDK.

## Información General

- **Versión**: Devtron con módulo CI/CD
- **Namespace**: `devtroncd`
- **Cluster**: EKS (Elastic Kubernetes Service)
- **Documentación oficial**: [https://docs.devtron.ai/install/install-devtron-with-cicd](https://docs.devtron.ai/install/install-devtron-with-cicd)

## 📋 Requisito Previo Importante

**Antes de comenzar, asegúrate de tener kubectl y Helm instalados:**

- 📖 **Sigue la guía completa:** [INSTALL_KUBERNETES.md](INSTALL_KUBERNETES.md)
- ⏱️ **Tiempo estimado:** 10-15 minutos
- ✅ **Verificación:** Ejecuta `kubectl version --client` y `helm version`

## Prerrequisitos

### Software Requerido

#### Clientes de Kubernetes y Helm
1. **kubectl** y **Helm** instalados en tu máquina local
   - 📖 **Sigue las instrucciones detalladas en:** [INSTALL_KUBERNETES.md](INSTALL_KUBERNETES.md)
   - **Versión mínima requerida:** kubectl 1.24+, Helm 3.x

#### AWS y Cluster
2. **AWS CLI configurado** con perfil `AWS_PROFILE`
3. **Cluster EKS** desplegado y accesible
4. **Permisos IAM** adecuados para EKS

### Comandos de Conexión al Cluster (Pre-requisito)

#### Mostrar Opciones de Conexión:
```bash
npm run connect
```
**Salida:**
```
Para conectar al cluster EKS:

1. Opción automática (usa el nombre por defecto):
   npm run connect-cluster

2. Opción manual (especifica el nombre del cluster):
   aws eks update-kubeconfig --region us-east-1 --name devtron-dev-cluster --profile AWS_PROFILE

Después de conectar, verifica con:
   npm run status
```

#### Conexión Automática al Cluster:
```bash
npm run connect-cluster
```
**Salida esperada:**
```
Conectando al cluster EKS...
✅ Conexión configurada. Verificando...
Kubernetes control plane is running at https://xxxxx.gr7.us-east-1.eks.amazonaws.com
```

#### Verificar Estado del Cluster:
```bash
npm run status
```
**Salida esperada:**
```
Kubernetes control plane is running at https://xxxxx.gr7.us-east-1.eks.amazonaws.com
CoreDNS is running at https://xxxxx.gr7.us-east-1.eks.amazonaws.com/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy

NAME                           STATUS   ROLES    AGE     VERSION
i-xxxxxxxxxxxxxxxxx            Ready    <none>   4m29s   v1.32.5-eks-98436be
i-xxxxxxxxxxxxxxxxx            Ready    <none>   4m29s   v1.32.5-eks-98436be
```

## Paso 1: Verificar Conexión al Cluster EKS

**Nota:** Asegúrate de haber completado los **pre-requisitos de conexión** mencionados arriba antes de continuar.

```bash
# Verificar que la conexión esté funcionando
npm run status
```

Si no has conectado aún, revisa la sección de **Pre-requisitos > Comandos de Conexión al Cluster** arriba.

## Paso 2: Instalar Devtron usando Helm

### Agregar el Repositorio de Devtron

```bash
# Agregar el repositorio oficial de Devtron
helm repo add devtron https://helm.devtron.ai

# Actualizar repositorios
helm repo update devtron
```

### Instalar Devtron con CI/CD

```bash
# Instalar Devtron con el módulo CI/CD
helm install devtron devtron/devtron-operator \
  --create-namespace \
  --namespace devtroncd \
  --set installer.modules={cicd}
```

**Salida esperada:**
```
NAME: devtron
LAST DEPLOYED: Sat Aug 30 11:05:16 2025
NAMESPACE: devtroncd
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
Please wait for ~1 minute before running any of the following commands.

1. Run the following command to get the password for the default admin user:
   kubectl -n devtroncd get secret devtron-secret -o jsonpath='{.data.ADMIN_PASSWORD}' | base64 -d

2. Run the following command to get the dashboard URL for the service type: LoadBalancer
   kubectl get svc -n devtroncd devtron-service -o jsonpath='{.status.loadBalancer.ingress}'

3. To track the progress of Devtron microservices installation, run the following command:
   kubectl -n devtroncd get installers installer-devtron -o jsonpath='{.status.sync.status}'
```

## Paso 3: Verificar Instalación

### Obtener Credenciales de Admin

```bash
# Obtener la contraseña del usuario admin
kubectl -n devtroncd get secret devtron-secret \
  -o jsonpath='{.data.ADMIN_PASSWORD}' | base64 -d
```

**Ejemplo de salida:** `gv-2JfAnPOLxfEDv`

### Obtener URL del Dashboard

```bash
# Obtener la URL del dashboard
kubectl get svc -n devtroncd devtron-service \
  -o jsonpath='{.status.loadBalancer.ingress}'
```

**Ejemplo de salida:**
```json
[{"hostname":"k8s-devtronc-devtrons-xxxxxxxxxxxxx.elb.us-east-1.amazonaws.com"}]
```

### Verificar Estado de Instalación

```bash
# Verificar el progreso de la instalación
kubectl -n devtroncd get installers installer-devtron \
  -o jsonpath='{.status.sync.status}'
```

**Estados posibles:**
- `Downloaded`: Instalación en progreso
- `Applied`: Instalación completada exitosamente
- `OutOfSync`: Error en la instalación

## Paso 4: Acceder a Devtron

1. **Abrir el navegador** y navegar a la URL obtenida
2. **Credenciales de acceso:**
   - **Usuario**: `admin`
   - **Contraseña**: La obtenida en el Paso 3

## Comandos Útiles para Monitoreo

### Comandos npm disponibles:

```bash
# Ver todos los pods de Devtron
npm run pods

# Ver servicios
npm run services

# Ver nodos del cluster
npm run nodes

# Ver eventos del cluster
npm run events

# Ver logs de un pod específico
npm run logs -n devtroncd <pod-name> -f

# Verificar estado del cluster
npm run status
```

### Comandos kubectl directos (alternativos):

```bash
# Ver todos los pods de Devtron
kubectl get pods -n devtroncd

# Ver logs de un pod específico
kubectl logs -n devtroncd <pod-name> -f

# Ver servicios
kubectl get svc -n devtroncd

# Ver estado de los deployments
kubectl get deployments -n devtroncd

# Ver eventos del namespace
kubectl get events -n devtroncd --sort-by=.metadata.creationTimestamp
```

## Configuración Adicional (Opcional)

### Configurar Blob Storage

Si deseas configurar almacenamiento para logs y cache, puedes usar las siguientes opciones:

#### MinIO (Local)
```bash
helm install devtron devtron/devtron-operator \
  --create-namespace --namespace devtroncd \
  --set installer.modules={cicd} \
  --set minio.enabled=true
```

#### AWS S3
```bash
helm install devtron devtron/devtron-operator \
  --create-namespace --namespace devtroncd \
  --set installer.modules={cicd} \
  --set configs.BLOB_STORAGE_PROVIDER=S3 \
  --set configs.DEFAULT_CACHE_BUCKET=tu-bucket-cache \
  --set configs.DEFAULT_CACHE_BUCKET_REGION=us-east-1 \
  --set configs.DEFAULT_BUILD_LOGS_BUCKET=tu-bucket-logs \
  --set configs.DEFAULT_CD_LOGS_BUCKET_REGION=us-east-1 \
  --set secrets.BLOB_STORAGE_S3_ACCESS_KEY=tu-access-key \
  --set secrets.BLOB_STORAGE_S3_SECRET_KEY=tu-secret-key
```

## Solución de Problemas

### Instalación se queda en "Downloaded"
- Espera al menos 15-20 minutos para que se complete la instalación
- Verifica los logs del installer: `kubectl logs -f -l app=inception -n devtroncd`

### No se puede acceder al dashboard
- Verifica que el LoadBalancer esté completamente provisionado
- Revisa los security groups y network ACLs
- Asegúrate de que el puerto 80/443 esté abierto
- **Comandos de troubleshooting:**
  ```bash
  # Verificar configuración del LoadBalancer
  npm run verify-lb

  # Corregir configuración del LoadBalancer para acceso público
  npm run fix-lb-public
  ```

### Error de permisos IAM
- Verifica que tu perfil AWS tenga permisos para EKS
- Asegúrate de que el cluster EKS existe y está en la región correcta

### Problemas con kubectl o Helm
- Verifica que estén correctamente instalados: `kubectl version --client` y `helm version`
- Si no están instalados, sigue: [INSTALL_KUBERNETES.md](INSTALL_KUBERNETES.md)
- Asegúrate de que estén en tu PATH

### Problemas con Helm
```bash
# Limpiar instalación anterior si es necesario
helm uninstall devtron -n devtroncd
kubectl delete namespace devtroncd

# Verificar versión de Helm
helm version

# Si hay problemas de instalación, reinstala siguiendo INSTALL_KUBERNETES.md
```

## Siguientes Pasos

1. **Configurar SSO**: Configura autenticación con Google, GitHub, etc.
2. **Agregar usuarios**: Crea usuarios adicionales y configura permisos
3. **Configurar repositorios**: Conecta tus repositorios Git
4. **Crear pipelines**: Configura CI/CD pipelines
5. **Instalar charts**: Explora el Chart Store de Devtron

## Recursos Adicionales

- 📖 **[Preparación del entorno local](INSTALL_KUBERNETES.md)**: Guía completa para instalar kubectl y Helm
- [Documentación completa de Devtron](https://docs.devtron.ai/)
- [Guía de instalación con GitOps](https://docs.devtron.ai/install/install-devtron-with-cicd-and-gitops-argocd)
- [Configuraciones avanzadas](https://docs.devtron.ai/install/install-devtron-with-cicd#configure-blob-storage-during-installation)
- [Solución de problemas](https://docs.devtron.ai/troubleshooting/)

## Soporte

Si encuentras problemas durante la instalación:
- Revisa los logs: `kubectl logs -f -l app=inception -n devtroncd`
- Consulta la documentación oficial
- Únete al Discord de Devtron: https://discord.devtron.ai
