#!/bin/bash

# =============================================================================
# EKS Setup - Centralized Script
# =============================================================================
# This script provides a complete setup experience for EKS cluster access
# Combines AWS profile configuration, kubectl setup, and validation
# =============================================================================

set -e

# Configuration
AWS_PROFILE="${AWS_PROFILE:-default}"
CLUSTER_NAME="devtron-dev-cluster"
AWS_REGION="us-east-1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                           EKS Setup - All-in-One                            ║${NC}"
    echo -e "${CYAN}║                     Configure AWS Profile & kubectl Access                  ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo -e "${BLUE}┌─ $1 ─────────────────────────────────────────────────────────────────────────┐${NC}"
}

print_section_end() {
    echo -e "${BLUE}└──────────────────────────────────────────────────────────────────────────────┘${NC}"
    echo ""
}

print_step() {
    echo -e "${YELLOW}➤ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# =============================================================================
# AWS Profile Configuration Functions
# =============================================================================

show_current_profile() {
    print_section "Current AWS Configuration"
    
    if [ -n "$AWS_PROFILE" ] && [ "$AWS_PROFILE" != "default" ]; then
        print_info "Current AWS_PROFILE: $AWS_PROFILE"
    else
        print_info "AWS_PROFILE is not set (will use 'default' profile)"
    fi
    
    echo ""
    print_step "Available AWS profiles:"
    if aws configure list-profiles 2>/dev/null; then
        echo ""
    else
        print_warning "No AWS profiles configured yet"
        echo ""
    fi
    
    print_section_end
}

configure_aws_profile() {
    print_section "AWS Profile Configuration"
    
    echo "Choose how to configure AWS access:"
    echo "1. Use existing profile (set AWS_PROFILE environment variable)"
    echo "2. Configure new SSO profile"
    echo "3. Configure new access key profile"
    echo "4. Skip AWS configuration"
    echo ""
    
    read -p "Enter your choice (1-4): " aws_choice
    
    case $aws_choice in
        1)
            configure_existing_profile
            ;;
        2)
            configure_sso_profile
            ;;
        3)
            configure_access_key_profile
            ;;
        4)
            print_info "Skipping AWS configuration"
            ;;
        *)
            print_error "Invalid choice. Skipping AWS configuration."
            ;;
    esac
    
    print_section_end
}

configure_existing_profile() {
    echo ""
    print_step "Available profiles:"
    aws configure list-profiles
    echo ""
    
    read -p "Enter the profile name you want to use: " profile_name
    
    if aws configure list-profiles | grep -q "^$profile_name$"; then
        export AWS_PROFILE="$profile_name"
        print_success "AWS_PROFILE set to '$profile_name' for this session"
        
        echo ""
        read -p "Make this permanent? (y/n): " make_permanent
        if [[ $make_permanent =~ ^[Yy]$ ]]; then
            make_profile_permanent "$profile_name"
        fi
    else
        print_error "Profile '$profile_name' not found"
        return 1
    fi
}

configure_sso_profile() {
    echo ""
    read -p "Enter a name for your SSO profile: " profile_name
    
    print_step "Configuring SSO profile '$profile_name'..."
    
    echo ""
    echo "You'll be prompted for:"
    echo "- SSO session name (e.g., 'aws-session')"
    echo "- SSO start URL (your organization's SSO URL)"
    echo "- SSO region (e.g., 'us-east-1')"
    echo "- Account and role selection"
    echo ""
    
    read -p "Press Enter to continue..."
    
    if aws configure sso --profile "$profile_name"; then
        print_success "SSO profile '$profile_name' configured"
        
        print_step "Logging in to SSO..."
        if aws sso login --profile "$profile_name"; then
            export AWS_PROFILE="$profile_name"
            print_success "Successfully logged in to SSO"
            make_profile_permanent "$profile_name"
        else
            print_error "SSO login failed"
            return 1
        fi
    else
        print_error "SSO configuration failed"
        return 1
    fi
}

