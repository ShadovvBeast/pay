# Workspace Setup Guide

This project uses **Bun workspaces** for monorepo management, providing fast package management and optimal development experience.

## Prerequisites

- **Bun** >= 1.0.0 ([Install Bun](https://bun.sh/docs/installation))
- **PostgreSQL** >= 14.0 (for database)

## Project Structure

```
sb0-pay/
├── backend/          # Backend API (Elysia + TypeScript)
├── frontend/         # Frontend Web App (React + Vite)
├── scripts/          # Utility scripts
├── bunfig.toml       # Bun configuration
├── tsconfig.json     # Root TypeScript config
└── package.json      # Root workspace config
```

## Installation

### 1. Install Dependencies

```bash
# Install all workspace dependencies
bun install
```

This will install dependencies for both backend and frontend workspaces.

### 2. Environment Setup

```bash
# Backend environment
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# Frontend environment (if needed)
cp frontend/.env.example frontend/.env
```

### 3. Database Setup

```bash
# Initialize database and run migrations
bun run db:init

# Or run migrations separately
bun run db:migrate
```

## Development

### Start All Services

```bash
# Start both backend and frontend in development mode
bun run dev
```

### Start Individual Services

```bash
# Backend only (API server on port 2894)
bun run dev:backend

# Frontend only (Vite dev server on port 5173)
bun run dev:frontend
```

## Building

### Build All

```bash
bun run build
```

### Build Individual Workspaces

```bash
# Backend
bun run build:backend

# Frontend
bun run build:frontend
```

## Testing

### Run All Tests

```bash
bun test
```

### Run Workspace-Specific Tests

```bash
# Backend tests
bun run test:backend

# Frontend tests
bun run test:frontend
```

### Watch Mode

```bash
# Backend
bun --filter backend test:watch

# Frontend
bun --filter frontend test:watch
```

## Linting & Type Checking

### Lint All Code

```bash
bun run lint
```

### Type Check All Code

```bash
bun run type-check
```

### Auto-fix Linting Issues

```bash
# Backend
bun run lint:backend --fix

# Frontend
bun run lint:frontend --fix
```

## Database Management

```bash
# Initialize database
bun run db:init

# Run migrations
bun run db:migrate

# Check database status
bun run db:status

# Reset database (WARNING: deletes all data)
bun run db:reset
```

## Production

### Build for Production

```bash
bun run build
```

### Start Production Server

```bash
bun run start:prod
```

## Workspace Commands

Bun workspaces support filtering commands to specific packages:

```bash
# Run command in specific workspace
bun --filter backend <command>
bun --filter frontend <command>

# Run command in all workspaces
bun --filter '*' <command>
```

## Bun-Specific Features

### Hot Reload

Backend uses Bun's `--hot` flag for instant hot reloading:

```bash
bun run dev:backend
```

### Fast Package Installation

Bun's package manager is significantly faster than npm/yarn:

```bash
# Install new dependency in backend
cd backend
bun add <package>

# Install new dev dependency
bun add -d <package>

# Install in frontend
cd frontend
bun add <package>
```

### Built-in TypeScript Support

No need for ts-node or tsx - Bun runs TypeScript natively:

```bash
bun run scripts/db-cli.ts
```

### Built-in Test Runner

Bun includes a fast test runner compatible with Jest:

```bash
bun test
bun test --watch
bun test --coverage
```

## Configuration Files

### bunfig.toml

Bun-specific configuration for package management, testing, and runtime behavior.

### tsconfig.json

Root TypeScript configuration optimized for Bun's bundler mode.

### .npmrc

Ensures consistent package management behavior across the workspace.

## Troubleshooting

### Port Already in Use

```bash
# Backend (port 2894)
lsof -ti:2894 | xargs kill -9

# Frontend (port 5173)
lsof -ti:5173 | xargs kill -9
```

### Database Connection Issues

1. Ensure PostgreSQL is running
2. Check `backend/.env` for correct credentials
3. Verify database exists: `psql -l`

### Dependency Issues

```bash
# Clean install
bun run clean
bun install
```

### Type Errors

```bash
# Regenerate types
bun run type-check
```

## Performance Tips

1. **Use Bun's built-in features**: Bun includes many built-in modules (crypto, fs, etc.)
2. **Hot reload**: Use `--hot` flag for instant updates during development
3. **Workspace filtering**: Use `--filter` to run commands only where needed
4. **Parallel execution**: Bun runs workspace commands in parallel when possible

## Best Practices

1. **Always use `bun` commands** instead of `npm` or `yarn`
2. **Keep dependencies updated**: `bun update`
3. **Use workspace scripts**: Defined in root `package.json`
4. **Type check before committing**: `bun run type-check`
5. **Run tests before pushing**: `bun test`

## Resources

- [Bun Documentation](https://bun.sh/docs)
- [Bun Workspaces](https://bun.sh/docs/install/workspaces)
- [Elysia Documentation](https://elysiajs.com/)
- [Vite Documentation](https://vitejs.dev/)

## Support

For issues or questions:
1. Check this documentation
2. Review error logs
3. Check database connection
4. Verify environment variables
