import { z } from "zod";

const SmsSchema = z.object({
  phone: z.string().regex(/^(\+63|0)?[9]\d{9}$/, "Invalid Philippine phone number"),
  message: z.string().min(5).max(500),
  userId: z.string().optional(),
});

export const sendEmergencySMS = async (data: {
  phone: string;
  message: string;
  userId?: string;
}) => {
  const validated = SmsSchema.parse(data);

  try {
    const response = await fetch('/api/sms/emergency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validated),
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.error || "Failed to send SMS");

    return result;
  } catch (error: any) {
    console.error("SMS Error:", error);
    throw error;
  }
};
