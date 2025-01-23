import Subscription from "../models/Subscription";
import Mailgun from "mailgun.js";
import formData from "form-data";
import moment from "moment";
import dotenv from "dotenv";

dotenv.config();

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY || "",
});

export const sendExpiryNotifications = async () => {
  const today = moment().startOf("day").toDate();
  const notificationDate = moment(today).add(7, "days").toDate();

  try {
    const expiringSubscriptions = await Subscription.find({
      expiryDate: { $eq: notificationDate },
    });

    for (const subscription of expiringSubscriptions) {
      await mg.messages.create(process.env.MAILGUN_DOMAIN || "", {
        from: `Best Global AI Team <noreply@${process.env.MAILGUN_DOMAIN}>`,
        to: subscription.email,
        subject: "Subscription Expiry Notice",
        text: `Dear user, your subscription to ${subscription.plan} will expire on ${subscription.expiryDate.toDateString()}. Please renew your subscription to continue enjoying our services.`,
      });
    }
  } catch (error) {
    console.error("Error sending expiry notifications:", error);
  }
};
