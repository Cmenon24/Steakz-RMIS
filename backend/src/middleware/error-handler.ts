import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

export const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  next
) => {
  // Let Express handle errors if the response has already started.
  if (res.headersSent) {
    return next(error);
  }

  // Convert Zod validation errors into readable messages.
  if (error instanceof ZodError) {
    const messages = error.issues.map((issue) => {
      const field = issue.path.join(".");

      // Identify required fields that were not submitted.
      if (
        issue.code === "invalid_type" &&
        issue.message.includes("received undefined")
    ) {
        return `${field} is required`;
    }
      return field ? `${field}: ${issue.message}` : issue.message;
    });

    return res.status(400).json({
      success: false,
      error: {
        message: messages.join("; "),
      },
    });
  }

  // Read the HTTP status from our AppError or another HTTP error.
  const errorStatus =
    error instanceof AppError
      ? error.statusCode
      : error?.statusCode ?? error?.status;

  // Accept only valid HTTP error status codes.
  const statusCode =
    typeof errorStatus === "number" &&
    errorStatus >= 400 &&
    errorStatus <= 599
      ? errorStatus
      : 500;

  // Hide internal server error details in production.
  const message =
    statusCode >= 500 && env.NODE_ENV === "production"
      ? "Internal server error"
      : error instanceof Error
        ? error.message
        : "An unexpected error occurred";

  // Return a consistent JSON error response.
  res.status(statusCode).json({
    success: false,
    error: {
      message,
    },
  });
};