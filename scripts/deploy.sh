#!/bin/bash

# ============================================================================
# Enterprise AI Image Optimizer - Deployment Script (Enhanced)
# ============================================================================
# Usage: 
#   ./deploy.sh              # Deploy desarrollo
#   ./deploy.sh --prod       # Deploy producción
#   ./deploy.sh --migrate    # Solo migraciones
#   ./deploy.sh --status     # Ver estado
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.yml"
MODE="development"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --prod|--production)
            MODE="production"
            shift
            ;;
        --dev|--development)
            MODE="development"
            shift
            ;;
        --migrate|--db)
            ACTION="migrate"
            shift
            ;;
        --status)
            ACTION="status"
            shift
            ;;
        --logs)
            ACTION="logs"
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
    echo ""
    echo -e "${CYAN}Enterprise AI Image Optimizer - Deployment Script${NC}"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --prod, --production    Deploy to production environment"
    echo "  --dev, --development    Deploy to development environment"
    echo "  --migrate, --db         Run database migrations only"
    echo "  --status                Show service status"
    echo "  --logs                  Show logs (follow mode)"
    echo "  --help, -h              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                      # Deploy desarrollo"
    echo "  $0 --prod               # Deploy producción"
    echo "  $0 --migrate            # Solo migraciones"
    echo ""
}

check_docker() {
    log_info "Verificando Docker..."
    if ! command -v docker &> /dev/null; then
        log_error "Docker no está instalado."
        exit 1
    fi
    if ! docker info &> /dev/null; then
        log_error "Docker no está ejecutándose."
        exit 1
    fi
    log_success "Docker verificado"
}

check_env() {
    if [ "$MODE" = "production" ]; then
        if [ ! -f "$PROJECT_DIR/$ENV_FILE" ]; then
            log_error "Archivo $ENV_FILE no encontrado."
            log_info "Copia .env.example a $ENV_FILE y configura los valores."
            exit 1
        fi
        log_success "Archivo de producción encontrado"
    fi
}

generate_secrets() {
    log_info "Verificando secretos necesarios..."
    
    cd "$PROJECT_DIR"
    
    # Cargar variables de entorno
    if [ -f "$ENV_FILE" ]; then
        set -a
        source "$ENV_FILE"
        set +a
    fi
    
    # Generar NEXTAUTH_SECRET si no existe o es el valor por defecto
    if [ -z "$NEXTAUTH_SECRET" ] || [ "$NEXTAUTH_SECRET" = "your-auth-secret-key-min-32-chars" ]; then
        log_warn "Generando NEXTAUTH_SECRET..."
        NEW_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
        sed -i "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$NEW_SECRET|" "$ENV_FILE"
        log_success "NEXTAUTH_SECRET generado"
    fi
    
    # Generar contraseña de admin si no existe
    if [ -z "$ADMIN_PASSWORD" ] || [ "$ADMIN_PASSWORD" = "admin" ]; then
        log_warn "Generando contraseña de administrador..."
        NEW_PASS=$(openssl rand -base64 16 2>/dev/null | tr -dc 'a-zA-Z0-9' | head -c 20)
        sed -i "s|ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$NEW_PASS|" "$ENV_FILE"
        log_success "ADMIN_PASSWORD generado"
    fi
}

deploy() {
    log_info "Iniciando despliegue ($MODE)..."
    
    cd "$PROJECT_DIR"
    
    # Verificar Docker
    check_docker
    
    # Verificar entorno
    check_env
    
    # Generar secretos
    generate_secrets
    
    # Actualizar código si es git repo
    if [ -d ".git" ]; then
        log_info "Actualizando código..."
        git fetch origin 2>/dev/null || true
        git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || log_warn "No se pudo actualizar el repositorio"
    fi
    
    # Detener servicios existentes
    log_info "Deteniendo servicios existentes..."
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true
    
    # Construir
    log_info "Construyendo contenedores..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    
    # Iniciar
    log_info "Iniciando servicios..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Esperar a que estén disponibles
    log_info "Esperando servicios..."
    sleep 15
    
    # Migraciones
    log_info "Ejecutando migraciones..."
    docker-compose -f "$COMPOSE_FILE" exec -T app npx prisma migrate deploy 2>/dev/null || log_warn "Migraciones pueden haber fallado"
    
    # Verificar salud
    check_health
    
    show_summary
}

run_migrations() {
    log_info "Ejecutando migraciones de base de datos..."
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" exec -T app npx prisma migrate deploy
    log_success "Migraciones completadas"
}

check_status() {
    echo ""
    echo -e "${CYAN}Estado de Servicios${NC}"
    echo "================================"
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""
    check_health
}

check_health() {
    log_info "Verificando salud de servicios..."
    
    # Check App
    if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ App: OK${NC}"
    else
        echo -e "${RED}✗ App: FAIL${NC}"
    fi
    
    # Check Postgres
    if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Postgres: OK${NC}"
    else
        echo -e "${RED}✗ Postgres: FAIL${NC}"
    fi
    
    # Check Redis
    if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis: OK${NC}"
    else
        echo -e "${RED}✗ Redis: FAIL${NC}"
    fi
    
    # Check MinIO
    if curl -sf http://localhost:9000/minio/health/live > /dev/null 2>&1; then
        echo -e "${GREEN}✓ MinIO: OK${NC}"
    else
        echo -e "${RED}✗ MinIO: FAIL${NC}"
    fi
}

show_summary() {
    echo ""
    echo "============================================================"
    echo "  Deployment Completado"
    echo "============================================================"
    echo ""
    
    if [ "$MODE" = "production" ]; then
        log_success "Aplicación: https://${APP_HOST:-localhost}"
    else
        log_success "Aplicación: http://localhost:3000"
    fi
    log_success "Traefik Dashboard: http://localhost:8080"
    log_success "MinIO Console: http://localhost:9001"
    echo ""
    log_info "Credenciales:"
    echo "  Usuario: ${ADMIN_USER:-admin}"
    echo "  Contraseña: ${ADMIN_PASSWORD:-[generada]}"
    echo ""
    log_info "Comandos útiles:"
    echo "  Ver logs: ./deploy.sh --logs"
    echo "  Estado: ./deploy.sh --status"
    echo "  Migraciones: ./deploy.sh --migrate"
    echo ""
}

show_help() {
    echo ""
    echo -e "${CYAN}Enterprise AI Image Optimizer - Deployment Script${NC}"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --prod, --production    Deploy to production environment"
    echo "  --dev, --development    Deploy to development environment"
    echo "  --migrate, --db         Run database migrations only"
    echo "  --status                Show service status"
    echo "  --logs                  Show logs (follow mode)"
    echo "  --help, -h              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                      # Deploy desarrollo"
    echo "  $0 --prod               # Deploy producción"
    echo "  $0 --migrate            # Solo migraciones"
    echo ""
}

# Main execution
main() {
    echo ""
    echo "============================================================"
    echo "  Enterprise AI Image Optimizer - Deployment Script"
    echo "============================================================"
    echo ""
    
    case "${ACTION:-deploy}" in
        migrate)
            check_docker
            run_migrations
            ;;
        status)
            check_status
            ;;
        logs)
            cd "$PROJECT_DIR"
            docker-compose -f "$COMPOSE_FILE" logs -f
            ;;
        *)
            deploy
            ;;
    esac
}

main
