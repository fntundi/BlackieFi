#!/bin/bash
# BlackieFi 3.0 - Microservices Deployment Script
# This script deploys the full microservices stack using Docker Compose

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     BlackieFi 3.0 - Microservices Deployment Script        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Determine docker compose command
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# Parse arguments
ACTION=${1:-"up"}
ENVIRONMENT=${2:-"development"}

# Set environment file
if [ "$ENVIRONMENT" == "production" ]; then
    ENV_FILE=".env.microservices.production"
else
    ENV_FILE=".env.microservices"
fi

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Warning: $ENV_FILE not found. Creating from example...${NC}"
    if [ -f ".env.microservices.example" ]; then
        cp .env.microservices.example $ENV_FILE
        echo -e "${GREEN}Created $ENV_FILE from example. Please update with your values.${NC}"
    else
        echo -e "${RED}Error: .env.microservices.example not found.${NC}"
        exit 1
    fi
fi

# Functions
start_services() {
    echo -e "${BLUE}Starting BlackieFi 3.0 Microservices...${NC}"
    echo ""
    
    # Build images
    echo -e "${YELLOW}Building Docker images...${NC}"
    $DOCKER_COMPOSE -f docker-compose.microservices.yml --env-file $ENV_FILE build
    
    # Start services
    echo -e "${YELLOW}Starting services...${NC}"
    $DOCKER_COMPOSE -f docker-compose.microservices.yml --env-file $ENV_FILE up -d
    
    echo ""
    echo -e "${GREEN}Services started successfully!${NC}"
    echo ""
    
    # Wait for services to be healthy
    echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
    sleep 10
    
    # Show status
    show_status
}

stop_services() {
    echo -e "${BLUE}Stopping BlackieFi 3.0 Microservices...${NC}"
    $DOCKER_COMPOSE -f docker-compose.microservices.yml --env-file $ENV_FILE down
    echo -e "${GREEN}Services stopped.${NC}"
}

restart_services() {
    echo -e "${BLUE}Restarting BlackieFi 3.0 Microservices...${NC}"
    stop_services
    start_services
}

show_status() {
    echo -e "${BLUE}Service Status:${NC}"
    echo ""
    $DOCKER_COMPOSE -f docker-compose.microservices.yml --env-file $ENV_FILE ps
    echo ""
    
    echo -e "${BLUE}Service Health:${NC}"
    echo ""
    
    # Check each service
    services=("gateway:8080" "auth-service:8001" "core-service:8002" "entity-service:8003" "portfolio-service:8004" "asset-service:8005")
    
    for service in "${services[@]}"; do
        name=$(echo $service | cut -d: -f1)
        port=$(echo $service | cut -d: -f2)
        
        if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
            echo -e "  ${GREEN}✓${NC} $name (port $port) - Healthy"
        else
            echo -e "  ${RED}✗${NC} $name (port $port) - Not responding"
        fi
    done
    echo ""
}

show_logs() {
    service=${2:-""}
    if [ -z "$service" ]; then
        $DOCKER_COMPOSE -f docker-compose.microservices.yml --env-file $ENV_FILE logs -f
    else
        $DOCKER_COMPOSE -f docker-compose.microservices.yml --env-file $ENV_FILE logs -f $service
    fi
}

cleanup() {
    echo -e "${YELLOW}Cleaning up Docker resources...${NC}"
    $DOCKER_COMPOSE -f docker-compose.microservices.yml --env-file $ENV_FILE down -v --rmi local
    echo -e "${GREEN}Cleanup complete.${NC}"
}

show_help() {
    echo "Usage: ./deploy.sh [ACTION] [ENVIRONMENT]"
    echo ""
    echo "Actions:"
    echo "  up          Start all services (default)"
    echo "  down        Stop all services"
    echo "  restart     Restart all services"
    echo "  status      Show service status"
    echo "  logs        Show logs (optionally specify service name)"
    echo "  cleanup     Stop services and remove volumes/images"
    echo "  help        Show this help message"
    echo ""
    echo "Environments:"
    echo "  development  Use .env.microservices (default)"
    echo "  production   Use .env.microservices.production"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh up"
    echo "  ./deploy.sh up production"
    echo "  ./deploy.sh logs gateway"
    echo "  ./deploy.sh status"
}

# Main
case "$ACTION" in
    up|start)
        start_services
        ;;
    down|stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "$@"
        ;;
    cleanup)
        cleanup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown action: $ACTION${NC}"
        show_help
        exit 1
        ;;
esac
