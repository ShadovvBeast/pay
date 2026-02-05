# Quick Reference Card

## 🚀 Common Commands

### Development
```bash
bun run dev              # Start everything
bun run dev:backend      # Backend only
bun run dev:frontend     # Frontend only
```

### Database
```bash
bun run db:migrate       # Run migrations
bun run db:status        # Check status
```

### Testing
```bash
bun test                 # Run all tests
bun test --watch         # Watch mode
```

### Building
```bash
bun run build            # Build all
bun run start:prod       # Production server
```

## 📦 Package Management

```bash
bun install              # Install all dependencies
bun add <package>        # Add dependency
bun add -d <package>     # Add dev dependency
bun remove <package>     # Remove dependency
bun update               # Update all packages
```

## 🔍 Code Quality

```bash
bun run lint             # Lint all code
bun run type-check       # Type check all
```

## 🏗️ Workspace Commands

```bash
# Run in specific workspace
bun --filter backend <command>
bun --filter frontend <command>

# Run in all workspaces
bun --filter '*' <command>
```

## 🌐 URLs

- Backend API: http://localhost:2894
- Frontend: http://localhost:5173
- API Docs: http://localhost:2894/docs

## 📁 Project Structure

```
sb0-pay/
├── backend/          # API Server (Elysia)
├── frontend/         # Web App (React)
├── scripts/          # Utility scripts
└── package.json      # Workspace config
```

## 🔧 Configuration Files

- `bunfig.toml` - Bun configuration
- `tsconfig.json` - TypeScript config
- `.npmrc` - Package manager config
- `backend/.env` - Backend environment
- `frontend/.env` - Frontend environment

## 📚 Documentation

- [WORKSPACE_SETUP.md](./WORKSPACE_SETUP.md) - Full setup guide
- [WORKSPACE_IMPROVEMENTS.md](./WORKSPACE_IMPROVEMENTS.md) - What changed
- [ENHANCED_API_FEATURES.md](./ENHANCED_API_FEATURES.md) - API features
- [CHANGELOG.md](./CHANGELOG.md) - Version history

## 🆘 Troubleshooting

### Port in use
```bash
# Kill process on port
lsof -ti:2894 | xargs kill -9  # Backend
lsof -ti:5173 | xargs kill -9  # Frontend
```

### Clean install
```bash
bun run clean
bun install
```

### Database issues
```bash
# Check PostgreSQL is running
psql -l

# Reset database
bun run db:reset
```

## 💡 Tips

1. Use `bun` not `npm` or `yarn`
2. Hot reload is instant with `--hot`
3. Workspace filtering saves time
4. Type check before committing
5. Read the docs when stuck

## 🎯 First Time Setup

```bash
# 1. Install dependencies
bun install

# 2. Setup environment
cp backend/.env.example backend/.env

# 3. Initialize database
bun run db:init

# 4. Start development
bun run dev
```

## 🔐 Environment Variables

### Backend (.env)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sb0pay
DB_USER=postgres
DB_PASSWORD=your_password

ALLPAY_LOGIN=your_login
ALLPAY_API_KEY=your_key

JWT_SECRET=your_secret
```

## 📊 Performance

- Package install: ~2-5 seconds
- Dev server start: ~0.5-1 second
- Test execution: ~1-2 seconds
- Hot reload: Instant

## 🎨 Code Style

- TypeScript strict mode
- ESLint for linting
- Prettier for formatting
- Conventional commits

## 🧪 Testing

```bash
# All tests
bun test

# Specific workspace
bun --filter backend test
bun --filter frontend test

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

## 🚢 Deployment

```bash
# Build for production
bun run build

# Start production server
bun run start:prod
```

## 📞 Support

- Check documentation first
- Review error logs
- Verify environment variables
- Check database connection

---

**Version**: 0.4.0  
**Runtime**: Bun >= 1.0.0  
**Database**: PostgreSQL >= 14.0
