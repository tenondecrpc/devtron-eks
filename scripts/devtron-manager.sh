#!/bin/bash

# Devtron Manager - Unified Operations Suite
# Complete Devtron management: Installation, Operations & Troubleshooting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
DEVTRON_NAMESPACE="devtroncd"
VALUES_FILE="devtron-values.yaml"
# Removed OUTPUTS_FILE dependency - now uses centralized config
DEFAULT_CONFIG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/config/devtron"
DEFAULT_VALUES_FILE="${DEFAULT_CONFIG_DIR}/devtron-values.yaml"
HELM_TIMEOUT="15m"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

print_header() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                 🚀 Devtron Unified Manager                   ║"
    echo "║      Complete Devtron Management: Install • Operate • Fix    ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_banner() {
    echo -e "${MAGENTA}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                      Devtron Manager                         ║"
    echo "║                Unified Operations Suite                      ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

print_section() {
    echo -e "${BLUE}┌─ $1 ──────────────────────────────────────────────────────┐${NC}"
}

print_section_end() {
    echo -e "${BLUE}└─────────────────────────────────────────────────────────────┘${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# =============================================================================
# COMMON FUNCTIONS (shared across operations)
# =============================================================================

check_prerequisites() {
    print_section "Prerequisites Check"

    local all_good=true

    # Check AWS CLI
    if command -v aws &> /dev/null; then
        local aws_version=$(aws --version 2>&1 | cut -d' ' -f1)
        print_success "AWS CLI installed: $aws_version"
    else
        print_error "AWS CLI is not installed"
        all_good=false
    fi

    # Check kubectl
    if command -v kubectl &> /dev/null; then
        local kubectl_version=$(kubectl version --client --short 2>/dev/null | cut -d' ' -f3)
        print_success "kubectl installed: $kubectl_version"
    else
        print_error "kubectl is not installed"
        all_good=false
    fi

    # Check helm
    if command -v helm &> /dev/null; then
        local helm_version=$(helm version --short 2>/dev/null | cut -d'+' -f1)
        print_success "Helm installed: $helm_version"
    else
        print_error "Helm is not installed"
        all_good=false
    fi

    if [ "$all_good" = false ]; then
        echo ""
        print_error "Please install missing prerequisites before continuing"
        print_info "Installation commands:"
        echo ""
        echo "macOS:"
        echo "  brew install awscli kubectl helm"
        echo ""
        echo "Linux:"
        echo "  # AWS CLI v2"
        echo "  curl 'https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip' -o 'awscliv2.zip'"
        echo "  unzip awscliv2.zip && sudo ./aws/install"
        echo "  # kubectl"
        echo "  curl -LO 'https://dl.k8s.io/release/\$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl'"
        echo "  sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl"
        echo "  # Helm"
        echo "  curl https://get.helm.sh/helm-v3.12.0-linux-amd64.tar.gz -o helm.tar.gz"
        echo "  tar -zxvf helm.tar.gz && sudo mv linux-amd64/helm /usr/local/bin/helm"
        echo ""
        return 1
    fi

    print_section_end
    return 0
}

get_devtron_url() {
    local namespace=$1

    # Try to get LoadBalancer URL first
    local lb_url=$(kubectl get svc -n "${namespace}" -o jsonpath='{.items[?(@.spec.type=="LoadBalancer")].status.loadBalancer.ingress[0].hostname}' 2>/dev/null)

    if [ -n "$lb_url" ]; then
        echo "http://$lb_url"
        return 0
    fi

    # Try to get Ingress URL
    local ingress_url=$(kubectl get ingress -n "${namespace}" -o jsonpath='{.items[0].spec.rules[0].host}' 2>/dev/null)

    if [ -n "$ingress_url" ]; then
        # Check if it has TLS
        local tls_secret=$(kubectl get ingress -n "${namespace}" -o jsonpath='{.items[0].spec.tls[0].secretName}' 2>/dev/null)
        if [ -n "$tls_secret" ]; then
            echo "https://$ingress_url"
        else
            echo "http://$ingress_url"
        fi
        return 0
    fi

    # Fallback to port-forward
    echo "localhost:32000 (use: kubectl port-forward svc/devtron-service -n ${namespace} 32000:80)"
    return 0
}

# =============================================================================
# INSTALLATION FUNCTIONS (from install-devtron-auto.sh)
# =============================================================================

# Function to get Devtron configuration (no longer depends on CDK outputs)
get_devtron_config() {
    print_section "Loading Devtron Configuration"

    # First, try to use the centralized config file
    if [ -f "$DEFAULT_VALUES_FILE" ]; then
        print_success "Found centralized Devtron configuration: $DEFAULT_VALUES_FILE"
        cat "$DEFAULT_VALUES_FILE"
        return 0
    fi

    # If centralized config doesn't exist, use default configuration
    print_warning "Centralized config not found, using default configuration"
    print_info "This provides a basic working setup optimized for EKS"

    # Default Devtron configuration optimized for EKS
    cat << 'EOF'
installer:
  release: "devtron"
  modules:
    - "cicd"
components:
  dashboard:
    enabled: true
  devtron:
    enabled: true
  argocd:
    enabled: true
postgresql:
  persistence:
    enabled: false
prometheus:
  persistence:
    enabled: false
minio:
  persistence:
    enabled: false
service:
  type: "LoadBalancer"
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "external"
    service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "ip"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
monitoring:
  enabled: true
  prometheus:
    enabled: true
  grafana:
    enabled: true
EOF

    return 0
}

# Function to create values file
create_values_file() {
    local values_content=$1

    print_section "Creating Values File"

    if [ -z "$values_content" ]; then
        print_error "No values content provided"
        return 1
    fi

    # Content is already valid YAML, no need to unescape
    echo "$values_content" > "$VALUES_FILE"
    print_success "Values file created: ${VALUES_FILE}"

    # Show a preview
    echo -e "${YELLOW}📋 Values file preview:${NC}"
    head -20 "$VALUES_FILE"
    echo "..."

    print_section_end
}

# Function to setup Helm repository
setup_helm_repo() {
    print_section "Helm Repository Setup"

    # Add Devtron Helm repository
    if ! helm repo list | grep -q devtron; then
        print_info "Adding Devtron Helm repository..."
        helm repo add devtron https://helm.devtron.ai
    fi

    # Update repositories
    print_info "Updating Helm repositories..."
    helm repo update

    print_success "Helm repository ready"
    print_section_end
}

# Function to clean up orphaned resources before installation
cleanup_orphaned_resources() {
    print_section "Cleaning Orphaned Resources"

    # Clean up orphaned PVCs
    print_info "Checking for orphaned PersistentVolumeClaims..."
    orphaned_pvcs=$(kubectl get pvc -n "$DEVTRON_NAMESPACE" --no-headers 2>/dev/null | grep -v "Bound" | wc -l)
    if [ "$orphaned_pvcs" -gt 0 ]; then
        print_warning "Found $orphaned_pvcs orphaned PVCs. Cleaning up..."
        kubectl delete pvc -n "$DEVTRON_NAMESPACE" --all --ignore-not-found=true
        print_success "Cleaned up orphaned PVCs"
    else
        print_success "No orphaned PVCs found"
    fi

    # Clean up orphaned PVs
    print_info "Checking for orphaned PersistentVolumes..."
    orphaned_pvs=$(kubectl get pv --no-headers 2>/dev/null | grep "$DEVTRON_NAMESPACE" | grep -v "Bound" | wc -l)
    if [ "$orphaned_pvs" -gt 0 ]; then
        print_warning "Found $orphaned_pvs orphaned PVs. Cleaning up..."
        kubectl delete pv $(kubectl get pv --no-headers | grep "$DEVTRON_NAMESPACE" | grep -v "Bound" | awk '{print $1}') --ignore-not-found=true
        print_success "Cleaned up orphaned PVs"
    else
        print_success "No orphaned PVs found"
    fi

    # Clean up failed pods
    print_info "Checking for failed pods..."
    failed_pods=$(kubectl get pods -n "$DEVTRON_NAMESPACE" --no-headers 2>/dev/null | grep -E "(Error|CrashLoopBackOff|Failed)" | wc -l)
    if [ "$failed_pods" -gt 0 ]; then
        print_warning "Found $failed_pods failed pods. Cleaning up..."
        kubectl delete pods -n "$DEVTRON_NAMESPACE" --field-selector=status.phase=Failed --ignore-not-found=true
        print_success "Cleaned up failed pods"
    else
        print_success "No failed pods found"
    fi

    # Clean up orphaned LoadBalancer services
    print_info "Checking for orphaned LoadBalancer services..."
    orphaned_svcs=$(kubectl get svc -n "$DEVTRON_NAMESPACE" --no-headers 2>/dev/null | grep "LoadBalancer" | grep "<pending>" | wc -l)
    if [ "$orphaned_svcs" -gt 0 ]; then
        print_warning "Found $orphaned_svcs orphaned LoadBalancer services. This may take time to clean up in AWS..."
        # Note: LoadBalancer cleanup in AWS may take several minutes
        print_info "LoadBalancer cleanup may take 5-15 minutes in AWS"
    else
        print_success "No orphaned LoadBalancer services found"
    fi

    print_section_end
}

# Function to install Devtron with enhanced error handling
install_devtron_auto() {
    print_section "Devtron Installation"

    # Check if already installed
    if helm list -n "$DEVTRON_NAMESPACE" | grep -q devtron; then
        print_warning "Devtron is already installed. Use 'helm upgrade' to update or uninstall first."
        return 0
    fi

    # Clean up any orphaned resources first
    cleanup_orphaned_resources

    # Pre-flight checks
    print_info "Running pre-flight checks..."
    if ! kubectl cluster-info >/dev/null 2>&1; then
        print_error "Cannot connect to Kubernetes cluster"
        return 1
    fi

    # Install Devtron with retries
    local max_retries=3
    local retry_count=0

    while [ $retry_count -lt $max_retries ]; do
        print_info "Installing Devtron via Helm (attempt $((retry_count + 1))/$max_retries)..."

        if [ -f "$VALUES_FILE" ]; then
            helm install devtron devtron/devtron-operator \
                --namespace "$DEVTRON_NAMESPACE" \
                --create-namespace \
                --values "$VALUES_FILE" \
                --timeout "$HELM_TIMEOUT" \
                --wait \
                --atomic  # Rollback on failure
        else
            print_warning "No values file found. Installing with defaults..."
            helm install devtron devtron/devtron-operator \
                --namespace "$DEVTRON_NAMESPACE" \
                --create-namespace \
                --timeout "$HELM_TIMEOUT" \
                --wait \
                --atomic  # Rollback on failure
        fi

        if [ $? -eq 0 ]; then
            print_success "Devtron installed successfully on attempt $((retry_count + 1))"
            break
        else
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $max_retries ]; then
                print_warning "Installation attempt $retry_count failed. Retrying in 30 seconds..."
                sleep 30

                # Clean up failed installation
                helm uninstall devtron -n "$DEVTRON_NAMESPACE" --ignore-not-found=true
                cleanup_orphaned_resources
            else
                print_error "Devtron installation failed after $max_retries attempts"
                print_info "Check the troubleshooting section for more help"
                return 1
            fi
        fi
    done

    print_section_end
    return 0
}

