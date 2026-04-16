#!/usr/bin/env bash
# deploy.sh — Deploy BlackieFi to Kubernetes
# Usage: ./jenkins/scripts/deploy.sh <registry> <tag> [kubeconfig-path]
set -euo pipefail

REGISTRY="${1:?Usage: deploy.sh <registry> <tag> [kubeconfig]}"
TAG="${2:?Usage: deploy.sh <registry> <tag> [kubeconfig]}"
KUBECONFIG_PATH="${3:-${KUBECONFIG:-$HOME/.kube/config}}"

export KUBECONFIG="${KUBECONFIG_PATH}"

echo "=== Deploying BlackieFi  tag=${TAG}  registry=${REGISTRY} ==="

SERVICES=(auth core entity portfolio assets gateway-app frontend)

# 1. Apply base manifests (namespace, configmaps, secrets, storage, data-layer, ai-layer, gateway/nginx)
echo "--- Applying base manifests ---"
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmaps/
kubectl apply -f k8s/storage/
kubectl apply -f k8s/data-layer/
kubectl apply -f k8s/ai-layer/

# 2. Wait for data layer readiness
echo "--- Waiting for MongoDB, Redis, ChromaDB ---"
kubectl -n blackiefi rollout status statefulset/mongo --timeout=120s  || true
kubectl -n blackiefi rollout status deployment/redis   --timeout=60s   || true
kubectl -n blackiefi rollout status deployment/chroma  --timeout=60s   || true

# 3. Deploy application services with image substitution
echo "--- Deploying application services ---"
for SVC in "${SERVICES[@]}"; do
  MANIFEST_DIR="k8s/services"
  if [[ "$SVC" == "gateway-app" ]]; then
    MANIFEST_DIR="k8s/gateway"
  elif [[ "$SVC" == "frontend" ]]; then
    MANIFEST_DIR="k8s/frontend"
  fi

  # Find the manifest file
  if [[ "$SVC" == "gateway-app" ]]; then
    MANIFEST="${MANIFEST_DIR}/gateway-app.yaml"
  elif [[ "$SVC" == "frontend" ]]; then
    MANIFEST="${MANIFEST_DIR}/frontend.yaml"
  else
    MANIFEST="${MANIFEST_DIR}/${SVC}.yaml"
  fi

  echo "  Applying ${MANIFEST} with image ${REGISTRY}/blackiefi-${SVC}:${TAG}"

  # Replace image placeholders and apply
  sed \
    -e "s|\${REGISTRY}|${REGISTRY}|g" \
    -e "s|\${IMAGE_TAG}|${TAG}|g" \
    "${MANIFEST}" | kubectl apply -f -
done

# 4. Deploy nginx edge gateway (uses stock nginx:alpine, no image substitution)
echo "--- Deploying Nginx edge gateway ---"
kubectl apply -f k8s/gateway/nginx.yaml

# 5. Deploy ingress (optional)
echo "--- Applying Ingress ---"
kubectl apply -f k8s/ingress.yaml || echo "Ingress apply skipped (controller may not be installed)"

# 6. Wait for rollout completion
echo "--- Waiting for rollout completion ---"
for SVC in "${SERVICES[@]}"; do
  DEPLOY_NAME="${SVC}"
  kubectl -n blackiefi rollout status deployment/"${DEPLOY_NAME}" --timeout=120s || true
done
kubectl -n blackiefi rollout status deployment/nginx --timeout=60s || true

echo ""
echo "=== Deployment complete ==="
kubectl -n blackiefi get pods -o wide
