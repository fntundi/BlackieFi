SHELL := /bin/bash

ENV_FILE ?= env/.env.prod
-include $(ENV_FILE)

LOCAL_BIN ?= $(HOME)/.local/bin
export PATH := $(LOCAL_BIN):$(PATH)

CLUSTER_NAME ?= blackiefi
REGISTRY_NAME ?= blackiefi-registry
REGISTRY_PORT ?= 5001
REGISTRY ?= k3d-$(REGISTRY_NAME):$(REGISTRY_PORT)
NAMESPACE ?= blackiefi
K3D_CONFIG_TEMPLATE ?= infra/k3d/cluster.yaml.tpl
K3D_SERVERS ?= 1
K3D_AGENTS ?= 1
HTTP_PORT ?= 80
HTTPS_PORT ?= 443

APP_SCHEME ?= http
APP_HOSTNAME ?= blackiefi.localhost
APP_BASE_URL ?= $(APP_SCHEME)://$(APP_HOSTNAME)
CORS_ORIGIN ?= $(APP_BASE_URL)

WEB_IMAGE ?= $(REGISTRY)/blackiefi-web:dev
API_IMAGE ?= $(REGISTRY)/blackiefi-api:dev
LLM_IMAGE ?= $(REGISTRY)/blackiefi-llm:dev

POSTGRES_PASSWORD ?= postgres
AUTOMATION_SHARED_KEY ?= blackiefi-local-automation-key
LLM_PROVIDER_TYPE ?= disabled
LLM_BASE_URL ?=
LLM_API_KEY ?=
LLM_MODEL ?= gpt-4.1-mini

.PHONY: help install-tools install-k3d cluster-up cluster-down build build-web build-api build-llm push-images deploy apply wait rollout restart secrets status url clean logs-api logs-web logs-llm

help:
	@printf "%s\n" \
	"make install-k3d     Install k3d into ~/.local/bin on Ubuntu/WSL" \
	"make install-tools   Alias for make install-k3d" \
	"make cluster-up      Create the local k3d cluster from infra/k3d/cluster.yaml.tpl" \
	"make build           Build all application images" \
	"make push-images     Push images to the local k3d registry" \
	"make deploy          Build, push, apply manifests, and wait for rollout" \
	"env file            $(ENV_FILE)" \
	"make url             Print the local application URL" \
	"make cluster-down    Delete the local cluster" \
	"make clean           Delete the cluster and local registry"

install-tools: install-k3d

install-k3d:
	mkdir -p "$(LOCAL_BIN)"
	K3D_INSTALL_DIR="$(LOCAL_BIN)" USE_SUDO=false curl -fsSL https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash

cluster-up:
	@set -euo pipefail; \
	if ! k3d registry list | grep -q "^k3d-$(REGISTRY_NAME)\b"; then \
		k3d registry create $(REGISTRY_NAME) --port $(REGISTRY_PORT); \
	fi; \
	if ! k3d cluster list | grep -q "^$(CLUSTER_NAME)\b"; then \
		tmpfile=$$(mktemp); \
		trap 'rm -f "$$tmpfile"' EXIT; \
		sed \
			-e 's|__CLUSTER_NAME__|$(CLUSTER_NAME)|g' \
			-e 's|__K3D_SERVERS__|$(K3D_SERVERS)|g' \
			-e 's|__K3D_AGENTS__|$(K3D_AGENTS)|g' \
			-e 's|__HTTP_PORT__|$(HTTP_PORT)|g' \
			-e 's|__HTTPS_PORT__|$(HTTPS_PORT)|g' \
			$(K3D_CONFIG_TEMPLATE) > "$$tmpfile"; \
		k3d cluster create --config "$$tmpfile" --registry-use $(REGISTRY); \
	fi; \
	kubectl create namespace $(NAMESPACE) --dry-run=client -o yaml | kubectl apply -f -

cluster-down:
	-k3d cluster delete $(CLUSTER_NAME)

build: build-web build-api build-llm

build-web:
	docker build -t $(WEB_IMAGE) .

build-api:
	docker build -t $(API_IMAGE) apps/api

build-llm:
	docker build -t $(LLM_IMAGE) services/llm-mcp

push-images:
	docker push $(WEB_IMAGE)
	docker push $(API_IMAGE)
	docker push $(LLM_IMAGE)

secrets:
	kubectl -n $(NAMESPACE) create secret generic blackiefi-secrets \
		--from-literal=postgres-password='$(POSTGRES_PASSWORD)' \
		--from-literal=automation-key='$(AUTOMATION_SHARED_KEY)' \
		--from-literal=llm-provider-type='$(LLM_PROVIDER_TYPE)' \
		--from-literal=llm-base-url='$(LLM_BASE_URL)' \
		--from-literal=llm-api-key='$(LLM_API_KEY)' \
		--from-literal=llm-model='$(LLM_MODEL)' \
		--dry-run=client -o yaml | kubectl apply -f -

apply: secrets
	kubectl apply -f infra/k8s/namespace.yaml
	kubectl apply -f infra/k8s/postgres.yaml
	kubectl apply -f infra/k8s/llm-service.yaml
	sed \
		-e 's|__APP_SCHEME__|$(APP_SCHEME)|g' \
		-e 's|__APP_HOSTNAME__|$(APP_HOSTNAME)|g' \
		-e 's|__APP_BASE_URL__|$(APP_BASE_URL)|g' \
		-e 's|__CORS_ORIGIN__|$(CORS_ORIGIN)|g' \
		infra/k8s/api.yaml | kubectl apply -f -
	kubectl apply -f infra/k8s/web.yaml
	sed -e 's|__APP_HOSTNAME__|$(APP_HOSTNAME)|g' infra/k8s/ingress.yaml | kubectl apply -f -
	kubectl apply -f infra/k8s/cronjob.yaml

wait:
	kubectl -n $(NAMESPACE) rollout status deploy/blackiefi-postgres --timeout=180s
	kubectl -n $(NAMESPACE) rollout status deploy/blackiefi-llm --timeout=180s
	kubectl -n $(NAMESPACE) rollout status deploy/blackiefi-api --timeout=180s
	kubectl -n $(NAMESPACE) rollout status deploy/blackiefi-web --timeout=180s

deploy: cluster-up build push-images apply wait url

rollout:
	kubectl -n $(NAMESPACE) get pods
	kubectl -n $(NAMESPACE) get ingress

restart:
	kubectl -n $(NAMESPACE) rollout restart deploy/blackiefi-api deploy/blackiefi-web deploy/blackiefi-llm

status:
	kubectl -n $(NAMESPACE) get all

url:
	@echo $(APP_BASE_URL)

logs-api:
	kubectl -n $(NAMESPACE) logs deploy/blackiefi-api -f

logs-web:
	kubectl -n $(NAMESPACE) logs deploy/blackiefi-web -f

logs-llm:
	kubectl -n $(NAMESPACE) logs deploy/blackiefi-llm -f

clean: cluster-down
	-k3d registry delete $(REGISTRY_NAME)