# =============================================================================
# INSTALLATION FUNCTIONS
# =============================================================================

setup_helm_repo() {
    print_section "Helm Repository Setup"

    # Add Devtron Helm repository
    if ! helm repo list | grep -q devtron; then
        print_info "Adding Devtron Helm repository..."
        helm repo add devtron https://helm.devtron.ai
    fi

    # Update repositories
    print_info "Updating Helm repositories..."
    helm repo update

    print_success "Helm repository ready"
    print_section_end
}

create_values_file() {
    local values_content=$1

    print_section "Values File Creation"

    if [ -z "$values_content" ]; then
        print_error "No values content provided"
        return 1
    fi

    # Remove quotes and unescape
    values_content=$(echo "$values_content" | sed 's/^"//' | sed 's/"$//' | sed 's/\\n/\n/g' | sed 's/\\"/"/g')

    echo "$values_content" > "$VALUES_FILE"
    print_success "Values file created: ${VALUES_FILE}"

    # Show a preview
    echo -e "${YELLOW}📋 Values file preview:${NC}"
    head -20 "$VALUES_FILE"
    echo "..."

    print_section_end
}

install_devtron() {
    local values_content=""

    print_section "Devtron Installation"

    # Parse arguments for this function
    while [[ $# -gt 0 ]]; do
        case $1 in
            --values)
                values_content="$2"
                shift 2
                ;;
            --namespace)
                DEVTRON_NAMESPACE="$2"
                shift 2
                ;;
            --timeout)
                HELM_TIMEOUT="$2"
                shift 2
                ;;
            *)
                shift
                ;;
        esac
    done

    # Check if already installed
    if helm list -n "$DEVTRON_NAMESPACE" | grep -q devtron; then
        print_warning "Devtron is already installed. Skipping installation."
        return 0
    fi

    # Setup Helm repo if needed
    setup_helm_repo

    # Create values file if content provided
    if [ -n "$values_content" ]; then
        if ! create_values_file "$values_content"; then
            return 1
        fi
    fi

    # Install Devtron
    print_info "Installing Devtron via Helm..."
    if [ -f "$VALUES_FILE" ]; then
        helm install devtron devtron/devtron-operator \
            --namespace "$DEVTRON_NAMESPACE" \
            --create-namespace \
            --values "$VALUES_FILE" \
            --timeout "$HELM_TIMEOUT" \
            --wait
    else
        print_warning "No values file found. Installing with defaults..."
        helm install devtron devtron/devtron-operator \
            --namespace "$DEVTRON_NAMESPACE" \
            --create-namespace \
            --timeout "$HELM_TIMEOUT" \
            --wait
    fi

    if [ $? -eq 0 ]; then
        print_success "Devtron installed successfully"
    else
        print_error "Devtron installation failed"
        return 1
    fi

    print_section_end
    return 0
}

