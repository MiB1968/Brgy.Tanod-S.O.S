import express from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import twilio from "twilio";
import { authenticate, authorize } from "../middleware/auth";

const router = express.Router();

const getTwilioClient = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error("Phone integrations are not configured. TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables are required.");
  }
  return twilio(sid, token);
};

const smsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 12,
  message: { error: "SMS rate limit exceeded" },
});

const schema = z.object({
  phone: z.string().regex(/^(\+63|0)?9\d{9}$/),
  message: z.string().min(10).max(300),
});

router.post("/emergency", authenticate, authorize(["admin", "super_admin", "tanod"]), smsLimiter, async (req, res) => {
  try {
    const { phone, message } = schema.parse(req.body);
    const client = getTwilioClient();

    await client.messages.create({
      body: `🚨 Brgy Tanod SOS\n\n${message}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone.startsWith("+") ? phone : `+63${phone.replace(/^0/, "")}`,
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
