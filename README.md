# SB0 Pay - Point of Sale System

A simple Point of Sale (PoS) system designed to be the easiest payment solution for shop owners. The system integrates with the AllPay API to generate payment links and displays QR codes for customers to scan and pay using their mobile devices.

## Features

- Simple registration and login for shop owners
- Quick payment amount entry with mobile-first design
- AllPay API integration for payment processing
- QR code generation for customer payments
- Transaction history and database storage
- Mobile-optimized Progressive Web App

## Tech Stack

- **Runtime**: Bun
- **Backend**: Elysia with TypeScript
- **Frontend**: React with TypeScript and Vite
- **Database**: PostgreSQL
- **Styling**: Tailwind CSS
- **Authentication**: JWT with HTTP-only cookies

## Project Structure

```
├── backend/                 # Elysia backend
│   ├── config/             # Configuration files
│   ├── controllers/        # API route handlers
│   ├── middleware/         # Authentication & validation
│   ├── services/           # Business logic
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Helper functions
│   └── index.ts            # Main server file
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API client services
│   │   └── types/          # TypeScript types
│   └── ...
└── ...
```

## Setup Instructions

> **📖 For detailed workspace setup and development guide, see [WORKSPACE_SETUP.md](./WORKSPACE_SETUP.md)**

### Prerequisites

- [Bun](https://bun.sh) >= 1.0.0 installed
- PostgreSQL >= 14.0 database running

### Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Setup environment
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# 3. Initialize database
bun run db:init

# 4. Start development servers
bun run dev
```

The backend will be available at `http://localhost:2894` and the frontend at `http://localhost:5173`.

### Available Scripts

```bash
# Development
bun run dev              # Start all services
bun run dev:backend      # Backend only
bun run dev:frontend     # Frontend only

# Building
bun run build            # Build all
bun run build:backend    # Build backend
bun run build:frontend   # Build frontend

# Testing
bun test                 # Run all tests
bun run test:backend     # Backend tests
bun run test:frontend    # Frontend tests

# Database
bun run db:migrate       # Run migrations
bun run db:status        # Check status
bun run db:reset         # Reset database

# Code Quality
bun run lint             # Lint all code
bun run type-check       # Type check all code
```

For more detailed information, see [WORKSPACE_SETUP.md](./WORKSPACE_SETUP.md).
- AllPay API credentials

### Installation

1. Clone the repository and install dependencies:
```bash
bun install
cd frontend && bun install
```

2. Set up environment variables:
```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

3. Update the `.env` files with your database and AllPay credentials.

4. Set up the PostgreSQL database (schema will be created in task 2).

### Development

Start the backend server:
```bash
bun run dev
```

Start the frontend development server:
```bash
bun run frontend:dev
```

The backend will run on http://localhost:3000 and the frontend on http://localhost:5173.

### Production Build

Build the frontend:
```bash
bun run frontend:build
```

Build and start the backend:
```bash
bun run build
bun run start
```

## Environment Variables

### Backend (.env)
- `DATABASE_URL`: PostgreSQL connection string
- `ALLPAY_API_URL`: AllPay API base URL
- `ALLPAY_LOGIN`: AllPay login credentials
- `ALLPAY_API_KEY`: AllPay API key
- `JWT_SECRET`: Secret key for JWT tokens
- `PORT`: Server port (default: 3000)

### Frontend (frontend/.env)
- `VITE_API_URL`: Backend API URL
- `VITE_APP_NAME`: Application name

## API Endpoints

- `GET /` - API server status
- `GET /health` - Health check endpoint
- More endpoints will be added as development progresses

## License

Private project for SB0 Pay system.