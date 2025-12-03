import { AppError } from "./appError.util";
import { AuthError } from "../types/auth.types";

/**
 * API Error class for handling application-specific errors
 * Extends AppError to work with error middleware
 */
export class ApiError extends AppError {
  errorCode?: string;
  details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode?: string,
    details?: any
  ) {
    super(message, statusCode);
    this.errorCode = errorCode;
    this.details = details;
    this.name = "ApiError";
  }

  /**
   * Create authentication error
   */
  static authenticationError(
    message: string = "Authentication failed",
    errorCode?: AuthError,
    details?: any
  ): ApiError {
    return new ApiError(message, 401, errorCode, details);
  }

  /**
   * Create authorization error
   */
  static authorizationError(
    message: string = "Access denied",
    errorCode?: string,
    details?: any
  ): ApiError {
    return new ApiError(message, 403, errorCode, details);
  }

  /**
   * Create validation error
   */
  static validationError(
    message: string = "Validation failed",
    details?: any
  ): ApiError {
    return new ApiError(message, 400, "VALIDATION_ERROR", details);
  }

  /**
   * Create not found error
   */
  static notFoundError(
    message: string = "Resource not found",
    errorCode?: string
  ): ApiError {
    return new ApiError(message, 404, errorCode);
  }

  /**
   * Create conflict error
   */
  static conflictError(
    message: string = "Resource conflict",
    errorCode?: string,
    details?: any
  ): ApiError {
    return new ApiError(message, 409, errorCode, details);
  }

  /**
   * Create bad request error
   */
  static badRequestError(
    message: string = "Bad request",
    errorCode?: string,
    details?: any
  ): ApiError {
    return new ApiError(message, 400, errorCode, details);
  }

  /**
   * Create internal server error
   */
  static internalError(
    message: string = "Internal server error",
    details?: any
  ): ApiError {
    return new ApiError(message, 500, "INTERNAL_ERROR", details);
  }
}
