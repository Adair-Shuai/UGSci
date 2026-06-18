import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

// Import user authentication middleware (supports both OIDC and API Key authentication)
import { userAuthMiddleware } from './middleware/auth';
// Import rate limiting middleware (OWASP API4:2023 fix)
import defaultRateLimiter from './middleware/rate-limit';
import { workspaceAuthMiddleware } from './middleware/workspace';
// Import routes
import routes from './routes';

// Create Hono app instance
const app = new Hono().basePath('/api/v1');

// Global middleware
app.use('*', cors());
app.use('*', logger());
app.use('*', prettyJSON());

// Rate limiting — must be before auth to prevent unauthenticated DDoS
// Skips the /health endpoint
app.use('/health', async (c, next) => {
  await next();
});
app.use('*', defaultRateLimiter);

app.use('*', userAuthMiddleware); // User authentication middleware
app.use('*', workspaceAuthMiddleware);

// Error handling middleware
app.onError((error: Error, c) => {
  // Handle HTTPException (includes 429 rate limit errors)
  if (error instanceof Error && 'status' in error) {
    const httpError = error as Error & { status: number; message: string };
    if (httpError.status === 429) {
      return c.json(
        {
          error: 'rate_limit_exceeded',
          message: httpError.message,
        },
        { status: 429 } as any,
      );
    }
  }

  console.error('Hono Error:', error);
  return c.json({ error: error.message }, 500);
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    service: 'lobe-chat-api',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Register routes
Object.entries(routes).forEach(([key, value]) => app.route(`/${key}`, value));

export { app as honoApp };
