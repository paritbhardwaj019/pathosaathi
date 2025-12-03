import { Response } from "express";
import httpStatus from "http-status";

/**
 * Standardized API Response class for consistent response formatting
 */
export class ApiResponse {
  /**
   * Send a success response
   * @param res Express Response object
   * @param data Response data
   * @param message Success message
   * @param statusCode HTTP status code (default: 200)
   */
  public static success<T = any>(
    res: Response,
    data?: T,
    message: string = "Operation successful",
    statusCode: number = httpStatus.OK
  ): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      data: data || {},
    });
  }

  /**
   * Send an error response
   * @param res Express Response object
   * @param message Error message
   * @param statusCode HTTP status code (default: 400)
   * @param error Error details
   */
  public static error(
    res: Response,
    message: string = "Operation failed",
    statusCode: number = httpStatus.BAD_REQUEST,
    error?: any
  ): Response {
    return res.status(statusCode).json({
      success: false,
      message,
      error: error || {},
    });
  }

  /**
   * Send a created success response (201)
   * @param res Express Response object
   * @param data Response data
   * @param message Success message
   */
  public static created<T = any>(
    res: Response,
    data?: T,
    message: string = "Resource created successfully"
  ): Response {
    return ApiResponse.success(res, data, message, httpStatus.CREATED);
  }

  /**
   * Send a no content response (204)
   * @param res Express Response object
   */
  public static noContent(res: Response): Response {
    return res.status(httpStatus.NO_CONTENT).end();
  }

  /**
   * Send a paginated response
   * @param res Express Response object
   * @param data Array of items
   * @param pagination Pagination metadata
   * @param message Success message
   */
  public static paginated<T = any>(
    res: Response,
    data: T[],
    pagination: {
      totalDocs: number;
      limit: number;
      page: number;
      totalPages: number;
      hasPrevPage: boolean;
      hasNextPage: boolean;
      prevPage: number | null;
      nextPage: number | null;
    },
    message: string = "Data retrieved successfully"
  ): Response {
    return ApiResponse.success(
      res,
      { records: data, pagination },
      message,
      httpStatus.OK
    );
  }

  /**
   * Send a unauthorized response (401)
   * @param res Express Response object
   * @param message Error message
   */
  public static unauthorized(
    res: Response,
    message: string = "Unauthorized access"
  ): Response {
    return ApiResponse.error(res, message, httpStatus.UNAUTHORIZED);
  }

  /**
   * Send a forbidden response (403)
   * @param res Express Response object
   * @param message Error message
   */
  public static forbidden(
    res: Response,
    message: string = "Access forbidden"
  ): Response {
    return ApiResponse.error(res, message, httpStatus.FORBIDDEN);
  }

  /**
   * Send a not found response (404)
   * @param res Express Response object
   * @param message Error message
   */
  public static notFound(
    res: Response,
    message: string = "Resource not found"
  ): Response {
    return ApiResponse.error(res, message, httpStatus.NOT_FOUND);
  }

  /**
   * Send a validation error response (422)
   * @param res Express Response object
   * @param message Error message
   * @param errors Validation errors
   */
  public static validationError(
    res: Response,
    message: string = "Validation failed",
    errors?: any
  ): Response {
    return ApiResponse.error(
      res,
      message,
      httpStatus.UNPROCESSABLE_ENTITY,
      errors
    );
  }

  /**
   * Send a too many requests response (429)
   * @param res Express Response object
   * @param message Error message
   */
  public static tooManyRequests(
    res: Response,
    message: string = "Too many requests, please try again later"
  ): Response {
    return ApiResponse.error(res, message, httpStatus.TOO_MANY_REQUESTS);
  }

  /**
   * Send an internal server error response (500)
   * @param res Express Response object
   * @param message Error message
   * @param error Error details
   */
  public static serverError(
    res: Response,
    message: string = "Internal server error",
    error?: any
  ): Response {
    return ApiResponse.error(
      res,
      message,
      httpStatus.INTERNAL_SERVER_ERROR,
      error
    );
  }
}
