# Enterprise AI Image Optimizer - Deployment Makefile

# Configuration
PROJECT_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
ENV_FILE ?= .env.production
COMPOSE_FILE := docker-compose.yml

# Colors
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m

# Default target
.PHONY: help
help:
	@echo ""
	@echo "Enterprise AI Image Optimizer - Deployment Commands"
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  deploy           Deploy to production (requires $(ENV_FILE))"
	@echo "  deploy-dev       Deploy to development environment"
	@echo "  start            Start all services"
	@echo "  stop             Stop all services"
	@echo "  restart          Restart all services"
	@echo "  logs             View logs (use LOGS_OPTIONS for filters)"
	@echo "  status           Check service status"
	@echo "  db-migrate       Run database migrations"
	@echo "  db-seed          Seed the database"
	@echo "  build            Build all containers"
	@echo "  clean            Stop and remove all containers/volumes"
	@echo "  ingest-drive     Run Google Drive ingestion once"
	@echo "  ingest-drive:w   Run Google Drive ingestion in watch mode"
	@echo ""

# Development deployment
.PHONY: deploy-dev
deploy-dev:
	@echo "$(GREEN)[Deploy]$(NC) Deploying to development..."
	@$(MAKE) -C $(PROJECT_DIR) build
	@docker-compose -f $(COMPOSE_FILE) up -d

# Production deployment
.PHONY: deploy
deploy:
	@if [ ! -f "$(ENV_FILE)" ]; then \
		echo "$(RED)[Error]$(NC) $(ENV_FILE) not found. Please create it from .env.example"; \
		exit 1; \
	fi
	@echo "$(GREEN)[Deploy]$(NC) Deploying to production..."
	@docker-compose -f $(COMPOSE_FILE) down --remove-orphans
	@docker-compose -f $(COMPOSE_FILE) build --no-cache
	@docker-compose -f $(COMPOSE_FILE) up -d
	@$(MAKE) db-migrate

# Start services
.PHONY: start
start:
	@echo "$(GREEN)[Start]$(NC) Starting services..."
	@docker-compose -f $(COMPOSE_FILE) up -d

# Stop services
.PHONY: stop
stop:
	@echo "$(GREEN)[Stop]$(NC) Stopping services..."
	@docker-compose -f $(COMPOSE_FILE) down

# Restart services
.PHONY: restart
restart:
	@$(MAKE) stop
	@$(MAKE) start

# View logs
LOGS_OPTIONS ?=
.PHONY: logs
logs:
	@docker-compose -f $(COMPOSE_FILE) logs $(LOGS_OPTIONS) -f

# Check status
.PHONY: status
status:
	@docker-compose -f $(COMPOSE_FILE) ps

# Database migrations
.PHONY: db-migrate
db-migrate:
	@echo "$(GREEN)[DB]$(NC) Running database migrations..."
	@docker-compose -f $(COMPOSE_FILE) exec -T app npx prisma migrate deploy

# Database seed
.PHONY: db-seed
db-seed:
	@echo "$(GREEN)[DB]$(NC) Seeding database..."
	@docker-compose -f $(COMPOSE_FILE) exec -T app npx prisma db seed

# Build containers
.PHONY: build
build:
	@echo "$(GREEN)[Build]$(NC) Building containers..."
	@docker-compose -f $(COMPOSE_FILE) build --no-cache

# Clean everything
.PHONY: clean
clean:
	@echo "$(GREEN)[Clean]$(NC) Stopping and removing everything..."
	@docker-compose -f $(COMPOSE_FILE) down -v --remove-orphans
	@docker volume rm $$(docker volume ls -q --filter "name=enterprise-ai" 2>/dev/null) 2>/dev/null || true

# Google Drive Ingestion
.PHONY: ingest-drive
ingest-drive:
	@echo "$(GREEN)[Ingest]$(NC) Running Google Drive ingestion..."
	@docker-compose -f $(COMPOSE_FILE) exec -T app npm run ingest:drive

# Google Drive Ingestion Watch Mode
.PHONY: ingest-drive:w
ingest-drive:w:
	@echo "$(GREEN)[Ingest]$(NC) Running Google Drive ingestion in watch mode..."
	@docker-compose -f $(COMPOSE_FILE) exec -T app npm run ingest:drive:watch

# Health check
.PHONY: health
health:
	@echo "$(GREEN)[Health]$(NC) Checking service health..."
	@curl -sf http://localhost:3000/api/health > /dev/null && \
		echo "$(GREEN)App: OK$(NC)" || echo "$(RED)App: FAIL$(NC)"
	@docker-compose -f $(COMPOSE_FILE) exec -T redis redis-cli ping > /dev/null 2>&1 && \
		echo "$(GREEN)Redis: OK$(NC)" || echo "$(RED)Redis: FAIL$(NC)"
	@docker-compose -f $(COMPOSE_FILE) exec -T postgres pg_isready -U postgres > /dev/null 2>&1 && \
		echo "$(GREEN)Postgres: OK$(NC)" || echo "$(RED)Postgres: FAIL$(NC)"

# Pull latest images
.PHONY: pull
pull:
	@echo "$(GREEN)[Pull]$(NC) Pulling latest images..."
	@docker-compose -f $(COMPOSE_FILE) pull

# Update code and restart
.PHONY: update
update:
	@echo "$(GREEN)[Update]$(NC) Pulling latest code and restarting..."
	@git pull origin main
	@$(MAKE) build
	@$(MAKE) restart
	@$(MAKE) db-migrate