wait_for_installation() {
    local timeout=${1:-600}

    print_section "Waiting for Installation"

    local start_time=$(date +%s)

    while true; do
        # Check if all pods are ready
        local total_pods=$(kubectl get pods -n "$DEVTRON_NAMESPACE" --no-headers 2>/dev/null | wc -l)
        local ready_pods=$(kubectl get pods -n "$DEVTRON_NAMESPACE" --no-headers 2>/dev/null | grep "Running" | wc -l)

        if [ "$total_pods" -gt 0 ] && [ "$ready_pods" -eq "$total_pods" ]; then
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            print_success "All pods are ready! (${ready_pods}/${total_pods}) - ${duration}s"
            break
        fi

        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))

        if [ $elapsed -gt $timeout ]; then
            print_error "Timeout waiting for pods to be ready"
            kubectl get pods -n "$DEVTRON_NAMESPACE"
            return 1
        fi

        echo "Waiting... (${ready_pods}/${total_pods} pods ready) - ${elapsed}s elapsed"
        sleep 10
    done

    print_section_end
    return 0
}

# =============================================================================
# POST-INSTALLATION FUNCTIONS
# =============================================================================

verify_installation() {
    local namespace=$1

    print_section "Installation Verification"

    # Check namespace exists
    if ! kubectl get namespace "${namespace}" >/dev/null 2>&1; then
        print_error "Namespace ${namespace} does not exist"
        return 1
    fi

    # Check essential deployments
    local essential_deployments=("devtron" "argo-cd" "postgresql" "minio")
    for deployment in "${essential_deployments[@]}"; do
        if ! kubectl get deployment "${deployment}" -n "${namespace}" >/dev/null 2>&1; then
            print_error "Deployment ${deployment} not found"
            return 1
        fi
    done

    print_success "All essential deployments found"
    print_section_end
    return 0
}

setup_devtron_config() {
    local namespace=$1

    print_section "Devtron Configuration Setup"

    # Wait for Devtron API to be ready
    print_info "Waiting for Devtron API to be ready..."
    local api_ready=false
    local attempts=0
    local max_attempts=30

    while [ $attempts -lt $max_attempts ]; do
        if kubectl exec -n "${namespace}" deployment/devtron -c devtron -- curl -f http://localhost:80/health > /dev/null 2>&1; then
            api_ready=true
            break
        fi
        print_info "Attempt $((attempts + 1))/$max_attempts: Devtron API not ready yet..."
        sleep 10
        ((attempts++))
    done

    if [ "$api_ready" = false ]; then
        print_error "Devtron API is not ready after $((max_attempts * 10)) seconds"
        return 1
    fi

    print_success "Devtron API is ready!"
    print_section_end
    return 0
}

