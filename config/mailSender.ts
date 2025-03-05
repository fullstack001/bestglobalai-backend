import dotenv from "dotenv";
import Mailgun from "mailgun.js";
import formData from "form-data";
dotenv.config();
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY || "your-mailgun-api-key",
});

export const mailSender = async (to: string, subject: string, html: string) => {
  const data = {
    from: "Best Global AI <support@bestglobalai.con>",
    to,
    subject,
    html,
  };
  try {
    await mg.messages.create(
      process.env.MAILGUN_DOMAIN || "your-mailgun-domain",
      data
    );
  } catch (error) {
    console.log(error);
  }
};
