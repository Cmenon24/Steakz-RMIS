//configures express and middleware
import express from "express";
import cors from "cors";
import helmet from "helmet";

import healthRoutes from "./routes/health.routes.js";
import { errorHandler } from "./middleware/error-handler.js";

import authRoutes from "./routes/auth.routes.js";

import branchRoutes from "./routes/branch.routes.js";
import userRoutes from "./routes/user.routes.js";
import menuRoutes from "./routes/menu.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import orderRoutes from "./routes/order.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import auditLogRoutes from "./routes/audit-log.routes.js";
import reportRoutes from "./routes/report.routes.js";
import tableRoutes from "./routes/table.routes.js";
import promotionRoutes from "./routes/promotion.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import recipeRoutes from "./routes/recipe.routes.js";

const app = express();

// Security middleware
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Request parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Steakz RMIS API",
  });
});

// *** API routes *** //
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authRoutes);

app.use("/api/v1/branches", branchRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/menu", menuRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/audit-logs", auditLogRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/tables", tableRoutes);
app.use("/api/v1/promotions", promotionRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/recipes", recipeRoutes);

// Handle unknown routes
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Centralized error handling (must be last)
app.use(errorHandler);

export default app;