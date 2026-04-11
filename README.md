# Pulsa App - Full Stack Transaction System

## 📋 Project Overview
Website transaksi pulsa dengan arsitektur modern dan UI minimalist.

## 🏗️ Tech Stack
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: NestJS + TypeScript
- **Database**: PostgreSQL + Redis
- **Payment**: Xendit/Midtrans (Bank Transfer VA)
- **Deployment**: Vercel + Railway

## 📁 Project Structure
```
pulsa-app/
├── frontend/          # Next.js application
├── backend/           # NestJS API
├── package.json       # Root workspace configuration
└── README.md         # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL
- Redis

### Installation
```bash
# Clone and install dependencies
npm install

# Start development servers
npm run dev
```

### Development
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## 📦 Available Scripts
- `npm run dev` - Start both frontend and backend
- `npm run build` - Build both applications
- `npm run test` - Run all tests
- `npm run lint` - Lint all code

## 🎯 Features
- ✅ Transaksi pulsa all operator
- ✅ Bank transfer payment
- ✅ Modern minimalist UI
- ✅ Secure authentication
- ✅ Real-time notifications

## 🔧 Environment Variables
Copy `.env.example` to `.env` and configure:
- Database connections
- Payment gateway keys
- JWT secrets

## 📄 License
MIT License