# =============================================================================
# TROUBLESHOOTING FUNCTIONS
# =============================================================================

check_cluster() {
    print_section "Cluster Connectivity"

    if ! kubectl cluster-info >/dev/null 2>&1; then
        print_error "Cannot connect to Kubernetes cluster"
        print_info "Check your kubeconfig and cluster access"
        return 1
    fi

    print_success "Cluster connection OK"
    print_section_end
    return 0
}

# Function to perform advanced diagnostics
advanced_diagnostics() {
    print_section "Advanced Diagnostics"

    # Check cluster resources
    print_info "Checking cluster resources..."
    local cpu_available=$(kubectl get nodes -o jsonpath='{.items[*].status.capacity.cpu}' | tr ' ' '\n' | awk '{sum += $1} END {print sum}')
    local memory_available=$(kubectl get nodes -o jsonpath='{.items[*].status.capacity.memory}' | tr ' ' '\n' | sed 's/Ki//' | awk '{sum += $1} END {print sum}')
    local memory_gb=$((memory_available / 1024 / 1024))

    echo "Available CPU cores: $cpu_available"
    echo "Available Memory: ${memory_gb}GB"

    if [ "$cpu_available" -lt 2 ]; then
        print_warning "Low CPU resources detected. Devtron needs at least 2 CPU cores."
    fi

    if [ "$memory_gb" -lt 4 ]; then
        print_warning "Low memory resources detected. Devtron needs at least 4GB RAM."
    fi

    # Check storage classes
    print_info "Checking storage classes..."
    if ! kubectl get storageclass gp2 >/dev/null 2>&1; then
        print_warning "gp2 storage class not found. Devtron configuration uses gp2."
        print_info "Available storage classes:"
        kubectl get storageclass
    else
        print_success "gp2 storage class available"
    fi

    # Check for common issues
    print_info "Checking for common issues..."

    # Check if namespace exists but has issues
    if kubectl get namespace "$DEVTRON_NAMESPACE" >/dev/null 2>&1; then
        local terminating_pods=$(kubectl get pods -n "$DEVTRON_NAMESPACE" --no-headers 2>/dev/null | grep "Terminating" | wc -l)
        if [ "$terminating_pods" -gt 0 ]; then
            print_warning "Found $terminating_pods pods stuck in Terminating state"
            print_info "This may indicate resource cleanup issues"
        fi

        local pending_pods=$(kubectl get pods -n "$DEVTRON_NAMESPACE" --no-headers 2>/dev/null | grep "Pending" | wc -l)
        if [ "$pending_pods" -gt 0 ]; then
            print_warning "Found $pending_pods pods in Pending state"
            print_info "Check node resources or PVC issues"
        fi
    fi

    # Check AWS LoadBalancer issues
    print_info "Checking LoadBalancer status..."
    local lb_services=$(kubectl get svc -n "$DEVTRON_NAMESPACE" --no-headers 2>/dev/null | grep "LoadBalancer" | wc -l)
    if [ "$lb_services" -gt 0 ]; then
        local pending_lb=$(kubectl get svc -n "$DEVTRON_NAMESPACE" --no-headers 2>/dev/null | grep "LoadBalancer" | grep "<pending>" | wc -l)
        if [ "$pending_lb" -gt 0 ]; then
            print_warning "Found LoadBalancer services in <pending> state"
            print_info "This may take 5-15 minutes to provision in AWS"
            print_info "Check AWS EC2 LoadBalancer console for status"
        else
            print_success "LoadBalancer services are active"
        fi
    fi

    print_section_end
}

# Function to force cleanup all Devtron resources
force_cleanup() {
    print_section "Force Cleanup All Devtron Resources"

    print_warning "This will remove ALL Devtron-related resources including PVCs and PVs!"
    read -p "Are you sure you want to continue? (yes/no): " confirm

    if [[ "$confirm" != "yes" ]]; then
        print_info "Cleanup cancelled"
        return 0
    fi

    # Uninstall Helm release
    print_info "Uninstalling Helm release..."
    helm uninstall devtron -n "$DEVTRON_NAMESPACE" --ignore-not-found=true --wait

    # Delete namespace (this will delete everything)
    print_info "Deleting namespace and all resources..."
    kubectl delete namespace "$DEVTRON_NAMESPACE" --ignore-not-found=true --timeout=300s

    # Wait for namespace deletion
    local attempts=0
    local max_attempts=30
    while [ $attempts -lt $max_attempts ]; do
        if ! kubectl get namespace "$DEVTRON_NAMESPACE" >/dev/null 2>&1; then
            break
        fi
        print_info "Waiting for namespace deletion... (${attempts}/${max_attempts})"
        sleep 10
        ((attempts++))
    done

    if [ $attempts -eq $max_attempts ]; then
        print_warning "Namespace deletion timed out. It may still be terminating."
        print_info "You can check status with: kubectl get namespace $DEVTRON_NAMESPACE"
    else
        print_success "Namespace deleted successfully"
    fi

    # Clean up any remaining orphaned resources
    cleanup_orphaned_resources

    print_success "Force cleanup completed"
    print_section_end
}

