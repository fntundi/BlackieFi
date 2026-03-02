# BlackieFi Observability Stack

## Quick Start

Start the observability stack (Prometheus + Grafana):

```bash
cd /app/observability
docker-compose up -d
```

## Access

- **Grafana**: http://localhost:3001
  - Username: `admin`
  - Password: `BlackieFi2024!`

- **Prometheus**: http://localhost:9090

## Pre-configured Dashboards

### BlackieFi API Dashboard
Located in Grafana under `BlackieFi` folder, includes:
- Request rate by endpoint
- P95 response time
- Status code distribution
- Authentication attempts
- LLM requests and latency
- Active requests gauge
- Error tracking

## Metrics Available

The BlackieFi API exposes the following metrics at `/metrics`:

### HTTP Metrics
- `blackiefi_http_requests_total` - Total HTTP requests by method, endpoint, status
- `blackiefi_http_request_duration_seconds` - Request latency histogram
- `blackiefi_http_requests_in_progress` - Currently processing requests

### Authentication Metrics
- `blackiefi_auth_attempts_total` - Login/logout attempts by type and success
- `blackiefi_active_sessions` - Current active user sessions

### Database Metrics
- `blackiefi_db_operations_total` - Database operations by type
- `blackiefi_db_operation_duration_seconds` - DB operation latency

### LLM Metrics
- `blackiefi_llm_requests_total` - LLM API calls by provider/model
- `blackiefi_llm_request_duration_seconds` - LLM response time
- `blackiefi_llm_tokens_total` - Token usage by type

### Business Metrics
- `blackiefi_entities_total` - Entity count by type
- `blackiefi_transactions_total` - Transaction count by type
- `blackiefi_portfolio_value_dollars` - Portfolio values

### Error Metrics
- `blackiefi_errors_total` - Application errors by type and location
- `blackiefi_rate_limit_hits_total` - Rate limit violations

## Configuration

### Prometheus
Edit `prometheus/prometheus.yml` to:
- Add additional scrape targets
- Configure alerting rules
- Adjust scrape intervals

### Grafana
- Dashboards auto-provision from `grafana/dashboards/`
- Add new dashboards as JSON files
- Custom plugins can be added via `GF_INSTALL_PLUGINS` env var

## Troubleshooting

Check if metrics are being collected:
```bash
curl http://localhost:8001/metrics
```

Check Prometheus targets:
```bash
curl http://localhost:9090/api/v1/targets
```

View Prometheus logs:
```bash
docker logs blackiefi-prometheus
```

View Grafana logs:
```bash
docker logs blackiefi-grafana
```
