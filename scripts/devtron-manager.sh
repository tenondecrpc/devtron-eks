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
OUTPUTS_FILE="outputs.json"
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

# Function to get CDK outputs
get_cdk_outputs() {
    print_section "Reading CDK Configuration"

    if [ ! -f "$OUTPUTS_FILE" ]; then
        print_error "CDK outputs file not found: $OUTPUTS_FILE"
        print_info "Run 'cdk deploy' first to generate the outputs"
        return 1
    fi

    # Try to extract Devtron configuration from CDK outputs
    local devtron_config=""

    # Look for DevtronConfigFile in outputs
    if command -v jq >/dev/null 2>&1; then
        devtron_config=$(jq -r '.DevtronStack?.DevtronConfigFile // empty' "$OUTPUTS_FILE" 2>/dev/null || echo "")
    fi

    if [ -z "$devtron_config" ]; then
        # Try alternative formats
        devtron_config=$(grep -o '"DevtronConfigFile":[^}]*' "$OUTPUTS_FILE" | sed 's/.*"DevtronConfigFile"://' | sed 's/,$//' 2>/dev/null || echo "")
    fi

    if [ -z "$devtron_config" ]; then
        print_error "Could not find DevtronConfigFile in CDK outputs"
        print_info "Make sure CDK deployment included Devtron configuration"
        return 1
    fi

    print_success "Found Devtron configuration in CDK outputs"
    echo "$devtron_config"
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

# Function to install Devtron
install_devtron_auto() {
    print_section "Devtron Installation"

    # Check if already installed
    if helm list -n "$DEVTRON_NAMESPACE" | grep -q devtron; then
        print_warning "Devtron is already installed. Skipping installation."
        return 0
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
    echo -e "${YELLOW}💡 Quick Start:${NC} Run '1' after CDK deploy for complete setup"
    echo ""

    echo -e "${GREEN}📦 INSTALLATION:${NC}"
    echo "1. 🚀 Complete Auto-Installation (CDK + Devtron)"
    echo ""

    echo -e "${BLUE}🔧 OPERATIONS:${NC}"
    echo "2. 🔧 Verify Installation (after CDK deploy)"
    echo "3. 📊 Show Status & Information"
    echo "4. 🔍 Troubleshoot Issues"
    echo ""

    echo -e "${PURPLE}🔗 ACCESS & UTILITIES:${NC}"
    echo "5. 🔗 Get Access Information"
    echo "6. 📋 Useful Commands"
    echo ""

    echo -e "${CYAN}❓ HELP:${NC}"
    echo "7. ❓ Help & Documentation"
    echo "8. Exit"
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
    echo "2. 📋 Show Pod Logs"
    echo "3. 📊 Show Events & Resources"
    echo "4. 🔙 Back to Main Menu"
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

    # Get CDK outputs
    local cdk_values
    if ! cdk_values=$(get_cdk_outputs); then
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

    # Check if Devtron is installed via CDK
    if ! helm list -n "$DEVTRON_NAMESPACE" | grep -q devtron; then
        print_error "Devtron is not installed. Please run 'cdk deploy' first."
        echo ""
        print_info "CDK should have installed Devtron automatically."
        print_info "Check your CDK deployment and try again."
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
        read -p "Select troubleshooting option (1-4): " choice

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
            3)
                # Show events and resources
                show_events
                print_section "Resource Usage"
                kubectl top pods -n "$DEVTRON_NAMESPACE" 2>/dev/null || print_warning "kubectl top not available"
                print_section_end
                ;;
            4)
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
    echo "   CDK → Installs infrastructure + Devtron"
    echo "   Script → Operations & troubleshooting"
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
    echo "   1. cdk deploy                    # CDK installs everything"
    echo "   2. ./devtron-manager.sh --status # Verify installation"
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
        read -p "Select an option (1-8): " choice

        case $choice in
            1)
                do_complete_installation
                ;;
            2)
                do_verify_installation
                ;;
            3)
                show_status
                ;;
            4)
                do_troubleshoot
                ;;
            5)
                do_get_access_info
                ;;
            6)
                show_useful_commands
                ;;
            7)
                show_help
                ;;
            8)
                echo -e "${GREEN}👋 Goodbye!${NC}"
                exit 0
                ;;
            *)
                print_error "Invalid choice. Please try again."
                ;;
        esac

        if [ "$choice" != "8" ]; then
            echo ""
            read -p "Press Enter to return to main menu..."
        fi
    done
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
