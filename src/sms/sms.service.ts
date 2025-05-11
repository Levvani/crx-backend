import { Injectable } from "@nestjs/common";
import * as Twilio from "twilio";
import { MessageInstance } from "twilio/lib/rest/api/v2010/account/message";

@Injectable()
export class SmsService {
  private readonly client: Twilio.Twilio;

  constructor() {
    this.client = Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }

  async sendSms(
    phoneNumber: string,
    message: string,
  ): Promise<MessageInstance> {
    try {
      const result: MessageInstance = await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });

      return result;
    } catch (error) {
      console.error("Error sending SMS:", error);
      throw error;
    }
  }
}
