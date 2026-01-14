// ============================================================================
// God Life Backend - Response Formatters
// ============================================================================

import type {
  ApiResponse,
  ApiError,
  PaginationMeta,
  ErrorCode,
} from './types.ts';

/**
 * Creates a standardized success response
 *
 * @param data - Response data
 * @param requestId - Unique request identifier for tracking
 * @param pagination - Optional pagination metadata
 * @returns HTTP Response with JSON body
 */
export function successResponse<T>(
  data: T,
  requestId: string,
  pagination?: PaginationMeta,
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  if (pagination) {
    response.pagination = pagination;
  }

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
    },
  });
}

/**
 * Creates a standardized error response
 *
 * @param code - Error code (e.g., 'AUTH_001', 'BIZ_006')
 * @param message - Human-readable error message
 * @param status - HTTP status code
 * @param requestId - Unique request identifier
 * @param details - Optional additional error details
 * @returns HTTP Response with error JSON body
 */
export function errorResponse(
  code: ErrorCode,
  message: string,
  status: number,
  requestId: string,
  details?: Record<string, unknown>,
): Response {
  const error: ApiError = {
    code,
    message,
  };

  if (details) {
    error.details = details;
  }

  const response: ApiResponse<never> = {
    success: false,
    error,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
    },
  });
}

/**
 * Creates a 400 Bad Request response
 *
 * @param message - Error message
 * @param requestId - Request ID
 * @param details - Optional validation details
 * @returns HTTP Response
 */
export function badRequestResponse(
  message: string,
  requestId: string,
  details?: Record<string, unknown>,
): Response {
  return errorResponse('VALID_001', message, 400, requestId, details);
}

/**
 * Creates a 401 Unauthorized response
 *
 * @param message - Error message
 * @param requestId - Request ID
 * @returns HTTP Response
 */
export function unauthorizedResponse(
  message: string,
  requestId: string,
): Response {
  return errorResponse('AUTH_003', message, 401, requestId);
}

/**
 * Creates a 403 Forbidden response
 *
 * @param message - Error message
 * @param requestId - Request ID
 * @param details - Optional details (e.g., upgrade info)
 * @returns HTTP Response
 */
export function forbiddenResponse(
  message: string,
  requestId: string,
  details?: Record<string, unknown>,
): Response {
  return errorResponse('AUTH_004', message, 403, requestId, details);
}

/**
 * Creates a 404 Not Found response
 *
 * @param message - Error message
 * @param requestId - Request ID
 * @returns HTTP Response
 */
export function notFoundResponse(
  message: string,
  requestId: string,
): Response {
  return errorResponse('BIZ_003', message, 404, requestId);
}

/**
 * Creates a 409 Conflict response
 *
 * @param message - Error message
 * @param requestId - Request ID
 * @param details - Optional conflict details
 * @returns HTTP Response
 */
export function conflictResponse(
  message: string,
  requestId: string,
  details?: Record<string, unknown>,
): Response {
  return errorResponse('BIZ_004', message, 409, requestId, details);
}

/**
 * Creates a 429 Too Many Requests response
 *
 * @param message - Error message
 * @param requestId - Request ID
 * @param resetAt - When the rate limit resets
 * @param remaining - Requests remaining
 * @returns HTTP Response
 */
export function rateLimitResponse(
  message: string,
  requestId: string,
  resetAt: Date,
  remaining: number = 0,
): Response {
  const response = errorResponse(
    'AUTH_007',
    message,
    429,
    requestId,
    {
      resetAt: resetAt.toISOString(),
      remaining,
    },
  );

  // Add rate limit headers
  const headers = new Headers(response.headers);
  headers.set('X-RateLimit-Remaining', remaining.toString());
  headers.set('X-RateLimit-Reset', Math.floor(resetAt.getTime() / 1000).toString());
  headers.set('Retry-After', Math.ceil((resetAt.getTime() - Date.now()) / 1000).toString());

  return new Response(response.body, {
    status: 429,
    headers,
  });
}