configure_access_key_profile() {
    echo ""
    read -p "Enter a name for your access key profile: " profile_name
    
    print_step "Configuring access key profile '$profile_name'..."
    
    echo ""
    echo "You'll be prompted for:"
    echo "- AWS Access Key ID"
    echo "- AWS Secret Access Key"
    echo "- Default region (recommend: us-east-1)"
    echo "- Default output format (recommend: json)"
    echo ""
    
    read -p "Press Enter to continue..."
    
    if aws configure --profile "$profile_name"; then
        export AWS_PROFILE="$profile_name"
        print_success "Access key profile '$profile_name' configured"
        make_profile_permanent "$profile_name"
    else
        print_error "Access key configuration failed"
        return 1
    fi
}

make_profile_permanent() {
    local profile_name="$1"
    
    # Detect shell
    if [[ "$SHELL" == *"zsh"* ]]; then
        echo "export AWS_PROFILE=$profile_name" >> ~/.zshrc
        print_success "Added 'export AWS_PROFILE=$profile_name' to ~/.zshrc"
        print_info "Restart your terminal or run: source ~/.zshrc"
    elif [[ "$SHELL" == *"bash"* ]]; then
        echo "export AWS_PROFILE=$profile_name" >> ~/.bashrc
        print_success "Added 'export AWS_PROFILE=$profile_name' to ~/.bashrc"
        print_info "Restart your terminal or run: source ~/.bashrc"
    else
        print_info "Manual setup required. Add this to your shell profile:"
        echo "export AWS_PROFILE=$profile_name"
    fi
}

# =============================================================================
# Validation Functions
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
    
    if [ "$all_good" = false ]; then
        echo ""
        print_error "Please install missing prerequisites before continuing"
        print_info "Installation instructions:"
        echo ""
        echo "macOS:"
        echo "  brew install awscli kubectl"
        echo ""
        echo "Linux:"
        echo "  # AWS CLI"
        echo "  curl \"https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip\" -o \"awscliv2.zip\""
        echo "  unzip awscliv2.zip && sudo ./aws/install"
        echo "  # kubectl"
        echo "  curl -LO \"https://dl.k8s.io/release/\$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl\""
        echo "  sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl"
        echo ""
        exit 1
    fi
    
    print_section_end
}

validate_aws_access() {
    print_section "AWS Access Validation"
    
    print_step "Testing AWS access with profile '${AWS_PROFILE}'..."
    
    if ! aws sts get-caller-identity --profile "$AWS_PROFILE" &> /dev/null; then
        print_error "Cannot access AWS with profile '$AWS_PROFILE'"
        
        # Try to help with SSO
        if aws configure get sso_start_url --profile "$AWS_PROFILE" &> /dev/null; then
            print_info "This appears to be an SSO profile. Trying to login..."
            if aws sso login --profile "$AWS_PROFILE"; then
                print_success "SSO login successful"
            else
                print_error "SSO login failed"
                return 1
            fi
        else
            print_error "Please check your AWS credentials"
            return 1
        fi
    fi
    
    local caller_identity=$(aws sts get-caller-identity --profile "$AWS_PROFILE" --output text --query 'Arn')
    print_success "AWS access validated"
    print_info "Authenticated as: $caller_identity"
    
    print_section_end
}

check_cluster_exists() {
    print_section "EKS Cluster Validation"
    
    print_step "Checking if EKS cluster '$CLUSTER_NAME' exists..."
    
    if ! aws eks describe-cluster --name "$CLUSTER_NAME" --region "$AWS_REGION" --profile "$AWS_PROFILE" &> /dev/null; then
        print_error "EKS cluster '$CLUSTER_NAME' not found in region '$AWS_REGION'"
        
        print_info "Available clusters:"
        aws eks list-clusters --region "$AWS_REGION" --profile "$AWS_PROFILE" --query 'clusters' --output table
        
        echo ""
        read -p "Enter the correct cluster name (or press Enter to exit): " correct_name
        if [ -n "$correct_name" ]; then
            CLUSTER_NAME="$correct_name"
            check_cluster_exists  # Recursive call with new name
        else
            exit 1
        fi
        return
    fi
    
    local cluster_status=$(aws eks describe-cluster --name "$CLUSTER_NAME" --region "$AWS_REGION" --profile "$AWS_PROFILE" --query 'cluster.status' --output text)
    
    if [ "$cluster_status" != "ACTIVE" ]; then
        print_error "EKS cluster '$CLUSTER_NAME' is not in ACTIVE state. Current status: $cluster_status"
        exit 1
    fi
    
    print_success "EKS cluster '$CLUSTER_NAME' is active and accessible"
    
    print_section_end
}

