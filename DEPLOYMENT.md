# BlackieFi 3.0 — Kubernetes Deployment Guide
# ═══════════════════════════════════════════════

## Architecture

```
Internet / LAN
      │
      ▼
┌──────────────────────────────────────────────────────────┐
│  Nginx Gateway (Deployment × 2)        Port 8080         │
│  NodePort 30080 — TLS, Rate Limiting, CORS, Logging      │
└──────────────────────────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────────────────────────┐
│  Gateway App — Node.js (Deployment × 2)  Port 8000       │
│  JWT Validation, Correlation IDs, Request Enrichment      │
└──────────────────────────────────────────────────────────┘
      │
      ├──► Auth    (Deployment × 2)  :8001
      ├──► Core    (Deployment × 2)  :8002
      ├──► Entity  (Deployment × 2)  :8003
      ├──► Portfolio(Deployment × 2)  :8004
      └──► Assets  (Deployment × 1)  :8005
            │
            ├──► MongoDB    (StatefulSet × 1) :27017  [PVC 10Gi]
            ├──► Redis      (Deployment × 1)  :6379   [PVC  2Gi]
            ├──► ChromaDB   (Deployment × 1)  :8000   [PVC  5Gi]
            └──► Ollama     (Deployment × 1)  :11434  [PVC 20Gi]
```

## Prerequisites

| Tool       | Minimum Version | Purpose                        |
|------------|-----------------|--------------------------------|
| kubectl    | 1.28+           | Cluster management             |
| Docker     | 24+             | Image builds                   |
| Jenkins    | 2.400+          | CI/CD orchestration            |
| k3s / k8s  | 1.28+           | Target cluster                 |
| Trivy      | 0.50+ (opt.)    | Image security scanning        |

## Quick Start (Manual — without Jenkins)

```bash
# 1. Build all images (from repo root)
./jenkins/scripts/build-images.sh registry.local:5000 v1.0.0

# 2. Push to your registry
./jenkins/scripts/push-images.sh registry.local:5000 v1.0.0

# 3. Update k8s/secrets.yaml with real base64-encoded values
#    echo -n 'my-real-secret' | base64

# 4. Set image references in manifests (deploy.sh does this automatically)
#    Or use kustomize with an overlay.

# 5. Deploy
./jenkins/scripts/deploy.sh registry.local:5000 v1.0.0

# 6. Verify
./jenkins/scripts/smoke-test.sh http://<NODE_IP>:30080
```

## Jenkins Setup

### 1. Install Required Plugins
- Pipeline
- Docker Pipeline
- Kubernetes CLI
- Credentials Binding

### 2. Configure Credentials (Manage Jenkins → Credentials)

| Credential ID              | Type              | Description                       |
|----------------------------|-------------------|-----------------------------------|
| `docker-registry-creds`   | Username/Password | Your container registry login     |
| `kubeconfig-homelab`       | Secret File       | ~/.kube/config for your cluster   |
| `blackiefi-jwt-secret`     | Secret Text       | JWT signing key (≥32 chars)       |
| `blackiefi-mongo-password` | Secret Text       | MongoDB root password             |

### 3. Create Pipeline Job
- New Item → Pipeline
- Pipeline definition: "Pipeline script from SCM"
- SCM: Git → your repo URL
- Script Path: `Jenkinsfile`

### 4. First Run
The pipeline accepts parameters (Registry, REACT_APP_BACKEND_URL, etc.).
The first build will prompt for these values.

## Accessing the Application

| Method     | URL                                         |
|------------|---------------------------------------------|
| NodePort   | `http://<any-node-ip>:30080`                |
| Ingress    | `https://blackiefi.local` (requires DNS)    |

For Ingress, add to your local DNS or `/etc/hosts`:
```
<NODE_IP>  blackiefi.local
```

## Storage Configuration

All PVCs default to `storageClassName: local-path` (k3s default).
Change in `k8s/storage/persistent-volumes.yaml` for your provisioner:

| Provisioner      | storageClassName   |
|------------------|--------------------|
| k3s default      | `local-path`       |
| Longhorn         | `longhorn`         |
| NFS CSI          | `nfs-client`       |
| OpenEBS          | `openebs-hostpath` |

## Scaling

```bash
# Scale any application service
kubectl -n blackiefi scale deployment auth --replicas=3
kubectl -n blackiefi scale deployment core --replicas=3

# Do NOT scale MongoDB beyond 1 without setting up a replica set
```

## Monitoring & Troubleshooting

```bash
# Pod status
kubectl -n blackiefi get pods -o wide

# Service logs
kubectl -n blackiefi logs -f deployment/auth
kubectl -n blackiefi logs -f deployment/gateway-app

# Describe a failing pod
kubectl -n blackiefi describe pod <pod-name>

# Port-forward for local debugging
kubectl -n blackiefi port-forward svc/mongo 27017:27017
kubectl -n blackiefi port-forward svc/nginx 8080:8080
```

## Rollback

```bash
# View deployment history
kubectl -n blackiefi rollout history deployment/auth

# Roll back to previous revision
kubectl -n blackiefi rollout undo deployment/auth

# Roll back all services at once
for svc in auth core entity portfolio assets gateway-app frontend nginx; do
  kubectl -n blackiefi rollout undo deployment/$svc 2>/dev/null || true
done
```

## File Structure

```
k8s/
├── namespace.yaml                 # blackiefi namespace
├── secrets.yaml                   # JWT secret, Mongo creds (base64)
├── kustomization.yaml             # Kustomize entrypoint
├── ingress.yaml                   # Optional Ingress resource
├── configmaps/
│   ├── app-config.yaml            # Shared env vars for all services
│   ├── nginx-config.yaml          # Nginx edge gateway config
│   └── mongo-init.yaml            # MongoDB init script
├── storage/
│   └── persistent-volumes.yaml    # PVCs for Mongo, Redis, Chroma, Ollama
├── data-layer/
│   ├── mongo.yaml                 # StatefulSet + headless Service
│   ├── redis.yaml                 # Deployment + Service
│   └── chroma.yaml                # Deployment + Service
├── ai-layer/
│   └── ollama.yaml                # Deployment + Service + model-pull Job
├── services/
│   ├── auth.yaml                  # Auth microservice
│   ├── core.yaml                  # Core microservice
│   ├── entity.yaml                # Entity microservice
│   ├── portfolio.yaml             # Portfolio microservice
│   └── assets.yaml                # Assets microservice
├── gateway/
│   ├── gateway-app.yaml           # Node.js API gateway
│   └── nginx.yaml                 # Nginx edge proxy (NodePort 30080)
└── frontend/
    └── frontend.yaml              # React SPA

jenkins/
├── scripts/
│   ├── build-images.sh            # Build all Docker images
│   ├── push-images.sh             # Push to registry
│   ├── deploy.sh                  # Apply K8s manifests with image substitution
│   └── smoke-test.sh              # Post-deploy health checks
└── environment.env                # Variable reference (not loaded, documentation only)

Jenkinsfile                        # Declarative pipeline definition
```