check_namespace() {
    print_section "Namespace Check"

    if ! kubectl get namespace "$DEVTRON_NAMESPACE" >/dev/null 2>&1; then
        print_error "Namespace ${DEVTRON_NAMESPACE} does not exist"
        print_info "Devtron may not be installed yet"
        return 1
    fi

    print_success "Namespace ${DEVTRON_NAMESPACE} exists"
    print_section_end
    return 0
}

check_helm_release() {
    print_section "Helm Release Check"

    if ! helm list -n "$DEVTRON_NAMESPACE" | grep -q devtron; then
        print_error "Devtron Helm release not found"
        print_info "Install Devtron first using: helm install devtron devtron/devtron-operator"
        return 1
    fi

    print_success "Devtron Helm release found"
    print_section_end
    return 0
}

check_pods() {
    print_section "Pod Status Check"

    local pods=$(kubectl get pods -n "$DEVTRON_NAMESPACE" --no-headers 2>/dev/null)

    if [ -z "$pods" ]; then
        print_error "No pods found in namespace ${DEVTRON_NAMESPACE}"
        return 1
    fi

    echo "Pod Status:"
    echo "$pods" | while read -r line; do
        local pod_name=$(echo "$line" | awk '{print $1}')
        local ready=$(echo "$line" | awk '{print $2}')
        local status=$(echo "$line" | awk '{print $3}')
        local restarts=$(echo "$line" | awk '{print $4}')

        case $status in
            "Running")
                print_success "$pod_name: $ready ready, $restarts restarts"
                ;;
            "Pending")
                print_warning "$pod_name: Pending"
                ;;
            "CrashLoopBackOff")
                print_error "$pod_name: CrashLoopBackOff"
                ;;
            *)
                print_warning "$pod_name: $status"
                ;;
        esac
    done

    # Check for problematic pods
    local problematic_pods=$(echo "$pods" | grep -E "(Error|CrashLoopBackOff|Pending)" | wc -l)
    if [ "$problematic_pods" -gt 0 ]; then
        print_error "Found $problematic_pods problematic pods"
        return 1
    fi

    print_success "All pods look healthy"
    print_section_end
    return 0
}

show_logs() {
    local pod_name=$1
    local container=${2:-""}

    print_section "Logs for Pod: $pod_name"

    if [ -z "$container" ]; then
        kubectl logs -n "$DEVTRON_NAMESPACE" "$pod_name" --tail=50
    else
        kubectl logs -n "$DEVTRON_NAMESPACE" "$pod_name" -c "$container" --tail=50
    fi

    print_section_end
}

show_events() {
    print_section "Recent Events"
    kubectl get events -n "$DEVTRON_NAMESPACE" --sort-by='.lastTimestamp' | tail -10
    print_section_end
}

# =============================================================================
# MAIN MENU AND OPERATIONS
# =============================================================================

show_main_menu() {
    echo ""
    echo -e "${CYAN}🚀 Devtron Manager - Choose Your Action${NC}"
    echo ""
    echo -e "${YELLOW}💡 Quick Start:${NC} Run '2' after CDK deploy to verify Direct Installation"
    echo ""

    echo -e "${GREEN}📦 INSTALLATION:${NC}"
    echo "1. 🚀 Complete Auto-Installation (for Script Installation method)"
    echo ""

    echo -e "${BLUE}🔧 OPERATIONS:${NC}"
    echo "2. 🔧 Verify Direct Installation (after CDK deploy)"
    echo "3. ✅ Validate Installation Health (Quick Health Check)"
    echo "4. 📊 Show Status & Information"
    echo "5. 🔍 Troubleshoot Issues"
    echo ""

    echo -e "${PURPLE}🔗 ACCESS & UTILITIES:${NC}"
    echo "6. 🔗 Get Access Information (Direct Installation)"
    echo "7. 📋 Useful Commands"
    echo ""

    echo -e "${CYAN}❓ HELP:${NC}"
    echo "8. ❓ Help & Documentation"
    echo "9. Exit"
    echo ""
}

show_installation_menu() {
    echo ""
    echo -e "${CYAN}Installation Options:${NC}"
    echo ""
    echo "1. 🔄 Full Installation (Helm repo + Install + Wait)"
    echo "2. 📦 Install from CDK values (uses CDK-generated config)"
    echo "3. ⚡ Quick Install (minimal configuration)"
    echo "4. 🔙 Back to Main Menu"
    echo ""
}

show_troubleshooting_menu() {
    echo ""
    echo -e "${CYAN}Troubleshooting Options:${NC}"
    echo ""
    echo "1. 🔍 Full Diagnostic Check"
    echo "2. 🔬 Advanced Diagnostics (Resources, Storage, LoadBalancers)"
    echo "3. 🧹 Clean Orphaned Resources (PVCs, PVs, Failed Pods)"
    echo "4. 💥 Force Cleanup All Devtron Resources"
    echo "5. 📋 Show Pod Logs"
    echo "6. 📊 Show Events & Resources"
    echo "7. 🔙 Back to Main Menu"
    echo ""
}

show_advanced_menu() {
    echo ""
    echo -e "${CYAN}Advanced Operations:${NC}"
    echo ""
    echo "1. 🔄 Upgrade Devtron"
    echo "2. 🗑️  Uninstall Devtron"
    echo "3. 💾 Backup Configuration"
    echo "4. 🔧 Custom Helm Values"
    echo "5. 🔙 Back to Main Menu"
    echo ""
}

# =============================================================================
# OPERATION FUNCTIONS
# =============================================================================