# =============================================================================
# kubectl Setup Functions
# =============================================================================

configure_kubectl() {
    print_section "kubectl Configuration"
    
    print_step "Configuring kubectl for EKS cluster '$CLUSTER_NAME'..."
    
    # Update kubeconfig
    aws eks update-kubeconfig \
        --region "$AWS_REGION" \
        --name "$CLUSTER_NAME" \
        --profile "$AWS_PROFILE"
    
    print_success "kubectl configured successfully"
    
    print_section_end
}

test_kubectl_access() {
    print_section "kubectl Access Test"
    
    print_step "Testing kubectl connection to the cluster..."
    
    # Test basic connectivity
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
        print_info "This might be due to network connectivity or access permissions"
        return 1
    fi
    
    print_success "kubectl can connect to the cluster"
    
    # Get cluster info
    echo ""
    print_step "Cluster information:"
    kubectl cluster-info
    echo ""
    
    # Get nodes
    print_step "Cluster nodes:"
    kubectl get nodes -o wide
    echo ""
    
    # Get current context
    local current_context=$(kubectl config current-context)
    print_success "Current kubectl context: $current_context"
    
    print_section_end
}

# =============================================================================
# Information Display Functions
# =============================================================================

display_summary() {
    print_section "Setup Summary"
    
    echo -e "${GREEN}✅ Setup completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Configuration:${NC}"
    echo "  • AWS Profile: $AWS_PROFILE"
    echo "  • EKS Cluster: $CLUSTER_NAME"
    echo "  • AWS Region: $AWS_REGION"
    echo "  • kubectl Context: $(kubectl config current-context 2>/dev/null || echo 'Not configured')"
    echo ""
    
    print_section_end
}

display_useful_commands() {
    print_section "Useful Commands"
    
    echo -e "${BLUE}# Cluster Management:${NC}"
    echo "kubectl get nodes -o wide"
    echo "kubectl get pods --all-namespaces"
    echo "kubectl cluster-info"
    echo ""
    
    echo -e "${BLUE}# AWS EKS Commands:${NC}"
    echo "aws eks list-clusters --region $AWS_REGION --profile $AWS_PROFILE"
    echo "aws eks describe-cluster --name $CLUSTER_NAME --profile $AWS_PROFILE"
    echo "aws eks list-addons --cluster-name $CLUSTER_NAME --profile $AWS_PROFILE"
    echo ""
    
    echo -e "${BLUE}# Context Management:${NC}"
    echo "kubectl config current-context"
    echo "kubectl config get-contexts"
    echo "kubectl config use-context $(kubectl config current-context 2>/dev/null || echo 'CONTEXT_NAME')"
    echo ""
    
    echo -e "${BLUE}# AWS Profile Management:${NC}"
    echo "aws configure list-profiles"
    echo "aws sts get-caller-identity --profile $AWS_PROFILE"
    echo "aws sso login --profile $AWS_PROFILE  # For SSO profiles"
    echo ""
    
    print_section_end
}

# =============================================================================
# Main Menu Functions
# =============================================================================

show_main_menu() {
    echo ""
    echo "What would you like to do?"
    echo "1. Complete setup (AWS + kubectl)"
    echo "2. Configure AWS profile only"
    echo "3. Configure kubectl only (requires AWS already configured)"
    echo "4. Quick kubectl setup (skip validations)"
    echo "5. Show current configuration"
    echo "6. Exit"
    echo ""
}

