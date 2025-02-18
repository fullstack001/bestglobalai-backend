import { Request, Response } from "express";
import dotenv from "dotenv";

import paypal from "@paypal/checkout-server-sdk";
import Stripe from "stripe";
import Mailgun from "mailgun.js";
import formData from "form-data";
import moment from "moment";

import Subscription from "../models/Subscription";
import User from "../models/User";
import { subscriptionConfirmationContent } from "../config/mailTemplate";

dotenv.config();

const frontend_url = process.env.FRONTEND_URL;

const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

const stripe_secret_key = process.env.STRIPE_SECRET_KEY;

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
    const { email, plan, frequency, subscriptionType, subscriptionId } =
      req.body;
    const user = await User.findOne({ email });
    const fullName = user?.fullName || "";

    const subscribedDate = new Date();
    const expiryDate =
      frequency === "monthly"
        ? moment(subscribedDate).add(1, "month").toDate()
        : frequency === "yearly"
        ? moment(subscribedDate).add(1, "year").toDate()
        : moment(subscribedDate).add(7, "days").toDate();
    const subscription = await Subscription.findOne({ email });
    subscription
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
          subscriptionId,
        });

    const content = subscriptionConfirmationContent(
      fullName,
      plan,
      expiryDate.toDateString()
    );

    await mg.messages.create(process.env.MAILGUN_DOMAIN || "", {
      from: `Best Global AI Team <noreply@${process.env.MAILGUN_DOMAIN}>`,
      to: email,
      subject: "Subscription Confirmation",
      html: content,
    });

    res.status(200).json({ message: "Subscription added successfully" });
  } catch (error) {
    console.error("Error adding subscription:", error);
    res.status(500).json({ error: "Failed to add subscription" });
  }
};

export const cancelSubscription = async (req: Request, res: Response) => {
  const { subscriptionId } = req.body;
  try {
    // Cancel the subscription
    const deletedSubscription = await stripe.subscriptions.cancel(
      subscriptionId
    );
    // Return a success response
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
