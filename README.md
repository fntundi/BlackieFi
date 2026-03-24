# BlackieFi Local Development

## Quick Start

```bash
# 1. Start everything
make up

# 2. Open browser
# Frontend: http://localhost:3000
# Backend:  http://localhost:8001/docs

# 3. Login
# Username: demo
# Password: user123
```

## Commands

| Command | Description |
|---------|-------------|
| `make up` | Start all services |
| `make down` | Stop all services |
| `make logs` | View all logs |
| `make build` | Rebuild images |
| `make clean` | Remove everything |
| `make health` | Check if services are running |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Docker Network                       │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  Frontend   │    │   Backend   │    │   MongoDB   │     │
│  │  (React)    │───▶│  (FastAPI)  │───▶│             │     │
│  │  :3000      │    │  :8001      │    │  :27017     │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
    localhost:3000      localhost:8001
```

## Environment Variables (Optional)

Create a `.env` file in the project root:

```env
JWT_SECRET=your-secret-key
EMERGENT_LLM_KEY=your-key
ALPHA_VANTAGE_API_KEY=your-key
COINGECKO_API_KEY=your-key
```

## Troubleshooting

**Services won't start:**
```bash
make clean
make build
make up
```

**Hot reload not working (WSL):**
The docker-compose.yml already sets `CHOKIDAR_USEPOLLING=true`. If issues persist, restart Docker Desktop.

**Port already in use:**
```bash
# Check what's using the port
lsof -i :3000
lsof -i :8001

# Kill the process or change ports in docker-compose.yml
```