quick_kubectl_setup() {
    print_section "Quick kubectl Setup"
    
    print_step "Setting up kubectl access to EKS cluster..."
    
    # Configure kubectl
    aws eks update-kubeconfig \
        --region "$AWS_REGION" \
        --name "$CLUSTER_NAME" \
        --profile "$AWS_PROFILE"
    
    print_success "kubectl configured successfully!"
    
    print_step "Testing connection..."
    kubectl get nodes
    
    echo ""
    print_success "🎉 Ready to use kubectl with your EKS cluster!"
    print_info "Current context: $(kubectl config current-context)"
    
    print_section_end
}

show_current_config() {
    print_section "Current Configuration"
    
    echo -e "${BLUE}Environment Variables:${NC}"
    echo "  AWS_PROFILE: ${AWS_PROFILE:-'not set'}"
    echo "  AWS_DEFAULT_REGION: ${AWS_DEFAULT_REGION:-'not set'}"
    echo ""
    
    echo -e "${BLUE}AWS Configuration:${NC}"
    if aws sts get-caller-identity --profile "$AWS_PROFILE" &> /dev/null; then
        local identity=$(aws sts get-caller-identity --profile "$AWS_PROFILE" --output text --query 'Arn')
        echo "  ✅ AWS Access: Working"
        echo "  Identity: $identity"
    else
        echo "  ❌ AWS Access: Failed"
    fi
    echo ""
    
    echo -e "${BLUE}kubectl Configuration:${NC}"
    if kubectl cluster-info &> /dev/null; then
        echo "  ✅ kubectl Access: Working"
        echo "  Current Context: $(kubectl config current-context)"
    else
        echo "  ❌ kubectl Access: Failed"
    fi
    echo ""
    
    echo -e "${BLUE}EKS Cluster Status:${NC}"
    if aws eks describe-cluster --name "$CLUSTER_NAME" --region "$AWS_REGION" --profile "$AWS_PROFILE" &> /dev/null; then
        local status=$(aws eks describe-cluster --name "$CLUSTER_NAME" --region "$AWS_REGION" --profile "$AWS_PROFILE" --query 'cluster.status' --output text)
        echo "  ✅ Cluster '$CLUSTER_NAME': $status"
    else
        echo "  ❌ Cluster '$CLUSTER_NAME': Not found or inaccessible"
    fi
    
    print_section_end
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    print_header
    
    # If arguments provided, run in non-interactive mode
    if [ $# -gt 0 ]; then
        case "$1" in
            --quick)
                check_prerequisites
                quick_kubectl_setup
                ;;
            --full)
                check_prerequisites
                show_current_profile
                validate_aws_access
                check_cluster_exists
                configure_kubectl
                test_kubectl_access
                display_summary
                display_useful_commands
                ;;
            --aws-only)
                check_prerequisites
                show_current_profile
                configure_aws_profile
                validate_aws_access
                ;;
            --kubectl-only)
                check_prerequisites
                validate_aws_access
                check_cluster_exists
                configure_kubectl
                test_kubectl_access
                ;;
            --status)
                show_current_config
                ;;
            *)
                echo "Usage: $0 [--quick|--full|--aws-only|--kubectl-only|--status]"
                exit 1
                ;;
        esac
        return
    fi
    
    # Interactive mode
    while true; do
        show_main_menu
        read -p "Enter your choice (1-6): " choice
        
        case $choice in
            1)
                check_prerequisites
                show_current_profile
                configure_aws_profile
                validate_aws_access
                check_cluster_exists
                configure_kubectl
                test_kubectl_access
                display_summary
                display_useful_commands
                break
                ;;
            2)
                check_prerequisites
                show_current_profile
                configure_aws_profile
                validate_aws_access
                ;;
            3)
                check_prerequisites
                validate_aws_access
                check_cluster_exists
                configure_kubectl
                test_kubectl_access
                ;;
            4)
                check_prerequisites
                quick_kubectl_setup
                ;;
            5)
                show_current_config
                ;;
            6)
                print_info "Exiting..."
                exit 0
                ;;
            *)
                print_error "Invalid choice. Please try again."
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
        echo ""
    done
    
    echo ""
    print_success "🎉 Setup completed! Your EKS cluster is ready to use."
}

# =============================================================================
# Script Execution
# =============================================================================

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi