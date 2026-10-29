import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { cookie } from '@elysiajs/cookie';
import { jwt } from '@elysiajs/jwt';
import { config } from './config';
import { db } from './services/database';
import { authController } from './controllers/auth';
import { paymentController } from './controllers/payment';
import { apiKeyController } from './controllers/apiKeys';
import { publicApiController, galaxyController } from './controllers/publicApi';
import { docsController } from './controllers/docs';
import { docsLegacyController } from './controllers/docsLegacy';
import { walletController } from './controllers/wallet';
import { providerRegistry } from './services/providerRegistry';
import { currencyConverter } from './services/currencyConverter';

// Initialize database before starting server
async function startServer() {
  try {
    // Initialize database connection and run migrations
    await db.initialize();

    // Initialize currency converter (loads rates from DB, starts 10-min refresh)
    await currencyConverter.initialize();
    
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
      .onError(({ code, error, set }) => {
        // Preserve structured auth errors thrown by apiKeyAuth's derive hook.
        // Without this, Elysia's outer handler turns them into generic 500s.
        if (error instanceof Error && typeof error.message === 'string' && error.message.startsWith('{')) {
          try {
            const parsed = JSON.parse(error.message);
            const authCode = parsed?.error?.code;
            if (authCode === 'MISSING_API_KEY' || authCode === 'INVALID_AUTH_FORMAT' || authCode === 'INVALID_API_KEY') {
              set.status = 401;
              return parsed;
            }
            if (authCode === 'INSUFFICIENT_PERMISSIONS') {
              set.status = 403;
              return parsed;
            }
          } catch {
            // Not a structured auth error; fall through.
          }
        }

        // Handle validation errors from Elysia
        if (code === 'VALIDATION') {
          set.status = 400;
          
          // Try to parse the validation error details
          let validationDetails: any = error.message || 'Invalid request format';
          
          // Elysia validation errors often contain structured information
          if (error.message && typeof error.message === 'string') {
            try {
              // Try to extract meaningful validation info
              const errorStr = error.message;
              
              // Check if it's a TypeBox validation error with path info
              if (errorStr.includes('Expected') || errorStr.includes('Required')) {
                validationDetails = {
                  message: errorStr,
                  hint: 'Check that all required fields are present and have the correct type'
                };
              }
            } catch (e) {
              // Keep original message if parsing fails
            }
          }
          
          // Check if error has a 'validator' property with more details
          if ((error as any).validator) {
            validationDetails = {
              message: error.message,
              validator: (error as any).validator
            };
          }
          
          return {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request validation failed',
              details: validationDetails,
              type: 'invalid_request'
            },
            timestamp: new Date().toISOString()
          };
        }
        
        // Handle parse errors (malformed JSON, etc.)
        if (code === 'PARSE') {
          set.status = 400;
          return {
            error: {
              code: 'PARSE_ERROR',
              message: 'Failed to parse request body. Ensure you are sending valid JSON.',
              type: 'invalid_request'
            },
            timestamp: new Date().toISOString()
          };
        }
        
        // Handle not found errors
        if (code === 'NOT_FOUND') {
          set.status = 404;
          return {
            error: {
              code: 'NOT_FOUND',
              message: 'The requested endpoint does not exist',
              type: 'invalid_request'
            },
            timestamp: new Date().toISOString()
          };
        }
        
        // Log unexpected errors
        console.error('Unhandled error:', { code, error: error.message, stack: error.stack });
        
        // Generic error response
        set.status = 500;
        return {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
            type: 'api_error'
          },
          timestamp: new Date().toISOString()
        };
      })
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
      .get('/providers', () => {
        return {
          providers: providerRegistry.getAvailableProviders(),
          countries: providerRegistry.getSupportedCountries(),
        };
      })
      .get('/rates', async () => {
        return await currencyConverter.getAllRates();
      })
      .use(authController)
      .use(paymentController)
      .use(apiKeyController)
      .use(walletController)
      .use(docsLegacyController)
      .use(docsController)
      .group('/api', (app) => app.use(galaxyController).use(publicApiController))
      .listen(config.server.port);

    console.log(`🦊 Elysia is running at http://localhost:${app.server?.port}`);

    // Run stale transaction cleanup on startup and every 30 minutes
    const { paymentService } = await import('./services/payment.js');
    await paymentService.expireStaleTransactions();
    setInterval(() => {
      paymentService.expireStaleTransactions();
    }, 30 * 60 * 1000); // Every 30 minutes
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down gracefully...');
      currencyConverter.stop();
      await db.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('Shutting down gracefully...');
      currencyConverter.stop();
      await db.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();