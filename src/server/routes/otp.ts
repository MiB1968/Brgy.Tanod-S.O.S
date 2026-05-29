import express from "express";
import { z } from "zod";
import twilio from "twilio";
import { logger } from "../utils/logger.js";

const router = express.Router();
const getTwilioClient = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error("Phone integrations are not configured. TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables are required.");
  }
  return twilio(sid, token);
};

const otpStore = new Map(); // In production, use Redis

const phoneSchema = z.object({
  phone: z.string().regex(/^(\+63|0)?9\d{9}$/),
});

// Send OTP
router.post("/send", async (req, res) => {
  try {
    const { phone } = phoneSchema.parse(req.body);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore.set(phone, { otp, expires: Date.now() + 5 * 60 * 1000 });

    const client = getTwilioClient();
    await client.messages.create({
      body: `Your Brgy Tanod SOS verification code is: ${otp}. Valid for 5 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone.startsWith("+") ? phone : `+63${phone.replace(/^0/, "")}`,
    });

    logger.info(`OTP sent to ${phone}`);
    res.json({ success: true, message: "OTP sent" });
  } catch (error: any) {
    logger.error("Failed to send OTP", error);
    res.status(400).json({ error: error.message });
  }
});

// Verify OTP
router.post("/verify", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const record = otpStore.get(phone);

    if (!record || record.otp !== otp || record.expires < Date.now()) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    otpStore.delete(phone);
    res.json({ success: true, message: "Phone verified successfully" });
  } catch (error) {
    res.status(500).json({ error: "Verification failed" });
  }
});

export default router;
