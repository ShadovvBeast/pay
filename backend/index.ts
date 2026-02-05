import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { cookie } from '@elysiajs/cookie';
import { jwt } from '@elysiajs/jwt';
import { config } from './config';
import { db } from './services/database';
import { authController } from './controllers/auth';
import { paymentController } from './controllers/payment';
import { apiKeyController } from './controllers/apiKeys';
import { publicApiController } from './controllers/publicApi';
import { docsController } from './controllers/docs';

// Initialize database before starting server
async function startServer() {
  try {
    // Initialize database connection and run migrations
    await db.initialize();
    
    console.log('CORS Configuration:', {
      origin: config.cors.origin,
      origins: config.cors.origins
    });
    
    const app = new Elysia()
      .use(cors({
        origin: true,
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
      }))
      .use(cookie())
      .use(jwt({
        name: 'jwt',
        secret: config.jwt.secret
      }))
      .get('/', () => 'SB0 Pay API Server')
      .get('/health', () => {
        const dbStatus = db.getConnectionStatus();
        return { 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          environment: config.server.nodeEnv,
          database: {
            connected: dbStatus.isConnected,
            totalConnections: dbStatus.totalCount,
            idleConnections: dbStatus.idleCount,
            waitingConnections: dbStatus.waitingCount
          }
        };
      })
      .use(authController)
      .use(paymentController)
      .use(apiKeyController)
      .use(docsController)
      .group('/api', (app) => app.use(publicApiController))
      .listen(config.server.port);

    console.log(`🦊 Elysia is running at http://localhost:${app.server?.port}`);
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down gracefully...');
      await db.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('Shutting down gracefully...');
      await db.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();