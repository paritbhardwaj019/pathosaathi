import { Response, NextFunction } from "express";
import { AuthRequest, UserRole } from "../types/shared.types";
import { AppError } from "../utils/appError.util";
import httpStatus from "http-status";

export const roleMiddleware = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, _: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Unauthorized", httpStatus.UNAUTHORIZED));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          "Access denied. You do not have permission to access this resource.",
          httpStatus.FORBIDDEN
        )
      );
    }

    next();
  };
};
