import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

import {
  createPromotion,
  deactivatePromotion,
  getPromotionById,
  getPromotions,
  updatePromotion,
} from "../services/promotion.service.js";
import { AppError } from "../utils/app-error.js";

// Require explicit UTC offsets so date/time values are unambiguous in the API.
const promotionInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  discountValue: z.number().finite().positive(),
  startDate: z.iso.datetime({ offset: true }),
  endDate: z.iso.datetime({ offset: true }),
  branchIds: z.array(z.uuid()).min(1),
  menuItemIds: z.array(z.uuid()).min(1),
}).strict().superRefine((data, context) => {
  if (new Set(data.branchIds).size !== data.branchIds.length) {
    context.addIssue({ code: "custom", message: "Branch IDs must be unique", path: ["branchIds"] });
  }
  if (new Set(data.menuItemIds).size !== data.menuItemIds.length) {
    context.addIssue({ code: "custom", message: "Menu item IDs must be unique", path: ["menuItemIds"] });
  }
  if (data.discountType === "PERCENTAGE" && data.discountValue > 50) {
    context.addIssue({ code: "custom", message: "Percentage discounts cannot exceed 50%", path: ["discountValue"] });
  }
  if (new Date(data.endDate) <= new Date(data.startDate)) {
    context.addIssue({ code: "custom", message: "End date must be later than start date", path: ["endDate"] });
  }
});

// List promotions, automatically restricting Branch Managers to their branch.
export async function getPromotionsController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw new AppError("Authentication required", 401);

    const querySchema = z.object({ branchId: z.uuid().optional() }).strict();
    const query = querySchema.parse(req.query);
    const promotions = await getPromotions({
      role: req.auth.role,
      branchId: req.auth.branchId ?? undefined,
      requestedBranchId: req.auth.role === "HEADQUARTERS_MANAGER" ? query.branchId : undefined,
    });

    res.status(200).json({ success: true, count: promotions.length, data: promotions });
  } catch (error) {
    next(error);
  }
}

// Retrieve one promotion while retaining the caller's branch scope.
export async function getPromotionController(req: Request, res: Response, next: NextFunction) {
  try {
    const promotionId = req.params.promotionId;
    if (typeof promotionId !== "string" || !req.auth) {
      throw new AppError("Invalid promotion ID or authentication", 400);
    }

    const promotion = await getPromotionById({
      promotionId,
      role: req.auth.role,
      branchId: req.auth.branchId ?? undefined,
    });

    res.status(200).json({ success: true, data: promotion });
  } catch (error) {
    next(error);
  }
}

// Create a promotion using HQ-supplied branch and menu item eligibility.
export async function createPromotionController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw new AppError("Authentication required", 401);
    const data = promotionInputSchema.parse(req.body);
    const promotion = await createPromotion({
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      startDateInput: data.startDate,
      endDateInput: data.endDate,
    }, req.auth.userId);

    res.status(201).json({ success: true, message: "Promotion created successfully", data: promotion });
  } catch (error) {
    next(error);
  }
}

// Replace promotion terms only while the promotion is scheduled and unused.
export async function updatePromotionController(req: Request, res: Response, next: NextFunction) {
  try {
    const promotionId = req.params.promotionId;
    if (typeof promotionId !== "string" || !req.auth) {
      throw new AppError("Invalid promotion ID or authentication", 400);
    }

    const data = promotionInputSchema.parse(req.body);
    const promotion = await updatePromotion(promotionId, {
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      startDateInput: data.startDate,
      endDateInput: data.endDate,
    }, req.auth.userId);

    res.status(200).json({ success: true, message: "Promotion updated successfully", data: promotion });
  } catch (error) {
    next(error);
  }
}

// End a promotion early without deleting it or changing past orders.
export async function deactivatePromotionController(req: Request, res: Response, next: NextFunction) {
  try {
    const promotionId = req.params.promotionId;
    if (typeof promotionId !== "string" || !req.auth) {
      throw new AppError("Invalid promotion ID or authentication", 400);
    }

    const promotion = await deactivatePromotion(promotionId, req.auth.userId);
    res.status(200).json({ success: true, message: "Promotion deactivated successfully", data: promotion });
  } catch (error) {
    next(error);
  }
}
