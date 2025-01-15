import { Request, Response } from "express";
import dotenv from "dotenv";

import paypal from "@paypal/checkout-server-sdk";
import Stripe from "stripe";

dotenv.config();

const frontend_url = process.env.FRONTEND_URL;

const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

const stripe_secret_key = process.env.STRIPE_SECRET_KEY;


if (!clientId || !clientSecret ) {
  throw new Error("PayPal client ID and secret must be defined");
}

const paypalClient = new paypal.core.PayPalHttpClient(
  new paypal.core.SandboxEnvironment(clientId, clientSecret)
);

if (!stripe_secret_key) {
    throw new Error("Stripe secret key must be defined");
  }
const stripe = new Stripe(stripe_secret_key);

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
