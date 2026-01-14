// ============================================================================
// God Life Backend - Error Classes and Handlers
// ============================================================================

import type { ErrorCode } from './types.ts';

/**
 * Custom error class for API errors
 * Includes error code, HTTP status, and optional details
 */
export class APIError extends Error {
  constructor(
    public code: ErrorCode,
    public statusCode: number,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends APIError {
  constructor(message: string = '인증이 필요합니다', code: ErrorCode = 'AUTH_003') {
    super(code, 401, message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends APIError {
  constructor(message: string = '접근 권한이 없습니다', details?: Record<string, unknown>) {
    super('AUTH_004', 403, message, details);
    this.name = 'AuthorizationError';
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends APIError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALID_001', 400, message, details);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends APIError {
  constructor(message: string = '리소스를 찾을 수 없습니다') {
    super('BIZ_003', 404, message);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends APIError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('BIZ_004', 409, message, details);
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends APIError {
  constructor(
    message: string = '요청 한도를 초과했습니다',
    public resetAt: Date,
    details?: Record<string, unknown>,
  ) {
    super('AUTH_007', 429, message, {
      ...details,
      resetAt: resetAt.toISOString(),
    });
    this.name = 'RateLimitError';
  }
}

/**
 * Business logic error (403)
 * Used for tier-specific restrictions
 */
export class BusinessLogicError extends APIError {
  constructor(
    code: Extract<ErrorCode, 'BIZ_001' | 'BIZ_002' | 'BIZ_005' | 'BIZ_006'>,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(code, 403, message, details);
    this.name = 'BusinessLogicError';
  }
}

/**
 * Free tier limit error (403)
 * For AI coaching, routine limits, etc.
 */
export class FreeTierLimitError extends BusinessLogicError {
  constructor(
    limitType: 'ai' | 'routine' | 'group',
    details: {
      currentCount?: number;
      maxCount: number;
      resetAt?: string;
    },
  ) {
    const messages = {
      ai: '무료 이용 한도를 초과했습니다',
      routine: '루틴 개수가 초과되었습니다',
      group: '그룹 인원이 초과되었습니다',
    };

    super('BIZ_001', messages[limitType], {
      ...details,
      upgradeRequired: true,
    });
    this.name = 'FreeTierLimitError';
  }
}

/**
 * Pro subscription required error (403)
 */
export class ProRequiredError extends BusinessLogicError {
  constructor(feature: string) {
    super('BIZ_002', `${feature} 기능은 Pro 구독이 필요합니다`, {
      upgradeRequired: true,
    });
    this.name = 'ProRequiredError';
  }
}

/**
 * Internal server error (500)
 */
export class InternalError extends APIError {
  constructor(message: string = '서버 오류가 발생했습니다', originalError?: unknown) {
    super('SYS_001', 500, message);
    this.name = 'InternalError';

    // Log original error but don't expose to client
    if (originalError) {
      console.error('[InternalError]', originalError);
    }
  }
}

/**
 * External service error (502)
 * For AI API, payment verification, etc.
 */
export class ExternalServiceError extends APIError {
  constructor(service: string, originalError?: unknown) {
    super('SYS_004', 502, `${service} 서비스 오류입니다`);
    this.name = 'ExternalServiceError';

    if (originalError) {
      console.error(`[ExternalServiceError: ${service}]`, originalError);
    }
  }
}

// ============================================================================
// Error Handler Utilities
// ============================================================================

/**
 * Check if error is an APIError instance
 */
export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError;
}

/**
 * Convert any error to APIError
 * Useful for catching and standardizing errors
 */
export function toAPIError(error: unknown): APIError {
  if (isAPIError(error)) {
    return error;
  }

  if (error instanceof Error) {
    // Check for specific error message patterns
    if (error.message.includes('AUTH_')) {
      return new AuthenticationError(error.message);
    }
    if (error.message.includes('VALID_')) {
      return new ValidationError(error.message);
    }
    if (error.message.includes('BIZ_')) {
      return new NotFoundError(error.message);
    }

    // Generic internal error
    return new InternalError(error.message, error);
  }

  // Unknown error type
  return new InternalError('알 수 없는 오류가 발생했습니다', error);
}

/**
 * Assert condition or throw error
 *
 * @param condition - Condition to check
 * @param error - Error to throw if condition is false
 */
export function assert(condition: boolean, error: APIError): asserts condition {
  if (!condition) {
    throw error;
  }
}

/**
 * Assert value is not null/undefined
 *
 * @param value - Value to check
 * @param errorMessage - Error message if value is null
 * @returns Non-null value
 */
export function assertExists<T>(
  value: T | null | undefined,
  errorMessage: string = '리소스를 찾을 수 없습니다',
): T {
  if (value === null || value === undefined) {
    throw new NotFoundError(errorMessage);
  }
  return value;
}

/**
 * Assert user is authenticated
 *
 * @param userId - User ID from auth
 * @throws AuthenticationError if not authenticated
 */
export function assertAuthenticated(userId: string | null | undefined): asserts userId is string {
  if (!userId) {
    throw new AuthenticationError();
  }
}

/**
 * Assert user owns resource
 *
 * @param userId - Authenticated user ID
 * @param resourceUserId - Resource owner ID
 * @throws AuthorizationError if user doesn't own resource
 */
export function assertOwnership(userId: string, resourceUserId: string): void {
  if (userId !== resourceUserId) {
    throw new AuthorizationError('이 리소스에 대한 권한이 없습니다');
  }
}

/**
 * Assert user has Pro subscription
 *
 * @param subscriptionPlan - User's subscription plan
 * @param expiresAt - Subscription expiration
 * @param feature - Feature name for error message
 * @throws ProRequiredError if not Pro
 */
export function assertProSubscription(
  subscriptionPlan: string,
  expiresAt: string | null,
  feature: string = '이',
): void {
  const isPro = subscriptionPlan === 'pro' &&
    expiresAt &&
    new Date(expiresAt) > new Date();

  if (!isPro) {
    throw new ProRequiredError(feature);
  }
}

// ============================================================================
// Error Logging
// ============================================================================

/**
 * Log error with context for monitoring
 *
 * @param error - Error to log
 * @param context - Additional context
 */
export function logError(
  error: unknown,
  context?: {
    requestId?: string;
    userId?: string;
    endpoint?: string;
    [key: string]: unknown;
  },
): void {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    error: error instanceof Error
      ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
      : String(error),
    ...context,
  };

  console.error('[ERROR]', JSON.stringify(errorInfo, null, 2));
}

/**
 * Create error log context from request
 *
 * @param req - HTTP Request
 * @param requestId - Request ID
 * @param userId - Optional user ID
 * @returns Error context object
 */
export function createErrorContext(
  req: Request,
  requestId: string,
  userId?: string,
): {
  requestId: string;
  userId?: string;
  method: string;
  url: string;
  userAgent?: string;
} {
  return {
    requestId,
    userId,
    method: req.method,
    url: req.url,
    userAgent: req.headers.get('User-Agent') || undefined,
  };
}
