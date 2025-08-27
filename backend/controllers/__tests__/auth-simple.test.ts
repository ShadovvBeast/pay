import { describe, it, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { cookie } from '@elysiajs/cookie';
import { authController } from '../auth.js';

describe('Auth Controller Basic Tests', () => {
  it('should create auth controller without errors', () => {
    const app = new Elysia()
      .use(cookie())
      .use(authController);
    
    expect(app).toBeDefined();
  });

  it('should handle invalid registration data', async () => {
    const app = new Elysia()
      .use(cookie())
      .use(authController);

    const response = await app
      .handle(new Request('http://localhost/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid' })
      }));

    expect(response.status).toBe(422); // Elysia returns 422 for validation errors
  });
});