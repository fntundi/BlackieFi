#!/usr/bin/env bash
# build-images.sh — Build all BlackieFi Docker images
# Usage: ./jenkins/scripts/build-images.sh <registry> <tag>
set -euo pipefail

REGISTRY="${1:?Usage: build-images.sh <registry> <tag>}"
TAG="${2:?Usage: build-images.sh <registry> <tag>}"

echo "=== Building BlackieFi images  registry=${REGISTRY}  tag=${TAG} ==="

declare -A SERVICES=(
  [auth]="services/auth/Dockerfile"
  [core]="services/core/Dockerfile"
  [entity]="services/entity/Dockerfile"
  [portfolio]="services/portfolio/Dockerfile"
  [assets]="services/assets/Dockerfile"
  [gateway-app]="services/gateway-app/Dockerfile"
  [frontend]="frontend/Dockerfile.docker"
)

for SVC in "${!SERVICES[@]}"; do
  DOCKERFILE="${SERVICES[$SVC]}"
  IMAGE="${REGISTRY}/blackiefi-${SVC}:${TAG}"
  echo ""
  echo "--- Building ${IMAGE} from ${DOCKERFILE} ---"

  BUILD_ARGS=""
  if [[ "$SVC" == "frontend" ]]; then
    BUILD_ARGS="--build-arg REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL:-https://blackiefi.local}"
  fi

  docker build ${BUILD_ARGS} -t "${IMAGE}" -f "${DOCKERFILE}" .

  # Also tag as :latest for convenience
  docker tag "${IMAGE}" "${REGISTRY}/blackiefi-${SVC}:latest"
done

echo ""
echo "=== All images built successfully ==="
