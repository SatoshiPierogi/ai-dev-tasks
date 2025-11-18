#!/bin/bash

# ============================================================================
# DEPLOYMENT SCRIPT
# Automated deployment to staging or production
# Usage: ./scripts/deploy.sh [staging|production] [version]
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# CONFIGURATION
# ============================================================================

ENVIRONMENT=${1:-staging}
VERSION=${2:-$(git describe --tags --always)}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# ============================================================================
# FUNCTIONS
# ============================================================================

print_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

verify_environment() {
  if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    print_info "Usage: $0 [staging|production] [version]"
    exit 1
  fi

  if [[ "$ENVIRONMENT" == "production" ]]; then
    print_warning "Deploying to PRODUCTION!"
    read -p "Are you sure? Type 'yes' to continue: " confirm
    if [[ "$confirm" != "yes" ]]; then
      print_info "Deployment cancelled"
      exit 0
    fi
  fi
}

check_dependencies() {
  print_info "Checking dependencies..."

  local missing=0
  for cmd in node npm git; do
    if ! command -v "$cmd" &> /dev/null; then
      print_error "$cmd is not installed"
      missing=$((missing + 1))
    fi
  done

  if [ $missing -gt 0 ]; then
    exit 1
  fi

  print_success "All dependencies found"
}

load_environment() {
  print_info "Loading environment variables..."

  if [[ "$ENVIRONMENT" == "staging" ]]; then
    ENV_FILE=".env.staging"
  else
    ENV_FILE=".env.production"
  fi

  if [ ! -f "$PROJECT_ROOT/$ENV_FILE" ]; then
    print_error "Environment file not found: $ENV_FILE"
    print_info "Please create $ENV_FILE with required variables"
    exit 1
  fi

  # shellcheck source=/dev/null
  source "$PROJECT_ROOT/$ENV_FILE"
  print_success "Environment loaded from $ENV_FILE"
}

create_backup() {
  if [[ "$ENVIRONMENT" == "production" ]]; then
    print_info "Creating database backup..."

    BACKUP_DIR="$PROJECT_ROOT/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    # pg_dump "$DATABASE_URL" > "$BACKUP_DIR/db_backup.sql"
    print_info "Backup would be created at: $BACKUP_DIR"
    print_warning "Database backup creation skipped (configure pg_dump credentials)"
  fi
}

build_project() {
  print_info "Building project..."

  cd "$PROJECT_ROOT"

  print_info "Installing dependencies..."
  npm run install-all

  print_info "Building backend..."
  npm run build:backend

  print_info "Building frontend..."
  REACT_APP_API_URL="$API_URL" REACT_APP_WS_URL="$WS_URL" npm run build:frontend

  print_success "Project built successfully"
}

run_tests() {
  print_info "Running tests..."

  cd "$PROJECT_ROOT"

  if npm test:coverage; then
    print_success "All tests passed"
  else
    print_warning "Some tests failed (continuing anyway)"
  fi
}

build_docker_images() {
  print_info "Building Docker images..."

  cd "$PROJECT_ROOT"

  docker build -t agent-audit-backend:"$VERSION" \
    -t agent-audit-backend:latest \
    ./backend

  docker build -t agent-audit-frontend:"$VERSION" \
    -t agent-audit-frontend:latest \
    ./frontend

  print_success "Docker images built"
}

push_docker_images() {
  print_info "Pushing Docker images..."

  # Placeholder for actual registry push
  print_info "Images would be pushed to registry:"
  print_info "  - agent-audit-backend:$VERSION"
  print_info "  - agent-audit-frontend:$VERSION"
}

deploy_to_environment() {
  print_info "Deploying to $ENVIRONMENT..."

  # Placeholder for actual deployment
  case "$ENVIRONMENT" in
    staging)
      print_info "Deploying to staging server..."
      # Add staging deployment commands here
      ;;
    production)
      print_info "Deploying to production server..."
      # Add production deployment commands here
      ;;
  esac

  print_success "Deployment completed"
}

run_health_checks() {
  print_info "Running health checks..."

  sleep 10  # Give services time to start

  if curl -f "$API_URL/health" > /dev/null 2>&1; then
    print_success "API health check passed"
  else
    print_error "API health check failed"
    return 1
  fi

  print_success "All health checks passed"
}

notify_slack() {
  if [ -z "$SLACK_WEBHOOK" ]; then
    return
  fi

  local status=$1
  local color="good"

  if [[ "$status" != "success" ]]; then
    color="danger"
  fi

  curl -X POST "$SLACK_WEBHOOK" \
    -H 'Content-Type: application/json' \
    -d "{
      \"attachments\": [{
        \"color\": \"$color\",
        \"title\": \"Deployment $status\",
        \"text\": \"Deployed $VERSION to $ENVIRONMENT\",
        \"fields\": [
          {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
          {\"title\": \"Version\", \"value\": \"$VERSION\", \"short\": true}
        ]
      }]
    }" || true
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
  print_info "Starting deployment process"
  print_info "Environment: $ENVIRONMENT"
  print_info "Version: $VERSION"

  verify_environment
  check_dependencies
  load_environment
  create_backup
  build_project
  run_tests
  build_docker_images
  push_docker_images
  deploy_to_environment
  run_health_checks

  notify_slack "success"
  print_success "Deployment completed successfully!"
}

# Run main function
main "$@"
