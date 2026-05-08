import { type Request, type Response, type NextFunction } from "express";
import { logger } from "../lib/logger";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const error = err instanceof Error ? err : new Error(String(err));

  logger.error(
    {
      err: error,
      method: req.method,
      url: req.url,
    },
    "Unhandled error"
  );

  // Jangan bocorkan stack trace ke client di production
  const isProduction = process.env.NODE_ENV === "production";
  res.status(500).json({
    error: "Internal server error",
    ...(isProduction ? {} : { detail: error.message }),
  });
}

/**
 * Wrapper untuk async route handlers — menangkap promise rejection
 * dan meneruskannya ke error handler Express.
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
