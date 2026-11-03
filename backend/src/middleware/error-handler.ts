
import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next
) => {
  const statusCode =
    typeof error?.status === "number" &&
    error.status >= 400 &&
    error.status <= 599
      ? error.status
      : 500;

  const isProduction = process.env.NODE_ENV === "production";

  const message =
    statusCode >= 500 && isProduction
      ? "Internal server error"
      : error instanceof Error
        ? error.message
        : "An unexpected error occurred";

  res.status(statusCode).json({
    success: false,
    error: {
      message,
    },
  });
};
