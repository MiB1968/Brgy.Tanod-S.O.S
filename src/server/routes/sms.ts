import express from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import twilio from "twilio";

const router = express.Router();
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const smsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 12,
  message: { error: "SMS rate limit exceeded" },
});

const schema = z.object({
  phone: z.string().regex(/^(\+63|0)?9\d{9}$/),
  message: z.string().min(10).max(300),
});

router.post("/emergency", smsLimiter, async (req, res) => {
  try {
    const { phone, message } = schema.parse(req.body);

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
