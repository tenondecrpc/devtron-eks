# Devtron Manifests (Backup Method)

> **⚠️ IMPORTANTE: Este es un método de respaldo**
>
> Esta carpeta contiene archivos YAML y configuraciones que deben usarse **SOLO SI** la instalación estándar de Devtron falla. La instalación estándar es el método recomendado y más confiable.

## 🎯 **Cuándo Usar Estos Manifiestos**

**Use estos manifiestos SOLO si:**
- ❌ **La instalación estándar de Helm falla** completamente
- ❌ **Hay conflictos de CRDs** que impiden que Devtron inicie
- ❌ **Problemas de permisos** con Service Accounts
- ❌ **Errores de assets estáticos** (404 en archivos JS/CSS)

**NO use estos manifiestos para:**
- ✅ Instalaciones nuevas (use la instalación estándar)
- ✅ Clusters funcionando correctamente
- ✅ Instalaciones de desarrollo/prueba

## 📁 Estructura de Carpetas

Esta carpeta contiene todos los archivos YAML y configuraciones necesarias para instalar y configurar Devtron en un cluster EKS, basados en la configuración exitosa exportada desde Minikube.

## 📁 Estructura de Carpetas

```
devtron-manifests/
├── crds/                          # Custom Resource Definitions
│   └── devtron-installer-crd.yaml # CRD principal de Devtron
├── helm-values/                   # Valores de Helm optimizados
│   └── devtron-values-eks.yaml   # Configuración optimizada para EKS
├── nginx-configs/                 # Configuraciones de Nginx
│   └── dashboard-nginx-config.yaml # Fix para assets estáticos
├── service-accounts/              # Service Accounts requeridos
│   └── devtron-service-accounts.yaml # Todos los SAs necesarios
├── apply-configs.sh              # Script para aplicar configuraciones
└── README.md                     # Este archivo
```

## 🚀 Uso Rápido (Método de Respaldo)

> **⚠️ SOLO use estos métodos si la instalación estándar falla**

### 1. Aplicar Configuraciones Base (Solo si es necesario)

```bash
# Hacer ejecutable el script
chmod +x apply-configs.sh

# Ejecutar desde devtron-manifests/
./apply-configs.sh
```

### 2. Instalar Devtron con Valores Optimizados (Solo si es necesario)

```bash
# INSTALACIÓN DE RESPALDO: Use solo si la estándar falla
helm install devtron devtron/devtron-operator \
  --create-namespace \
  --namespace devtroncd \
  --set installer.modules={cicd} \
  --values helm-values/devtron-values-eks.yaml
```

### 3. Instalación Estándar (RECOMENDADA)

```bash
# INSTALACIÓN PRINCIPAL: Use este método primero
helm install devtron devtron/devtron-operator \
  --create-namespace \
  --namespace devtroncd \
  --set installer.modules={cicd}
```

> **💡 IMPORTANTE**: Esta es la **instalación estándar recomendada**. Solo use los métodos de arriba si esta falla.

## 📋 Archivos Detallados

### CRDs (Custom Resource Definitions)

- **`devtron-installer-crd.yaml`**: Define el recurso personalizado `Installer` que Devtron usa para gestionar la instalación.

### Helm Values Optimizados

- **`devtron-values-eks.yaml`**: Configuración específica para EKS que incluye:
  - Storage class `gp2` (compatible con EKS)
  - Service type `ClusterIP`
  - Tamaños de volumen optimizados
  - Deshabilitación de PSP (deprecated)

### Configuración de Nginx

- **`dashboard-nginx-config.yaml`**: Resuelve problemas comunes de assets estáticos:
  - Rewrite de rutas `/dashboard/` a `/`
  - Headers de cache apropiados
  - Manejo correcto de archivos JS/CSS

### Service Accounts

- **`devtron-service-accounts.yaml`**: Todos los Service Accounts necesarios:
  - `devtron`: Principal para el core de Devtron
  - `devtron-default-sa`: Para operaciones por defecto
  - `chart-sync`: Para sincronización de charts
  - `argocd-dex-server`: Para autenticación
  - `kubelink`: Para conexión con Kubernetes

## 🔧 Aplicación Manual

Si prefieres aplicar las configuraciones manualmente:

```bash
# 1. Crear namespaces
kubectl create namespace devtroncd
kubectl create namespace devtron-cd
kubectl create namespace devtron-ci
kubectl create namespace devtron-demo

# 2. Aplicar CRDs
kubectl apply -f devtron-manifests/crds/devtron-installer-crd.yaml

# 3. Aplicar Service Accounts
kubectl apply -f devtron-manifests/service-accounts/devtron-service-accounts.yaml

# 4. Aplicar configuración de Nginx (opcional)
kubectl apply -f devtron-manifests/nginx-configs/dashboard-nginx-config.yaml
```

## 🎯 Casos de Uso

### Instalación Nueva en EKS

1. Ejecutar `./devtron-manifests/apply-configs.sh`
2. Instalar con Helm usando valores optimizados
3. Aplicar configuración de Nginx si hay problemas de assets

### Migración desde Minikube

1. Exportar configuración desde Minikube
2. Aplicar configuraciones base
3. Instalar Devtron
4. Aplicar configuraciones específicas según necesidad

### Troubleshooting

- **Problemas de assets**: Aplicar configuración de Nginx
- **Service Accounts faltantes**: Verificar y crear los necesarios
- **CRDs corruptos**: Reaplicar desde esta carpeta

## 📚 Referencias

- [Devtron Documentation](https://docs.devtron.ai/)
- [Helm Values Reference](https://helm.sh/docs/chart_template_guide/values_files/)
- [Kubernetes CRDs](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/)

## 🆘 Soporte

Si encuentras problemas:

1. **Primero, intenta la instalación estándar** (método recomendado)
2. **Solo si falla**, usa estos manifiestos de respaldo
3. Verifica que estés ejecutando desde `devtron-eks/devtron-manifests/`
4. Confirma que tienes acceso al cluster
5. Revisa los logs de los pods: `kubectl logs -n devtroncd -l app=devtron`
6. Verifica el estado de los recursos: `kubectl get all -n devtroncd`

## 🎯 **Estrategia de Instalación**

### **Método Principal (Recomendado)**
1. **Instalación estándar de Helm** con valores por defecto
2. **Aplicar fixes críticos** (service selector, port forwarding)
3. **Monitorear progreso** y esperar completación

### **Método de Respaldo (Solo si falla el principal)**
1. **Usar valores optimizados** para problemas específicos de EKS
2. **Aplicar recursos pre-configurados** si hay problemas de CRDs/Service Accounts
3. **Usar configuración de Nginx** si persisten problemas de assets

> **💡 Recuerda**: Comienza con la instalación estándar. Los métodos de respaldo están ahí para ayudar cuando encuentres problemas específicos, no como reemplazo del enfoque principal.