do_complete_installation() {
    print_header
    echo -e "${MAGENTA}🚀 Starting Complete Devtron Installation${NC}"
    echo ""

    # Check prerequisites
    if ! check_prerequisites; then
        return 1
    fi

    # Get Devtron configuration
    local cdk_values
    if ! cdk_values=$(get_devtron_config); then
        return 1
    fi

    # Setup Helm repository
    if ! setup_helm_repo; then
        return 1
    fi

    # Create values file
    if ! create_values_file "$cdk_values"; then
        return 1
    fi

    # Install Devtron
    if ! install_devtron_auto; then
        return 1
    fi

    # Wait for installation
    if ! wait_for_installation 600; then
        return 1
    fi

    # Setup configuration
    if ! setup_devtron_config "$DEVTRON_NAMESPACE"; then
        print_warning "Configuration setup had issues, but continuing..."
    fi

    # Show completion
    show_completion_info
}

do_verify_installation() {
    print_header
    echo -e "${MAGENTA}🔧 Verifying Devtron Installation${NC}"
    echo ""

    # Check if Devtron is installed
    if ! helm list -n "$DEVTRON_NAMESPACE" | grep -q devtron; then
        print_error "Devtron is not installed."
        echo ""
        print_info "You can install Devtron using:"
        print_info "  1. CDK Direct Installation (recommended): cdk deploy"
        print_info "  2. Script Installation: Select option 1 from main menu"
        return 1
    fi

    print_success "Devtron is installed via Helm"

    # Verify installation
    if ! verify_installation "$DEVTRON_NAMESPACE"; then
        print_error "Installation verification failed"
        return 1
    fi

    # Wait for pods to be ready
    if ! wait_for_installation 300; then
        print_warning "Some pods may not be ready yet"
    fi

    # Setup configuration
    if ! setup_devtron_config "$DEVTRON_NAMESPACE"; then
        print_warning "Configuration setup had issues, but continuing..."
    fi

    print_success "Devtron installation verified successfully!"
    echo ""
    print_info "Devtron should now be accessible via the URLs shown in CDK outputs"
}

do_get_access_info() {
    print_header
    echo -e "${MAGENTA}🔗 Devtron Access Information${NC}"
    echo ""

    # Get Devtron URL
    local devtron_url=$(get_devtron_url "$DEVTRON_NAMESPACE")

    echo -e "${BLUE}🌐 Access URLs:${NC}"
    echo "   Dashboard: $devtron_url"
    echo ""

    echo -e "${BLUE}🔧 Access Commands:${NC}"
    echo "   Port forward: kubectl port-forward svc/devtron-service -n $DEVTRON_NAMESPACE 32000:80"
    echo "   Then visit: http://localhost:32000"
    echo ""

    echo -e "${BLUE}📋 Useful Information:${NC}"
    echo "   Namespace: $DEVTRON_NAMESPACE"
    echo "   Service: devtron-service"
    echo "   Deployment: devtron"
    echo ""

    print_info "Use these URLs to access your Devtron dashboard"
}

do_post_installation() {
    print_header
    echo -e "${MAGENTA}🔧 Post-Installation Setup${NC}"
    echo ""

    # Check if Devtron is installed
    if ! helm list -n "$DEVTRON_NAMESPACE" | grep -q devtron; then
        print_error "Devtron is not installed. Please install it first."
        return 1
    fi

    # Verify installation
    if ! verify_installation "$DEVTRON_NAMESPACE"; then
        return 1
    fi

    # Wait for pods
    if ! wait_for_installation 300; then
        return 1
    fi

    # Setup configuration
    if ! setup_devtron_config "$DEVTRON_NAMESPACE"; then
        print_warning "Configuration setup had issues, but continuing..."
    fi

    show_completion_info
}

do_troubleshoot() {
    print_header
    echo -e "${MAGENTA}🔍 Troubleshooting Devtron${NC}"

    local choice
    while true; do
        show_troubleshooting_menu
        read -p "Select troubleshooting option (1-7): " choice

        case $choice in
            1)
                # Full diagnostic
                check_cluster
                check_namespace
                if kubectl get namespace "$DEVTRON_NAMESPACE" >/dev/null 2>&1; then
                    check_helm_release
                    check_pods
                fi
                ;;
            2)
                # Advanced diagnostics
                advanced_diagnostics
                ;;
            3)
                # Clean orphaned resources
                cleanup_orphaned_resources
                ;;
            4)
                # Force cleanup
                force_cleanup
                ;;
            5)
                # Show pod logs
                local pods=$(kubectl get pods -n "$DEVTRON_NAMESPACE" --no-headers 2>/dev/null | awk '{print $1}')
                if [ -z "$pods" ]; then
                    print_error "No pods found"
                    continue
                fi

                echo "Available pods:"
                echo "$pods" | nl
                echo ""
                read -p "Enter pod number or name: " pod_input

                if [[ "$pod_input" =~ ^[0-9]+$ ]]; then
                    local pod_name=$(echo "$pods" | sed -n "${pod_input}p")
                else
                    local pod_name="$pod_input"
                fi

                show_logs "$pod_name"
                ;;
            6)
                # Show events and resources
                show_events
                print_section "Resource Usage"
                kubectl top pods -n "$DEVTRON_NAMESPACE" 2>/dev/null || print_warning "kubectl top not available"
                print_section_end
                ;;
            7)
                return 0
                ;;
            *)
                print_error "Invalid choice. Please try again."
                ;;
        esac

        echo ""
        read -p "Press Enter to continue..."
    done
}

