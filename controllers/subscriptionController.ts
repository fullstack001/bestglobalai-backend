import { Request, Response } from "express";
import dotenv from "dotenv";

import paypal from "@paypal/checkout-server-sdk";
import Stripe from "stripe";
import Mailgun from "mailgun.js";
import formData from "form-data";
import moment from "moment";
import jwt from "jsonwebtoken";
import fs from "fs";
import Subscription from "../models/Subscription";
import { Types } from "mongoose";
import User from "../models/User";
import SubscriberInvite from "../models/SubscriberInvite";
import Book from "../models/Book";
import { subscriptionConfirmationContent } from "../config/mailTemplate";
import { generateInvoicePDF } from "../config/invoiceGenerator";
import { subscriptions } from "../config/subscriptionDetail";
import { sendSubscriberInvites } from "../config/mailTemplate";

dotenv.config();

const frontend_url = process.env.FRONTEND_URL;

const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

const stripe_secret_key = process.env.STRIPE_SECRET_KEY;

interface Subscriber {
  _id: Types.ObjectId;
  user: {
    fullName: string;
    email: string;
  };
}
if (!clientId || !clientSecret) {
  throw new Error("PayPal client ID and secret must be defined");
}

const paypalClient = new paypal.core.PayPalHttpClient(
  new paypal.core.SandboxEnvironment(clientId, clientSecret)
);

if (!stripe_secret_key) {
  throw new Error("Stripe secret key must be defined");
}
const stripe = new Stripe(stripe_secret_key);

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY || "your-mailgun-api-key",
});

export const createStripeSubscription = async (req: Request, res: Response) => {
  const { paymentMethodId, name, email, priceId } = req.body;

  try {
    const customer = await stripe.customers.create({
      name,
      email,
    });

    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });

    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    const subscriptionData: Stripe.SubscriptionCreateParams = {
      customer: customer.id,
      items: [{ price: priceId }],
      payment_settings: {
        payment_method_options: {
          card: {
            request_three_d_secure: "any" as const,
          },
        },
        save_default_payment_method: "on_subscription" as const,
      },
      expand: ["latest_invoice.payment_intent"],
    };

    const subscription = await stripe.subscriptions.create(subscriptionData);

    const invoice = subscription.latest_invoice;
    if (typeof invoice === "string" || !invoice?.payment_intent) {
      throw new Error("Invalid invoice or payment intent");
    }

    // Send successful response with subscription details
    res.status(200).json({
      subscriptionId: subscription.id,
      clientSecret: (invoice.payment_intent as Stripe.PaymentIntent)
        .client_secret,
      status: subscription.status,
    });
  } catch (error) {
    console.error(
      "Error creating subscription:",
      error instanceof Error ? error.message : "Unknown error"
    );
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const addSubscription = async (req: Request, res: Response) => {
  try {
    const { email, plan, frequency, subscriptionType, subscriptionId, totalPrice } =
      req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // user.role = plan === "Basic" ? "editor" : "admin";
    user.role = plan.contains("Mid-Level") ? "editor" : "admin";
    await user.save();
    const fullName = user?.fullName || "";

    const subscribedDate = new Date();
    const expiryDate =
      frequency === "monthly"
        ? moment(subscribedDate).add(1, "month").toDate()
        : frequency === "yearly"
        ? moment(subscribedDate).add(1, "year").toDate()
        : moment(subscribedDate).add(7, "days").toDate();
    const subscription = await Subscription.findOne({ email });

    const newSubscription = subscription
      ? await Subscription.findOneAndUpdate(
          { email },
          {
            user: user?._id,
            email,
            plan,
            frequency,
            subscribedDate,
            expiryDate,
            subscriptionType,
            totalPrice,
            subscriptionId,
          }
        )
      : await Subscription.create({
          user: user?._id,
          email,
          plan,
          frequency,
          subscribedDate,
          expiryDate,
          subscriptionType,
          totalPrice,
          subscriptionId,
        });

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "10h" }
    );
    // Only send specific user fields
    const filteredUser = {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      ayrshareRefId: user.ayrshareRefId,
    };

    const content = subscriptionConfirmationContent(
      fullName,
      plan,
      expiryDate.toDateString()
    );

    // Generate PDF invoice
    const pdfPath = await generateInvoicePDF(
      fullName,
      email,
      plan,
      frequency,
      subscribedDate,
      expiryDate,
      subscriptions
    );
    const attachment = {
      data: fs.readFileSync(pdfPath), // you can also use fs.readFileSync(filePath) for Buffer
      filename: "invoice.pdf", // the name you want the recipient to see
    };

    await mg.messages.create(process.env.MAILGUN_DOMAIN || "", {
      from: `Best Global AI Team <noreply@${process.env.MAILGUN_DOMAIN}>`,
      to: email,
      subject: "Subscription Confirmation",
      html: content,
      attachment: attachment,
    });

    res.json({ token, user: filteredUser, subscription: newSubscription });
  } catch (error) {
    console.error("Error adding subscription:", error);
    res.status(500).json({ error: "Failed to add subscription" });
  }
};

