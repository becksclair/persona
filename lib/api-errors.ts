import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

/**
 * Structured API error response format.
 * Provides consistent error handling across all API routes.
 */
export interface ApiError {
  code: string;
  message: string;
  retryable: boolean;
  requestId: string;
  details?: Record<string, unknown>;
}

/**
 * Generate a unique request ID for tracing.
 * Format: req_<timestamp>_<random>
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString("hex");
  return `req_${timestamp}_${random}`;
}

/**
 * Extract request ID from headers or generate a new one.
 */
export function getOrCreateRequestId(req: Request): string {
  return req.headers.get("x-request-id") ?? generateRequestId();
}

/**
 * Error codes for API responses.
 */
export const ErrorCodes = {
  // Auth errors
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",

  // Validation errors
  INVALID_JSON: "INVALID_JSON",
  INVALID_REQUEST: "INVALID_REQUEST",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",

  // Resource errors
  NOT_FOUND: "NOT_FOUND",
  CONVERSATION_NOT_FOUND: "CONVERSATION_NOT_FOUND",
  CHARACTER_NOT_FOUND: "CHARACTER_NOT_FOUND",
  MESSAGE_NOT_FOUND: "MESSAGE_NOT_FOUND",
  FILE_NOT_FOUND: "FILE_NOT_FOUND",

  // File errors
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  INDEXING_FAILED: "INDEXING_FAILED",

  // Operation errors
  OPERATION_FAILED: "OPERATION_FAILED",
  CANNOT_MODIFY_BUILTIN: "CANNOT_MODIFY_BUILTIN",
  CANNOT_DELETE_BUILTIN: "CANNOT_DELETE_BUILTIN",

  // Server errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const;

/**
 * Create a structured error response with request ID for tracing.
 */
export function apiError(
  code: string,
  message: string,
  status: number,
  options?: {
    retryable?: boolean;
    details?: Record<string, unknown>;
    requestId?: string;
  },
): NextResponse<ApiError> {
  const requestId = options?.requestId ?? generateRequestId();

  // Log error with context for debugging
  console.error(`[API Error] ${code}: ${message}`, {
    requestId,
    status,
    details: options?.details,
  });

  return NextResponse.json(
    {
      code,
      message,
      retryable: options?.retryable ?? false,
      requestId,
      details: options?.details,
    },
    {
      status,
      headers: {
        "x-request-id": requestId,
      },
    },
  );
}

/**
 * Error context passed to error helpers for request tracing.
 */
interface ErrorContext {
  requestId?: string;
  details?: Record<string, unknown>;
}

// Common error responses with optional request context
export const Errors = {
  unauthorized: (ctx?: ErrorContext) =>
    apiError(ErrorCodes.UNAUTHORIZED, "Authentication required", 401, ctx),

  forbidden: (ctx?: ErrorContext) =>
    apiError(ErrorCodes.FORBIDDEN, "You don't have permission to access this resource", 403, ctx),

  notFound: (resource = "Resource", ctx?: ErrorContext) =>
    apiError(ErrorCodes.NOT_FOUND, `${resource} not found`, 404, ctx),

  conversationNotFound: (ctx?: ErrorContext) =>
    apiError(ErrorCodes.CONVERSATION_NOT_FOUND, "Conversation not found", 404, ctx),

  characterNotFound: (ctx?: ErrorContext) =>
    apiError(ErrorCodes.CHARACTER_NOT_FOUND, "Character not found", 404, ctx),

  invalidJson: (ctx?: ErrorContext) =>
    apiError(ErrorCodes.INVALID_JSON, "Invalid JSON body", 400, ctx),

  invalidRequest: (message: string, ctx?: ErrorContext) =>
    apiError(ErrorCodes.INVALID_REQUEST, message, 400, ctx),

  cannotModifyBuiltin: (ctx?: ErrorContext) =>
    apiError(ErrorCodes.CANNOT_MODIFY_BUILTIN, "Cannot modify built-in character", 403, ctx),

  cannotDeleteBuiltin: (ctx?: ErrorContext) =>
    apiError(ErrorCodes.CANNOT_DELETE_BUILTIN, "Cannot delete built-in character", 403, ctx),

  internal: (message = "An unexpected error occurred", ctx?: ErrorContext) =>
    apiError(ErrorCodes.INTERNAL_ERROR, message, 500, { retryable: true, ...ctx }),

  fileNotFound: (ctx?: ErrorContext) =>
    apiError(ErrorCodes.FILE_NOT_FOUND, "Knowledge base file not found", 404, ctx),

  fileTooLarge: (maxSize: string, ctx?: ErrorContext) =>
    apiError(ErrorCodes.FILE_TOO_LARGE, `File exceeds maximum size (${maxSize})`, 413, ctx),

  indexingFailed: (reason?: string, ctx?: ErrorContext) =>
    apiError(ErrorCodes.INDEXING_FAILED, reason ?? "File indexing failed", 500, {
      retryable: true,
      ...ctx,
    }),

  databaseError: (message = "Database operation failed", ctx?: ErrorContext) =>
    apiError(ErrorCodes.DATABASE_ERROR, message, 500, { retryable: true, ...ctx }),
};
