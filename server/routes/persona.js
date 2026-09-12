import { Router } from "express";
import { asyncRoute, httpError } from "../util.js";
import { verifyAgeFromInquiry } from "../persona.js";

export const personaRouter = Router();

// Called by Sign Up right after the Persona Inquiry SDK reports a completed
// inquiry. Fetches the extracted ID data server-side and confirms it says
// 18+ and matches the birthday the user typed.
personaRouter.post(
  "/persona/verify-age",
  asyncRoute(async (req, res) => {
    const inquiryId = String(req.body?.inquiryId || "").trim();
    const dateOfBirth = String(req.body?.dateOfBirth || "").trim();

    if (!inquiryId) throw httpError(400, "inquiryId is required");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      throw httpError(400, "dateOfBirth must be YYYY-MM-DD");
    }

    const result = await verifyAgeFromInquiry(inquiryId, dateOfBirth);
    res.json(result);
  })
);
