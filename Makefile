# ============================================================
# KubePulse CloudOps Developer & SRE Automation Makefile
# Unified control plane for local dev, testing, IaC, and K8s
# ============================================================

.PHONY: help up down build status logs clean test lint simulate k8s-dryrun helm-template tf-validate

help: ## Display available management targets
	@echo "==========================================================="
	@echo "KubePulse CloudOps Platform: Developer & DevOps Automation"
	@echo "==========================================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

up: ## Start the full 3-tier production stack locally with Docker Compose
	docker compose up -d

down: ## Stop all running KubePulse containers and tear down network
	docker compose down

build: ## Rebuild all microservice images with zero cache
	docker compose build --no-cache

status: ## Check the real-time health and status of all microservices
	docker compose ps

logs: ## Tail streaming JSON logs across all services
	docker compose logs -f

clean: ## Stop containers, remove volumes, and clean local artifacts
	docker compose down -v --remove-orphans

test: ## Execute backend unit and integration test suite
	cd backend && npm test

lint: ## Run Helm lint and code quality verification
	helm lint helm/kubepulse

simulate: ## Run automated load and metrics generator (30s burst)
	node scripts/simulate-traffic.js

k8s-dryrun: ## Validate all Kubernetes manifests against cluster schema
	kubectl apply --dry-run=client -f k8s/base/namespace.yaml
	kubectl apply --dry-run=client -f k8s/base/mongodb/
	kubectl apply --dry-run=client -f k8s/base/backend/
	kubectl apply --dry-run=client -f k8s/base/frontend/
	kubectl apply --dry-run=client -f k8s/base/network-policy.yaml

helm-template: ## Render and verify production Helm chart templates
	helm template kubepulse-prod helm/kubepulse --values helm/kubepulse/values-prod.yaml

tf-validate: ## Initialize and validate Terraform AWS EKS infrastructure
	cd terraform && terraform init -backend=false && terraform validate
