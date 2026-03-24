# BlackieFi 3.0 - Local Development Guide

## Quick Start (Docker on WSL)

### Prerequisites
- Docker Desktop with WSL2 integration enabled
- Git

### 1. Clone and Navigate
```bash
git clone <your-repo-url>
cd BlackieFi
```

### 2. Create Environment File
```bash
cp .env.example .env
# Edit .env with your API keys (optional)
```

### 3. Start the Application
```bash
# Start all services (MongoDB, Redis, Backend, Frontend)
docker compose -f docker-compose.local.yml up -d

# View logs
docker compose -f docker-compose.local.yml logs -f

# Stop services
docker compose -f docker-compose.local.yml down
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Docs**: http://localhost:8001/docs

### 5. Default Login
- **Username**: `demo`
- **Password**: `user123`

---

## Makefile Commands

If you have `make` installed:

```bash
make help              # Show all commands
make local-up          # Start local development
make local-down        # Stop local development
make local-logs        # View logs
make health            # Check service health
```

---

## Manual Setup (Without Docker)

### Prerequisites
- Python 3.11+
- Node.js 20+
- MongoDB 7.0+
- Redis 7+

### Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.local.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup
```bash
cd frontend
npm install  # or: yarn install
npm start    # or: yarn start
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Required
JWT_SECRET=your-secret-key-here

# Optional - AI Features
EMERGENT_LLM_KEY=your-key

# Optional - Market Data
ALPHA_VANTAGE_API_KEY=your-key
COINGECKO_API_KEY=your-key

# Optional - Email
RESEND_API_KEY=your-key
```

---

## Troubleshooting

### Docker Build Fails
```bash
# Clean and rebuild
docker compose -f docker-compose.local.yml down -v
docker compose -f docker-compose.local.yml build --no-cache
docker compose -f docker-compose.local.yml up -d
```

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
docker ps | grep mongodb

# View MongoDB logs
docker logs blackiefi-mongodb
```

### Frontend Hot Reload Not Working (WSL)
The `CHOKIDAR_USEPOLLING=true` environment variable is already set in docker-compose.local.yml.
If issues persist, try restarting Docker Desktop.

### Port Already in Use
```bash
# Find and kill process on port 3000
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Or change ports in docker-compose.local.yml
```

---

## Project Structure

```
BlackieFi/
├── backend/                 # FastAPI Backend
│   ├── server.py           # Main application
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   └── requirements.local.txt
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   └── api/           # API client
│   └── package.json
├── docker-compose.local.yml  # Local development
├── docker-compose.yml        # Production (monolith)
├── docker-compose.microservices.yml  # Microservices
└── Makefile                  # Build commands
```

---

## Development Workflow

1. **Start services**: `docker compose -f docker-compose.local.yml up -d`
2. **Make code changes**: Files are mounted, changes auto-reload
3. **View logs**: `docker compose -f docker-compose.local.yml logs -f backend`
4. **Run tests**: `docker exec blackiefi-backend pytest`
5. **Stop services**: `docker compose -f docker-compose.local.yml down`

---

## Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [MongoDB Documentation](https://www.mongodb.com/docs/)
