# BlackieFi - Premium Personal Finance Management

A comprehensive personal finance management platform with AI-powered insights, built with React, FastAPI, and MongoDB.

## 🚀 Features

### Core Features
- **Dashboard** - Financial overview with AI insights (when enabled)
- **Transactions** - Track income and expenses with auto-categorization
- **Accounts** - Manage multiple bank accounts and wallets
- **Budgets** - Create and track budgets with AI forecasting
- **Debts** - Track loans, credit cards, and payment schedules
- **Investments** - Monitor investment portfolio
- **Assets** - Track physical and digital assets
- **Goals** - Set and track financial goals with AI recommendations

### Advanced Features
- **Calendar** - Financial calendar with recurring transactions and bill reminders
- **Reports** - Generate P&L, Balance Sheet, Cash Flow, Budget vs Actual reports
- **Import/Export** - CSV and PDF bank statement import
- **Tax Planning** - AI-powered tax estimation and scenario planning
- **Groups** - Team-based access control (admin only)
- **Real-time Alerts** - Budget alerts and bill reminders via email/push notifications

### AI Integration
Supports multiple LLM providers (off by default):
- **Emergent** - Universal Key for GPT-5.2, Claude, Gemini
- **OpenRouter** - Access to 300+ models
- **Ollama** - Local LLM support for privacy

AI Features include:
- Anomaly detection in spending
- Cash flow forecasting
- Cost savings identification
- Smart budget generation
- Transaction auto-categorization
- Tax liability estimation

## 🛠️ Tech Stack

- **Frontend**: React 18, TanStack Query, Sonner, Lucide Icons
- **Backend**: Python 3.11, FastAPI, Pydantic
- **Database**: MongoDB
- **AI**: emergentintegrations library, OpenRouter API, Ollama

## 📦 Installation

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python server.py
```

### Frontend Setup
```bash
cd frontend
yarn install
yarn start
```

## 🔐 Test Credentials

For development and testing:
- **Username**: `demo`
- **Password**: `user123`
- **Role**: Admin

## 🔧 Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=blackiefi
JWT_SECRET=your-secret-key
EMERGENT_LLM_KEY=your-emergent-key  # Optional, for AI features
OPENROUTER_API_KEY=your-key         # Optional, for OpenRouter
RESEND_API_KEY=your-key             # Optional, for email notifications
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

## 📁 Project Structure

```
/app
├── backend/
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic (LLM, notifications)
│   ├── server.py        # FastAPI application
│   ├── models.py        # Pydantic models
│   ├── database.py      # MongoDB connection
│   └── auth.py          # Authentication utilities
├── frontend/
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── components/  # Reusable components
│   │   ├── api/         # API client
│   │   └── contexts/    # React contexts
│   └── public/
└── README.md
```

## 🎨 Theme

BlackieFi uses a luxury dark theme:
- **Primary Gold**: #D4AF37
- **Background**: #050505, #0A0A0A, #0F0F0F
- **Text**: #F5F5F5, #A3A3A3, #737373, #525252
- **Success**: #059669
- **Error**: #DC2626
- **Info**: #3B82F6

## 📄 License

Proprietary - All rights reserved.

## 🤝 Support

For support, contact the development team.
