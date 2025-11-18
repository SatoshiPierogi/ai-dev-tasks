#!/bin/bash

# ============================================================================
# LOCAL DEVELOPMENT SETUP SCRIPT
# Sets up the development environment
# Usage: ./scripts/setup.sh
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

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

# ============================================================================
# CHECK SYSTEM REQUIREMENTS
# ============================================================================

check_node_version() {
  print_info "Checking Node.js version..."

  if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
  fi

  local version=$(node -v)
  print_success "Node.js $version found"
}

check_npm_version() {
  print_info "Checking npm version..."

  if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
  fi

  local version=$(npm -v)
  print_success "npm $version found"
}

check_git() {
  print_info "Checking git..."

  if ! command -v git &> /dev/null; then
    print_error "git is not installed"
    exit 1
  fi

  print_success "git found"
}

check_docker() {
  print_info "Checking Docker..."

  if ! command -v docker &> /dev/null; then
    print_warning "Docker is not installed. Docker Compose setup will be skipped."
    return
  fi

  local version=$(docker --version)
  print_success "$version found"
}

# ============================================================================
# SETUP ENVIRONMENT
# ============================================================================

setup_env_file() {
  print_info "Setting up environment file..."

  if [ ! -f .env ]; then
    cp .env.example .env
    print_success ".env file created from .env.example"
    print_warning "Please edit .env with your API keys and configuration"
  else
    print_info ".env file already exists"
  fi
}

# ============================================================================
# INSTALL DEPENDENCIES
# ============================================================================

install_dependencies() {
  print_info "Installing dependencies..."

  print_info "Installing root dependencies..."
  npm install

  print_info "Installing backend dependencies..."
  cd backend
  npm install
  cd ..

  print_info "Installing frontend dependencies..."
  cd frontend
  npm install
  cd ..

  print_success "Dependencies installed"
}

# ============================================================================
# SETUP DATABASE
# ============================================================================

setup_database() {
  print_info "Setting up database..."

  if ! command -v docker &> /dev/null; then
    print_warning "Docker not found. Skipping Docker-based database setup"
    print_info "Please set up PostgreSQL manually and configure DATABASE_URL in .env"
    return
  fi

  # Check if postgres container already running
  if docker ps | grep -q agent-audit-postgres; then
    print_info "Database container already running"
    return
  fi

  print_info "Starting PostgreSQL container..."
  docker-compose up -d postgres redis

  # Wait for database to be ready
  print_info "Waiting for database to be ready..."
  for i in {1..30}; do
    if docker exec agent-audit-postgres pg_isready -U dev_user > /dev/null 2>&1; then
      print_success "Database is ready"
      break
    fi
    if [ $i -eq 30 ]; then
      print_error "Database did not become ready in time"
      exit 1
    fi
    sleep 1
  done

  # Run migrations
  print_info "Running database migrations..."
  # cd backend && npm run db:migrate && cd .. || true
}

# ============================================================================
# VERIFY SETUP
# ============================================================================

verify_setup() {
  print_info "Verifying setup..."

  # Check if node_modules exist
  if [ -d "node_modules" ] && [ -d "backend/node_modules" ] && [ -d "frontend/node_modules" ]; then
    print_success "Dependencies installed"
  else
    print_error "Some dependencies are missing"
    return 1
  fi

  # Check if .env file exists
  if [ -f ".env" ]; then
    print_success ".env file exists"
  else
    print_error ".env file not found"
    return 1
  fi

  print_success "Setup verification passed"
}

# ============================================================================
# PRINT NEXT STEPS
# ============================================================================

print_next_steps() {
  echo ""
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}Setup Complete!${NC}"
  echo -e "${GREEN}========================================${NC}"
  echo ""
  echo "Next steps:"
  echo ""
  echo "1. Configure environment:"
  echo "   ${BLUE}nano .env${NC}"
  echo ""
  echo "2. Start development servers:"
  echo "   ${BLUE}npm run dev${NC}"
  echo ""
  echo "3. Or start with Docker:"
  echo "   ${BLUE}docker-compose up${NC}"
  echo ""
  echo "4. Access services:"
  echo "   Frontend:     http://localhost:3000"
  echo "   Backend API:  http://localhost:3001"
  echo "   Mock Server:  http://localhost:3002"
  echo ""
  echo "5. Run tests:"
  echo "   ${BLUE}npm test${NC}"
  echo ""
  echo "6. View documentation:"
  echo "   ${BLUE}cat DEPLOYMENT.md${NC}"
  echo ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
  clear
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}Agent Audit Dashboard - Setup${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""

  check_node_version
  check_npm_version
  check_git
  check_docker

  echo ""
  setup_env_file

  echo ""
  install_dependencies

  echo ""
  setup_database

  echo ""
  verify_setup

  echo ""
  print_next_steps
}

# Run main
main "$@"