show_status() {
    print_header
    echo -e "${MAGENTA}📊 Devtron Status & Information${NC}"
    echo ""

    # Basic info
    echo -e "${BLUE}Configuration:${NC}"
    echo "  Namespace: $DEVTRON_NAMESPACE"
    echo "  Values file: $VALUES_FILE"
    echo ""

    # Cluster status
    check_cluster

    # Devtron status
    check_namespace

    if kubectl get namespace "$DEVTRON_NAMESPACE" >/dev/null 2>&1; then
        check_helm_release

        # Get Devtron URL
        local devtron_url=$(get_devtron_url "$DEVTRON_NAMESPACE")
        echo -e "${BLUE}Access Information:${NC}"
        echo "  URL: $devtron_url"
        echo ""

        # Pod status summary
        local pod_summary=$(kubectl get pods -n "$DEVTRON_NAMESPACE" --no-headers 2>/dev/null | wc -l)
        local running_pods=$(kubectl get pods -n "$DEVTRON_NAMESPACE" --no-headers 2>/dev/null | grep "Running" | wc -l)
        echo -e "${BLUE}Pod Status:${NC}"
        echo "  Total pods: $pod_summary"
        echo "  Running pods: $running_pods"
        echo ""

        # Services
        echo -e "${BLUE}Services:${NC}"
        kubectl get svc -n "$DEVTRON_NAMESPACE" --no-headers 2>/dev/null | while read -r line; do
            local svc_name=$(echo "$line" | awk '{print $1}')
            local svc_type=$(echo "$line" | awk '{print $2}')
            echo "  $svc_name ($svc_type)"
        done
    fi

    echo ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo "  Port forward: kubectl port-forward svc/devtron-service -n $DEVTRON_NAMESPACE 32000:80"
    echo "  View logs: kubectl logs -f deployment/devtron -n $DEVTRON_NAMESPACE"
    echo "  Get all resources: kubectl get all -n $DEVTRON_NAMESPACE"
}

show_useful_commands() {
    print_section "Useful Commands"

    echo -e "${BLUE}# Cluster Management:${NC}"
    echo "kubectl get nodes -o wide"
    echo "kubectl get pods --all-namespaces"
    echo "kubectl cluster-info"
    echo ""

    echo -e "${BLUE}# Devtron Specific:${NC}"
    echo "kubectl get all -n $DEVTRON_NAMESPACE"
    echo "kubectl logs -f deployment/devtron -n $DEVTRON_NAMESPACE"
    echo "kubectl port-forward svc/devtron-service -n $DEVTRON_NAMESPACE 32000:80"
    echo "helm list -n $DEVTRON_NAMESPACE"
    echo ""

    echo -e "${BLUE}# Troubleshooting:${NC}"
    echo "kubectl describe pod <pod-name> -n $DEVTRON_NAMESPACE"
    echo "kubectl get events -n $DEVTRON_NAMESPACE --sort-by='.lastTimestamp'"
    echo "kubectl top pods -n $DEVTRON_NAMESPACE"
    echo ""

    echo -e "${BLUE}# CDK Operations:${NC}"
    echo "cdk deploy"
    echo "cdk destroy"
    echo "cdk synth"
    echo ""

    print_section_end
}

show_completion_info() {
    echo ""
    echo -e "${GREEN}🎉 Operation Completed Successfully!${NC}"
    echo "=================================="
    echo ""

    # Get Devtron URL
    local devtron_url=$(get_devtron_url "$DEVTRON_NAMESPACE")

    echo -e "${BLUE}📋 Access Information:${NC}"
    echo "   URL: ${devtron_url}"
    echo "   Namespace: $DEVTRON_NAMESPACE"
    echo ""
    echo -e "${BLUE}🔧 Useful Commands:${NC}"
    echo "   View status: kubectl get all -n $DEVTRON_NAMESPACE"
    echo "   View logs: kubectl logs -f deployment/devtron -n $DEVTRON_NAMESPACE"
    echo "   Port forward: kubectl port-forward svc/devtron-service -n $DEVTRON_NAMESPACE 32000:80"
    echo ""
    echo -e "${BLUE}📚 Next Steps:${NC}"
    echo "   1. Access Devtron at: ${devtron_url}"
    echo "   2. Complete the initial setup wizard"
    echo "   3. Configure your Git integrations"
    echo "   4. Set up your first application"
    echo ""
    echo -e "${GREEN}✅ Devtron is ready to use!${NC}"
}

