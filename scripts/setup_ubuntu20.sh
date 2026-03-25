<<<<<<< HEAD
#!/usr/bin/env bash
set -euo pipefail

APP_USER="${APP_USER:-blackiefi}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log() {
  echo "[setup] $1"
}

if [[ "${EUID}" -ne 0 ]]; then
  log "Re-running with sudo..."
  exec sudo -E bash "$0" "$@"
fi

apt_updated=0
ensure_apt_update() {
  if [[ "${apt_updated}" -eq 0 ]]; then
    log "Running apt-get update..."
    apt-get update -y
    apt_updated=1
  fi
}

ensure_package() {
  local pkg="$1"
  if ! dpkg -s "$pkg" >/dev/null 2>&1; then
    ensure_apt_update
    log "Installing package: $pkg"
    apt-get install -y "$pkg"
  fi
}

log "Installing base dependencies..."
ensure_package ca-certificates
ensure_package curl
ensure_package gnupg
ensure_package lsb-release
ensure_package make
ensure_package git
ensure_package ufw

if ! command -v docker >/dev/null 2>&1; then
  log "Installing Docker Engine and Compose plugin..."
  ensure_apt_update
  install -m 0755 -d /etc/apt/keyrings
  sudo apt remove docker docker-engine docker.io containerd runc -y
  sudo apt autoremove -y

  sudo apt update
  sudo apt install ca-certificates curl gnupg lsb-release -y

  # Add repo trusted
  echo "deb [arch=$(dpkg --print-architecture) trusted=yes] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list

  sudo apt update

  sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y
else
  log "Docker already installed. Ensuring Compose plugin exists..."
  if ! docker compose version >/dev/null 2>&1; then
    ensure_apt_update
    apt-get install -y docker-compose-plugin
  fi
fi

log "Enabling Docker service..."
systemctl enable --now docker

if ! id -u "$APP_USER" >/dev/null 2>&1; then
  log "Creating user: $APP_USER"
  useradd -m -s /bin/bash "$APP_USER"
else
  log "User already exists: $APP_USER"
fi

log "Adding user to docker group..."
usermod -aG docker "$APP_USER"

log "Configuring UFW firewall rules..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
ufw allow 8001/tcp
if ufw status | grep -q "Status: inactive"; then
  log "Enabling UFW..."
  ufw --force enable
fi

if [[ -f "$REPO_DIR/.env.example" && ! -f "$REPO_DIR/.env" ]]; then
  log "Creating .env from .env.example"
  cp "$REPO_DIR/.env.example" "$REPO_DIR/.env"
fi

log "Setup complete. Next steps:"
log "1) Log out and back in (or run: newgrp docker) to activate docker group for $APP_USER"
log "2) From repo root, run: make build"
log "3) Then run: make up"
log "4) Open: http://localhost:3000"
log "5) Add EMERGENT_LLM_KEY / API keys in .env to enable AI + market data features"
=======
#!/usr/bin/env bash
set -euo pipefail

APP_USER="${APP_USER:-blackiefi}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log() {
  echo "[setup] $1"
}

if [[ "${EUID}" -ne 0 ]]; then
  log "Re-running with sudo..."
  exec sudo -E bash "$0" "$@"
fi

apt_updated=0
ensure_apt_update() {
  if [[ "${apt_updated}" -eq 0 ]]; then
    log "Running apt-get update..."
    apt-get update -y
    apt_updated=1
  fi
}

ensure_package() {
  local pkg="$1"
  if ! dpkg -s "$pkg" >/dev/null 2>&1; then
    ensure_apt_update
    log "Installing package: $pkg"
    apt-get install -y "$pkg"
  fi
}

log "Installing base dependencies..."
ensure_package ca-certificates
ensure_package curl
ensure_package gnupg
ensure_package lsb-release
ensure_package make
ensure_package git
ensure_package ufw

if ! command -v docker >/dev/null 2>&1; then
  log "Installing Docker Engine and Compose plugin..."
  ensure_apt_update
  install -m 0755 -d /etc/apt/keyrings
  sudo apt remove docker docker-engine docker.io containerd runc -y
  sudo apt autoremove -y

  sudo apt update
  sudo apt install ca-certificates curl gnupg lsb-release -y

  # Add repo trusted
  echo "deb [arch=$(dpkg --print-architecture) trusted=yes] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list

  sudo apt update

  sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y
else
  log "Docker already installed. Ensuring Compose plugin exists..."
  if ! docker compose version >/dev/null 2>&1; then
    ensure_apt_update
    apt-get install -y docker-compose-plugin
  fi
fi

log "Enabling Docker service..."
systemctl enable --now docker

if ! id -u "$APP_USER" >/dev/null 2>&1; then
  log "Creating user: $APP_USER"
  useradd -m -s /bin/bash "$APP_USER"
else
  log "User already exists: $APP_USER"
fi

log "Adding user to docker group..."
usermod -aG docker "$APP_USER"

log "Configuring UFW firewall rules..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
ufw allow 8001/tcp
if ufw status | grep -q "Status: inactive"; then
  log "Enabling UFW..."
  ufw --force enable
fi

if [[ -f "$REPO_DIR/.env.example" && ! -f "$REPO_DIR/.env" ]]; then
  log "Creating .env from .env.example"
  cp "$REPO_DIR/.env.example" "$REPO_DIR/.env"
fi

log "Setup complete. Next steps:"
log "1) Log out and back in (or run: newgrp docker) to activate docker group for $APP_USER"
log "2) From repo root, run: make build"
log "3) Then run: make up"
log "4) Open: http://localhost:3000"
log "5) Add EMERGENT_LLM_KEY / API keys in .env to enable AI + market data features"
>>>>>>> eca0309 (reverted mongodb to 4.4.29 due to avx requirements in 5.0 onward)
