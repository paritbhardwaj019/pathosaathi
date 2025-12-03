import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.util";
import { isDevelopment } from "../config/env.config";
import { AppError } from "../utils/appError.util";
import { ApiError } from "../utils/apiError.util";

export const errorMiddleware = (
  err: Error | AppError | ApiError,
  req: Request,
  res: Response,
  _: NextFunction
) => {
  let statusCode = 500;
  let message = "Internal server error";
  let errorCode: string | undefined;
  let details: any;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errorCode = err.errorCode;
    details = err.details;
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  logger.error("Error occurred:", {
    message: err.message,
    stack: err.stack,
    statusCode,
    errorCode,
    path: req.path,
    method: req.method,
  });

  const response: any = {
    success: false,
    message,
  };

  if (errorCode) {
    response.errorCode = errorCode;
  }

  if (details) {
    response.details = details;
  }

  if (isDevelopment) {
    response.stack = err.stack;
    response.error = err.message;
  }

  res.status(statusCode).json(response);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const notFoundError = (
  req: Request,
  _: Response,
  next: NextFunction
) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
};

export const validationError = (message: string) => {
  return new AppError(message, 400);
};

export const unauthorizedError = (message: string = "Unauthorized") => {
  return new AppError(message, 401);
};

export const forbiddenError = (message: string = "Forbidden") => {
  return new AppError(message, 403);
};

export const notFoundResourceError = (resource: string) => {
  return new AppError(`${resource} not found`, 404);
};

export const conflictError = (message: string) => {
  return new AppError(message, 409);
};