show_help() {
    print_header
    echo -e "${CYAN}Devtron Operations Manager - Help & Documentation${NC}"
    echo ""

    echo -e "${BLUE}DESCRIPTION:${NC}"
    echo "   CDK installs Devtron automatically. This script helps you:"
    echo "   • Verify installations after CDK deployment"
    echo "   • Troubleshoot issues"
    echo "   • Get access information"
    echo "   • Monitor Devtron status"
    echo ""

    echo -e "${BLUE}ARCHITECTURE:${NC}"
    echo "   CDK → Installs infrastructure (Direct Installation)"
    echo "   Script → Installs Devtron OR Operations & troubleshooting"
    echo ""

    echo -e "${BLUE}MAIN FEATURES:${NC}"
    echo "   🔧 Verify Installation (after CDK deploy)"
    echo "   📊 Status Monitoring & Information"
    echo "   🔍 Comprehensive Troubleshooting"
    echo "   🔗 Access Information & URLs"
    echo "   📋 Useful Commands & Help"
    echo ""

    echo -e "${BLUE}USAGE:${NC}"
    echo "   ./devtron-manager.sh              # Interactive mode (recommended)"
    echo "   ./devtron-manager.sh --status     # Show status only"
    echo "   ./devtron-manager.sh --help       # Show this help"
    echo ""

    echo -e "${BLUE}TYPICAL WORKFLOW:${NC}"
    echo "   Method 1 - Direct Installation (Recommended):"
    echo "   1. cdk deploy                           # CDK installs EKS + Devtron"
    echo "   2. Access Devtron immediately"
    echo ""
    echo "   Method 2 - Script Installation:"
    echo "   1. cdk deploy -- installDevtronDirectly=false"
    echo "   2. ./devtron-manager.sh (option 1)       # Install Devtron via script"
    echo "   3. Access Devtron via provided URLs"
    echo ""

    echo -e "${BLUE}REQUIREMENTS:${NC}"
    echo "   • CDK deployment completed"
    echo "   • kubectl configured for cluster access"
    echo "   • AWS CLI configured (for CDK operations)"
    echo ""

    echo -e "${BLUE}FILES:${NC}"
    echo "   • outputs.json          # CDK deployment outputs"
    echo "   • cdk.out/             # CDK synthesis outputs"
    echo ""

    echo -e "${BLUE}SUPPORT:${NC}"
    echo "   For issues and questions:"
    echo "   • Check CDK deployment logs"
    echo "   • Use troubleshooting section in this script"
    echo "   • Review pod logs: kubectl logs -f deployment/devtron -n devtroncd"
    echo "   • Verify cluster access: kubectl cluster-info"
    echo ""

    read -p "Press Enter to return to main menu..."
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    # Check if running in non-interactive mode
    if [ $# -gt 0 ]; then
        case "$1" in
            --status)
                show_status
                ;;
            --help)
                show_help
                ;;
            *)
                echo "Usage: $0 [--status|--help]"
                echo ""
                echo "For interactive mode, run without arguments:"
                echo "  $0"
                exit 1
                ;;
        esac
        return
    fi

    # Interactive mode
    while true; do
        print_header
        show_main_menu
        read -p "Select an option (1-9): " choice

        case $choice in
            1)
                do_complete_installation
                ;;
            2)
                do_verify_installation
                ;;
            3)
                validate_installation
                ;;
            4)
                show_status
                ;;
            5)
                do_troubleshoot
                ;;
            6)
                do_get_access_info
                ;;
            7)
                show_useful_commands
                ;;
            8)
                show_help
                ;;
            9)
                echo -e "${GREEN}👋 Goodbye!${NC}"
                exit 0
                ;;
            *)
                print_error "Invalid choice. Please try again."
                ;;
        esac

        if [ "$choice" != "9" ]; then
            echo ""
            read -p "Press Enter to return to main menu..."
        fi
    done
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

# Function to validate installation health
validate_installation() {
    print_section "Installation Health Check"

    local issues_found=0

    # Check cluster connectivity
    if ! kubectl cluster-info >/dev/null 2>&1; then
        print_error "❌ Cannot connect to Kubernetes cluster"
        ((issues_found++))
    else
        print_success "✅ Cluster connectivity OK"
    fi

    # Check namespace
    if ! kubectl get namespace "$DEVTRON_NAMESPACE" >/dev/null 2>&1; then
        print_error "❌ Devtron namespace '$DEVTRON_NAMESPACE' does not exist"
        ((issues_found++))
    else
        print_success "✅ Devtron namespace exists"
    fi

    # Check Helm release
    if ! helm list -n "$DEVTRON_NAMESPACE" | grep -q devtron; then
        print_error "❌ Devtron Helm release not found"
        ((issues_found++))
    else
        print_success "✅ Devtron Helm release found"
    fi

    # Check pod status
    local total_pods=$(kubectl get pods -n "$DEVTRON_NAMESPACE" --no-headers 2>/dev/null | wc -l)
    local running_pods=$(kubectl get pods -n "$DEVTRON_NAMESPACE" --no-headers 2>/dev/null | grep "Running" | wc -l)

    if [ "$total_pods" -eq 0 ]; then
        print_error "❌ No pods found in Devtron namespace"
        ((issues_found++))
    elif [ "$running_pods" -ne "$total_pods" ]; then
        print_warning "⚠️  $running_pods/$total_pods pods are running"
        ((issues_found++))
    else
        print_success "✅ All $total_pods pods are running"
    fi

    # Check LoadBalancer
    local lb_status=$(kubectl get svc -n "$DEVTRON_NAMESPACE" --no-headers 2>/dev/null | grep LoadBalancer | awk '{print $4}')
    if [ -z "$lb_status" ]; then
        print_error "❌ No LoadBalancer service found"
        ((issues_found++))
    elif [[ "$lb_status" == "<pending>" ]]; then
        print_warning "⚠️  LoadBalancer is still provisioning (this may take 5-15 minutes)"
        ((issues_found++))
    else
        print_success "✅ LoadBalancer is active: $lb_status"
    fi

    # Check for orphaned resources
    local orphaned_pvcs=$(kubectl get pvc -n "$DEVTRON_NAMESPACE" --no-headers 2>/dev/null | grep -v "Bound" | wc -l)
    if [ "$orphaned_pvcs" -gt 0 ]; then
        print_warning "⚠️  Found $orphaned_pvcs orphaned PVCs (should be 0 with new configuration)"
        ((issues_found++))
    else
        print_success "✅ No orphaned PVCs found"
    fi

    # Summary
    print_section_end

    if [ $issues_found -eq 0 ]; then
        print_success "🎉 Installation health check PASSED - Devtron appears to be working correctly!"
        return 0
    else
        print_warning "⚠️  Found $issues_found issue(s) that may need attention"
        print_info "Run troubleshooting option 2 for advanced diagnostics"
        return 1
    fi
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
