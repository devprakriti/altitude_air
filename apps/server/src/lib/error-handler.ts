import { t, Elysia } from 'elysia'

// Custom error classes
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Common error response models
export const errorModels = {
  Error: t.Object({
    error: t.String(),
    message: t.String(),
    statusCode: t.Number(),
    timestamp: t.String(),
    path: t.Optional(t.String()),
    field: t.Optional(t.String())
  }),
  
  Success: t.Object({
    success: t.Boolean(),
    message: t.String(),
    data: t.Optional(t.Any())
  }),

  ValidationError: t.Object({
    error: t.String(),
    message: t.String(),
    statusCode: t.Number(),
    timestamp: t.String(),
    field: t.Optional(t.String()),
    details: t.Optional(t.Array(t.String()))
  })
}

// Error handler utility
export const createErrorResponse = (
  statusCode: number, 
  message: string, 
  error: string = "Error",
  field?: string,
  path?: string
) => ({
  error,
  message,
  statusCode,
  timestamp: new Date().toISOString(),
  ...(field && { field }),
  ...(path && { path })
})

// Common error responses
export const commonErrors = {
  400: errorModels.ValidationError,
  401: errorModels.Error,
  403: errorModels.Error,
  404: errorModels.Error,
  409: errorModels.Error,
  429: errorModels.Error,
  500: errorModels.Error
}

// Global error handler
export function createGlobalErrorHandler() {
  return new Elysia({ name: 'global-error-handler' })
    .onError(({ error, set, request }) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error('Global error handler:', {
        error: errorMessage,
        stack: errorStack,
        url: request.url,
        method: request.method,
        timestamp: new Date().toISOString()
      });

      // Handle custom errors
      if (error instanceof ValidationError) {
        set.status = 400;
        return createErrorResponse(400, error.message, 'ValidationError', error.field, request.url);
      }

      if (error instanceof AuthenticationError) {
        set.status = 401;
        return createErrorResponse(401, error.message, 'AuthenticationError', undefined, request.url);
      }

      if (error instanceof AuthorizationError) {
        set.status = 403;
        return createErrorResponse(403, error.message, 'AuthorizationError', undefined, request.url);
      }

      if (error instanceof NotFoundError) {
        set.status = 404;
        return createErrorResponse(404, error.message, 'NotFoundError', undefined, request.url);
      }

      if (error instanceof ConflictError) {
        set.status = 409;
        return createErrorResponse(409, error.message, 'ConflictError', undefined, request.url);
      }

      if (error instanceof RateLimitError) {
        set.status = 429;
        return createErrorResponse(429, error.message, 'RateLimitError', undefined, request.url);
      }

      // Handle database errors
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as any).code;
        if (errorCode === '23505') { // Unique constraint violation
          set.status = 409;
          return createErrorResponse(409, 'Resource already exists', 'ConflictError', undefined, request.url);
        }

        if (errorCode === '23503') { // Foreign key constraint violation
          set.status = 400;
          return createErrorResponse(400, 'Referenced resource does not exist', 'ValidationError', undefined, request.url);
        }

        if (errorCode === '23502') { // Not null constraint violation
          set.status = 400;
          return createErrorResponse(400, 'Required field is missing', 'ValidationError', undefined, request.url);
        }

        // Handle network errors
        if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND') {
          set.status = 503;
          return createErrorResponse(503, 'Service temporarily unavailable', 'ServiceUnavailableError', undefined, request.url);
        }

        // Handle timeout errors
        if (errorCode === 'ETIMEDOUT') {
          set.status = 504;
          return createErrorResponse(504, 'Request timeout', 'TimeoutError', undefined, request.url);
        }
      }

      // Handle S3 errors
      if (error && typeof error === 'object' && 'name' in error) {
        const errorName = (error as any).name;
        if (errorName === 'NoSuchKey') {
          set.status = 404;
          return createErrorResponse(404, 'File not found', 'NotFoundError', undefined, request.url);
        }

        if (errorName === 'AccessDenied') {
          set.status = 403;
          return createErrorResponse(403, 'Access denied to file', 'AuthorizationError', undefined, request.url);
        }
      }

      // Default to 500 for unknown errors
      set.status = 500;
      return createErrorResponse(500, 'Internal server error', 'InternalServerError', undefined, request.url);
    });
}

// Request validation middleware
export function createValidationMiddleware() {
  return new Elysia({ name: 'validation-middleware' })
    .onBeforeHandle(({ request, set }) => {
      // Add request ID for tracking
      const requestId = crypto.randomUUID();
      set.headers['X-Request-ID'] = requestId;
    });
}

// Rate limiting middleware (basic implementation)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function createRateLimitMiddleware(maxRequests: number = 100, windowMs: number = 60000) {
  return new Elysia({ name: 'rate-limit-middleware' })
    .onBeforeHandle(({ request, set }) => {
      const clientId = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
      
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Clean up old entries
      for (const [key, value] of requestCounts.entries()) {
        if (value.resetTime < windowStart) {
          requestCounts.delete(key);
        }
      }
      
      const current = requestCounts.get(clientId);
      
      if (!current) {
        requestCounts.set(clientId, { count: 1, resetTime: now });
      } else if (current.resetTime < windowStart) {
        requestCounts.set(clientId, { count: 1, resetTime: now });
      } else if (current.count >= maxRequests) {
        set.status = 429;
        set.headers['Retry-After'] = Math.ceil((current.resetTime + windowMs - now) / 1000).toString();
        throw new RateLimitError(`Rate limit exceeded. Try again in ${Math.ceil((current.resetTime + windowMs - now) / 1000)} seconds.`);
      } else {
        current.count++;
      }
    });
}