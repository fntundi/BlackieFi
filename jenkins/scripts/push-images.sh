#!/usr/bin/env bash
# push-images.sh — Push all BlackieFi images to the container registry
# Usage: ./jenkins/scripts/push-images.sh <registry> <tag>
set -euo pipefail

REGISTRY="${1:?Usage: push-images.sh <registry> <tag>}"
TAG="${2:?Usage: push-images.sh <registry> <tag>}"

SERVICES=(auth core entity portfolio assets gateway-app frontend)

echo "=== Pushing images to ${REGISTRY} ==="

for SVC in "${SERVICES[@]}"; do
  echo "--- Pushing blackiefi-${SVC}:${TAG} ---"
  docker push "${REGISTRY}/blackiefi-${SVC}:${TAG}"
  docker push "${REGISTRY}/blackiefi-${SVC}:latest"
done

echo "=== All images pushed ==="
