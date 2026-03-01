.PHONY: help up down down-v build rebuild logs dev-front dev-back install db-migrate db-push db-seed db-studio clean_db_dev

help: ## Show this help
	@egrep -h '\s##\s' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Docker commands
up: ## Start the Docker containers in background
	docker compose up -d

down: ## Stop the Docker containers
	docker compose down

down-v: ## Stop the Docker containers and remove volumes
	docker compose down -v

build: ## Build the Docker containers
	docker compose build

rebuild: ## Rebuild and start the Docker containers (removes volumes)
	docker compose down -v && docker compose up --build -d

logs: ## Show logs of Docker containers
	docker compose logs -f

api: ## Show logs of API container
	docker compose logs -f api

# Local development commands
dev-front: ## Start the frontend in development mode
	cd frontend && npm run dev

dev-back: ## Start the backend in development mode (if not already running via docker)
	docker compose up api

install: ## Install dependencies for frontend (backend deps are handled by docker build)
	cd frontend && npm install

# Database / Prisma commands
db-migrate: ## Run Prisma database migrations
	docker compose exec api npm run db:migrate

db-push: ## Push Prisma schema to the database
	docker compose exec api npm run db:push

db-seed: ## Seed the database
	docker compose exec api npm run db:seed

db-studio: ## Open Prisma Studio to inspect the database (Note: port 5555 must be exposed in docker-compose.yml)
	docker compose exec api npm run db:studio

clean_db_dev: ## Reset the database and load fixtures
	docker compose exec api npx prisma migrate reset --force