export const cancelSubscription = async (req: Request, res: Response) => {
  const { subscriptionId, email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    user.role = "user";
    await user.save();
    // Cancel the subscription
    const deletedSubscription = await stripe.subscriptions.cancel(
      subscriptionId
    );

    Subscription.findOneAndDelete({ email, subscriptionId }); // Return a success response
    res.status(200).json({
      message: "Subscription canceled successfully",
      deletedSubscription,
    });
  } catch (error) {
    console.error("Error adding subscription:", error);
    res.status(500).json({ error: "Failed to add subscription" });
  }
};

export const processStripePayment = async (req: Request, res: Response) => {
  const { plan, price, frequency, email } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${plan.title} (${frequency})`,
            },
            unit_amount: price * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: frontend_url + "/dashboard",
      cancel_url: frontend_url + "/cancel",
    });

    const subscribedDate = new Date();

    const expiryDate =
      frequency === "monthly"
        ? moment(subscribedDate).add(1, "month").toDate()
        : frequency === "yearly"
        ? moment(subscribedDate).add(1, "year").toDate()
        : moment(subscribedDate).add(7, "days").toDate();

    await Subscription.create({
      email,
      plan: plan.title,
      frequency,
      subscribedDate,
      expiryDate,
    });

    await mg.messages.create(process.env.MAILGUN_DOMAIN || "", {
      from: `Best Global AI Team <noreply@${process.env.MAILGUN_DOMAIN}>`,
      to: email,
      subject: "Subscription Confirmation",
      text: `Thank you for subscribing to ${
        plan.title
      } (${frequency}). Your subscription is valid until ${expiryDate.toDateString()}.`,
    });

    res.status(200).json({ sessionUrl: session.url });
  } catch (error) {
    console.error("Stripe Payment Error:", error);
    res.status(500).json({ error: "Stripe payment processing failed" });
  }
};

// PayPal Payment Controller
export const processPaypalPayment = async (req: Request, res: Response) => {
  const { plan, price, frequency } = req.body;

  try {
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: price.toFixed(2),
          },
          description: `${plan.title} (${frequency})`,
        },
      ],
      application_context: {
        brand_name: "Your Company",
        landing_page: "BILLING",
        user_action: "PAY_NOW",
        return_url: frontend_url + "/success",
        cancel_url: frontend_url + "/cancel",
      },
    });

    const order = await paypalClient.execute(request);
    res.status(200).json({ approvalUrl: order.result.links[1].href });
  } catch (error) {
    console.error("PayPal Payment Error:", error);
    res.status(500).json({ error: "PayPal payment processing failed" });
  }
};

export const getSubscribers = async (req: Request, res: Response) => {
  try {
    const subscribers = await Subscription.find().populate({
      path: "user",
      select: "email fullName role",
    });

    if (!subscribers || subscribers.length === 0) {
      return res.status(404).json({ message: "No subscribers found" });
    }

    res.status(200).json(subscribers);
  } catch (error) {
    console.error("Error fetching subscribers:", error);
    res.status(500).json({ error: "Failed to fetch subscribers" });
  }
}

function getEbookIdFromLink(link: string): string | null {
  try {
    const url = new URL(link); // Parse the URL
    const segments = url.pathname.split('/'); // Split the pathname into segments
    return segments.pop() || null; // Get the last segment (ebookId)
  } catch (error) {
    console.error("Invalid URL:", error);
    return null; // Return null if the URL is invalid
  }
}

export const sendBulkInvites = async (req: Request, res: Response) => {
  try {
   
    const { subscriberIds, ebookLink } = req.body;
    const inviterId = req.user._id;

    const inviter = await User.findById(inviterId);
    if (!inviter || (!["superAdmin", "admin", "editor"].includes(inviter.role)) || !inviter.isActive) {
      return res.status(403).json({ message: "Only paid users can send invites." });
    }

    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({
      username: "api",
      key: process.env.MAILGUN_API_KEY!,
    });
   
    const subscribers = await Subscription.find({ _id: { $in: subscriberIds } }).populate({
      path: "user",
      select: "email fullName role",
    });
    const sentEmails: string[] = [];

    for (const subscriber of subscribers) {
      if (!subscriber || !subscriber.user || typeof subscriber.user === "string") {
        return res.status(403).json({ message: "Follower not found" });
      }
     
      try {    
      let ebookId = getEbookIdFromLink(ebookLink);
      let subscriberId = (subscriber._id as Types.ObjectId).toString();

      const invite = new SubscriberInvite({      
        subscriberId: new Types.ObjectId(subscriberId),
        bookId: ebookId, 
        uuid: crypto.randomUUID(), 
        viewed: false,
      });
      await invite.save();  

      let inviteId = invite.uuid; 

      const htmlContent = sendSubscriberInvites(       
        String((subscriber.user as any).fullName),    
        String(ebookLink),
        String(inviteId) 
      );     
    
      console.log("subscriber details", htmlContent);

      const emailData = {
        from: `Best Global AI Team <admin@${process.env.MAILGUN_DOMAIN}>`,
        to: subscriber.email,
        subject: "You're Invited to Join!",
        html: htmlContent,
      };
      
        await mg.messages.create(process.env.MAILGUN_DOMAIN!, emailData);
        sentEmails.push(subscriber.email);
      } catch (error) {
        console.error(`Failed to send email to ${subscriber.email}:`, error);
      }
    }

    res.json({ message: `Invitations sent to ${sentEmails.length} subscriber.` });
  } catch (err: any) {
    console.error("sendBulkInvites failed:", err.message);
    return res.status(500).json({ message: "Server error. Please try again later." });
  }
};

export const getSubscriptionTracks = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Find the subscription by userId
    const subscribers = await Subscription.find().populate({
      path: "user",
      select: "email fullName role",
    });

    if (!subscribers || subscribers.length === 0) {
      return res.status(404).json({ message: "No subscribers found" });
    }
    const emails = subscribers.map((f) => f.email);
    const existingUsers = await User.find({ email: { $in: emails } });
    
    let subscriptionTracks = await Promise.all(
      subscribers.map(async (subscriber) => {
        const isRegistered = existingUsers.some((u) => u.email === subscriber.email);
        
        // Get subscriber details with viewed counts grouped by bookId
        const inviteDetails = await SubscriberInvite.aggregate([
          { $match: { subscriberId: subscriber._id } },
          {
            $group: {
              _id: '$bookId',      
              viewCount: { $sum: '$viewCount' }, // Count viewed invites   
              lastUpdatedAt: { $max: '$updatedAt' }  // Get the latest updatedAt
            }
          }
        ]);

        // Get book titles for each bookId
        const bookDetails = await Promise.all(
          inviteDetails.map(async (detail) => {            
            const book = await Book.findById(detail._id);    
            if(detail._id) {     
              return {
                bookId: detail._id,
                bookTitle: book ? book.title : 'Unknown Book',
                viewCount: detail.viewCount != 0 ? detail.viewCount / 2 : 0,
                lastUpdatedAt: detail.lastUpdatedAt,
                invites: detail,
              };
            } else {
              return "Not Sent";
              ;
            }
          })
        );

        


        return {
          subscriber: subscriber,
          isRegistered,
          bookStats: bookDetails
        };
      })
    );

    res.status(200).json(subscriptionTracks);
  } catch (error) {
    console.error("Error fetching subscription tracks:", error);
    res.status(500).json({ error: "Failed to fetch subscription tracks" });
  }
};