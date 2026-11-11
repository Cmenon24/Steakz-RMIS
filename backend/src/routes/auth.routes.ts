
// Defines the routes for user authentication and profile retrieval.
import { Router } from "express";
import { login, getProfile } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

// Create the authentication router.
const router = Router();

// Handle user login requests.
router.post("/login", login);

// Retrieve the authenticated user's profile.
router.get("/profile", authenticate, getProfile);

export default router;
