import { NextResponse } from "next/server";

/**
 * Structured API error response format.
 * Provides consistent error handling across all API routes.
 */
export interface ApiError {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
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
 * Create a structured error response.
 */
export function apiError(
  code: string,
  message: string,
  status: number,
  options?: { retryable?: boolean; details?: Record<string, unknown> }
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      code,
      message,
      retryable: options?.retryable ?? false,
      details: options?.details,
    },
    { status }
  );
}

// Common error responses
export const Errors = {
  unauthorized: () =>
    apiError(ErrorCodes.UNAUTHORIZED, "Authentication required", 401),

  forbidden: () =>
    apiError(ErrorCodes.FORBIDDEN, "You don't have permission to access this resource", 403),

  notFound: (resource = "Resource") =>
    apiError(ErrorCodes.NOT_FOUND, `${resource} not found`, 404),

  conversationNotFound: () =>
    apiError(ErrorCodes.CONVERSATION_NOT_FOUND, "Conversation not found", 404),

  characterNotFound: () =>
    apiError(ErrorCodes.CHARACTER_NOT_FOUND, "Character not found", 404),

  invalidJson: () =>
    apiError(ErrorCodes.INVALID_JSON, "Invalid JSON body", 400),

  invalidRequest: (message: string) =>
    apiError(ErrorCodes.INVALID_REQUEST, message, 400),

  cannotModifyBuiltin: () =>
    apiError(ErrorCodes.CANNOT_MODIFY_BUILTIN, "Cannot modify built-in character", 403),

  cannotDeleteBuiltin: () =>
    apiError(ErrorCodes.CANNOT_DELETE_BUILTIN, "Cannot delete built-in character", 403),

  internal: (message = "An unexpected error occurred") =>
    apiError(ErrorCodes.INTERNAL_ERROR, message, 500, { retryable: true }),

  fileNotFound: () =>
    apiError(ErrorCodes.FILE_NOT_FOUND, "Knowledge base file not found", 404),

  fileTooLarge: (maxSize: string) =>
    apiError(ErrorCodes.FILE_TOO_LARGE, `File exceeds maximum size (${maxSize})`, 413),

  indexingFailed: (reason?: string) =>
    apiError(ErrorCodes.INDEXING_FAILED, reason ?? "File indexing failed", 500, { retryable: true }),
};
