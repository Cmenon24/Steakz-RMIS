// Returns the API health status and service information.
import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Steakz RMIS API is running",
    data: {
      service: "Steakz RMIS Backend",
      status: "healthy",
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
