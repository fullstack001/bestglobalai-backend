import cron from "node-cron";
import { sendExpiryNotifications } from "./notifyExpiry"; // Import the notification task

// Schedule the task to run daily at midnight
cron.schedule("0 0 * * *", async () => {
  console.log("Running expiry notification task...");
  await sendExpiryNotifications(); // Call your expiry notification function
  console.log("Expiry notification task completed.");
});

console.log("Cron job for expiry notifications is set to run daily at midnight.");
