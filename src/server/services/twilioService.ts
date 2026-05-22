// src/server/services/twilioService.ts
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const twilioService = {
  async sendEmergencySMS(to: string, alertDetails: any) {
    const message = `🚨 BRGY TANOD SOS!\nType: ${alertDetails.type}\nLocation: ${alertDetails.location}\nTime: ${new Date().toLocaleString('en-PH')}\nReply "HELP" for more info.`;

    try {
      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER, // or Alphanumeric Sender ID
        to: to.startsWith("+") ? to : `+63${to.replace(/^0/, "")}`,
      });
      console.log(`✅ Twilio SMS sent to ${to}`);
      return true;
    } catch (error) {
      console.error("Twilio SMS failed:", error);
      return false;
    }
  },
};