/**
 * Creates a 500 Internal Server Error response
 *
 * @param message - Error message (should be generic for security)
 * @param requestId - Request ID
 * @param error - Original error (logged but not exposed)
 * @returns HTTP Response
 */
export function internalErrorResponse(
  message: string,
  requestId: string,
  error?: unknown,
): Response {
  // Log the actual error for debugging (not exposed to client)
  if (error) {
    console.error('[ERROR]', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  // Return generic error to client (don't leak implementation details)
  return errorResponse(
    'SYS_001',
    message || '서버 오류가 발생했습니다',
    500,
    requestId,
  );
}

/**
 * Creates pagination metadata from query results
 *
 * @param page - Current page number (1-indexed)
 * @param limit - Items per page
 * @param totalItems - Total number of items
 * @returns Pagination metadata
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  totalItems: number,
): PaginationMeta {
  const totalPages = Math.ceil(totalItems / limit);

  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Generates a unique request ID
 * Uses crypto.randomUUID() for uniqueness
 *
 * @returns UUID string
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Extracts request ID from headers or generates new one
 *
 * @param req - HTTP Request
 * @returns Request ID
 */
export function getOrGenerateRequestId(req: Request): string {
  return req.headers.get('X-Request-ID') || generateRequestId();
}

/**
 * Creates CORS headers for responses
 *
 * @param origin - Allowed origin (default: *)
 * @returns Headers object with CORS configuration
 */
export function corsHeaders(origin: string = '*'): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Request-ID, X-App-Version, X-Platform, X-Device-Id, Accept-Language',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Handles OPTIONS preflight requests
 *
 * @param req - HTTP Request
 * @returns Response with CORS headers
 */
export function handleCORS(req: Request): Response {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  // Not a preflight request
  return new Response(null, { status: 405 }); // Method not allowed
}

/**
 * Wraps an Edge Function handler with common error handling
 *
 * @param handler - The actual function logic
 * @returns Wrapped handler with error handling
 */
export function withErrorHandling(
  handler: (req: Request, requestId: string) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    const requestId = getOrGenerateRequestId(req);

    try {
      return await handler(req, requestId);
    } catch (error) {
      // Log error for monitoring
      console.error('[HANDLER_ERROR]', {
        requestId,
        method: req.method,
        url: req.url,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Return appropriate error response
      if (error instanceof Error) {
        // Handle specific error codes
        if (error.message.startsWith('AUTH_')) {
          return unauthorizedResponse(
            '인증이 필요합니다',
            requestId,
          );
        }
        if (error.message.startsWith('BIZ_')) {
          return badRequestResponse(
            error.message,
            requestId,
          );
        }
      }

      // Generic internal error
      return internalErrorResponse(
        '서버 오류가 발생했습니다',
        requestId,
        error,
      );
    }
  };
}

/**
 * Validates request body exists and is valid JSON
 *
 * @param req - HTTP Request
 * @returns Parsed JSON body
 * @throws Error if body is missing or invalid
 */
export async function parseRequestBody<T>(req: Request): Promise<T> {
  const contentType = req.headers.get('Content-Type');

  if (!contentType?.includes('application/json')) {
    throw new Error('VALID_002: Content-Type must be application/json');
  }

  try {
    const body = await req.json();
    return body as T;
  } catch {
    throw new Error('VALID_002: Invalid JSON body');
  }
}

/**
 * Extracts query parameters from URL
 *
 * @param req - HTTP Request
 * @returns URLSearchParams object
 */
export function getQueryParams(req: Request): URLSearchParams {
  const url = new URL(req.url);
  return url.searchParams;
}

/**
 * Extracts a path parameter from URL
 *
 * @param req - HTTP Request
 * @param index - Index of the path segment (0-based after /functions/v1/function-name/)
 * @returns Path parameter value or undefined
 */
export function getPathParam(req: Request, index: number): string | undefined {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);

  // Path format: /functions/v1/function-name/param1/param2/...
  // Index starts after function-name
  const functionNameIndex = pathParts.indexOf('v1') + 2; // Skip 'functions', 'v1', and function name
  return pathParts[functionNameIndex + index];
}
