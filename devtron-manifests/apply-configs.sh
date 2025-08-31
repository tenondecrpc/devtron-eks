#!/bin/bash

set -e

echo "🚀 === Aplicando Configuraciones de Devtron ==="
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "crds/devtron-installer-crd.yaml" ]; then
    echo "❌ Error: Ejecuta este script desde devtron-eks/devtron-manifests/"
    echo "   cd devtron-eks/devtron-manifests/"
    echo "   ./apply-configs.sh"
    exit 1
fi

# Función para aplicar recursos
apply_resource() {
    local file=$1
    local description=$2
    
    echo "📋 Aplicando $description..."
    if kubectl apply -f "$file"; then
        echo "✅ $description aplicado exitosamente"
    else
        echo "❌ Error aplicando $description"
        return 1
    fi
}

# Función para verificar namespace
check_namespace() {
    local namespace=$1
    if kubectl get namespace "$namespace" >/dev/null 2>&1; then
        echo "✅ Namespace $namespace existe"
    else
        echo "⚠️  Namespace $namespace no existe, creándolo..."
        kubectl create namespace "$namespace"
    fi
}

# Verificar conexión al cluster
echo "🔍 Verificando conexión al cluster..."
if ! kubectl cluster-info >/dev/null 2>&1; then
    echo "❌ Error: No se puede conectar al cluster. Verifica tu configuración de kubectl."
    exit 1
fi
echo "✅ Conexión al cluster establecida"

# Crear namespaces si no existen
echo ""
echo "📦 Verificando namespaces..."
check_namespace "devtroncd"
check_namespace "devtron-cd"
check_namespace "devtron-ci"
check_namespace "devtron-demo"

# Aplicar CRDs
echo ""
echo "🔧 Aplicando Custom Resource Definitions..."
apply_resource "crds/devtron-installer-crd.yaml" "Devtron Installer CRD"

# Aplicar Service Accounts
echo ""
echo "👤 Aplicando Service Accounts..."
apply_resource "service-accounts/devtron-service-accounts.yaml" "Devtron Service Accounts"

# Aplicar configuración de Nginx (opcional, solo si hay problemas de assets)
echo ""
echo "🌐 Configuración de Nginx (opcional)..."
echo "   Esta configuración se aplica solo si tienes problemas con assets estáticos."
echo "   Para aplicarla manualmente:"
echo "   kubectl apply -f nginx-configs/dashboard-nginx-config.yaml"
echo ""

echo "🎉 === Configuraciones Aplicadas Exitosamente ==="
echo ""
echo "📝 Próximos pasos:"
echo "   1. Instalar Devtron con Helm:"
echo "      helm install devtron devtron/devtron-operator \\"
echo "        --create-namespace \\"
echo "        --namespace devtroncd \\"
echo "        --set installer.modules={cicd} \\"
echo "        --values devtron-manifests/helm-values/devtron-values-eks.yaml"
echo ""
echo "   2. O usar la instalación estándar:"
echo "      helm install devtron devtron/devtron-operator \\"
echo "        --create-namespace \\"
echo "        --namespace devtroncd \\"
echo "        --set installer.modules={cicd}"
echo ""
echo "📚 Archivos de configuración disponibles:"
echo "   - CRDs: crds/"
echo "   - Helm Values: helm-values/"
echo "   - Nginx Configs: nginx-configs/"
echo "   - Service Accounts: service-accounts/"
