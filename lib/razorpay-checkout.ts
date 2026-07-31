"use client";

/**
 * Client-side driver for real Razorpay Checkout — India plan only (see the
 * currency note on lib/razorpay.ts). Everywhere else keeps using the static
 * payment-link fallback in lib/payment-links.ts.
 */

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
};

type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = { open: () => void };

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let loadPromise: Promise<void> | null = null;

function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = CHECKOUT_SRC;
      script.onload = () => resolve();
      script.onerror = () => {
        loadPromise = null;
        reject(new Error("Could not load Razorpay checkout."));
      };
      document.body.appendChild(script);
    });
  }
  return loadPromise;
}

export type RazorpayContact = {
  name: string;
  email: string;
  phone: string;
  country?: string;
  couponCode?: string;
};

export type RazorpayCheckoutCallbacks = {
  onSuccess: (details: { orderId: string; paymentId: string }) => void;
  onError: (message: string) => void;
  /** Visitor closed the modal without paying — not an error, just back to idle. */
  onDismiss: () => void;
};

export async function startRazorpayCheckout(
  contact: RazorpayContact,
  callbacks: RazorpayCheckoutCallbacks,
) {
  try {
    const orderRes = await fetch("/api/razorpay/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contact),
    });
    const order = await orderRes.json().catch(() => null);
    if (!orderRes.ok || !order) {
      callbacks.onError(order?.error ?? "Could not start checkout. Please try again.");
      return;
    }

    await loadRazorpayCheckout();
    if (!window.Razorpay) {
      callbacks.onError("Could not load Razorpay checkout.");
      return;
    }

    const razorpay = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: "Delta AI Academy",
      description: "Full programme",
      prefill: { name: contact.name, email: contact.email, contact: contact.phone },
      theme: { color: "#171717" },
      handler: async (response) => {
        try {
          const verifyRes = await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const verified = await verifyRes.json().catch(() => null);
          if (!verifyRes.ok || !verified) {
            callbacks.onError("Payment could not be verified. Please contact support.");
            return;
          }
          callbacks.onSuccess({ orderId: verified.orderId, paymentId: verified.paymentId });
        } catch {
          callbacks.onError("Payment could not be verified. Please contact support.");
        }
      },
      modal: { ondismiss: () => callbacks.onDismiss() },
    });
    razorpay.open();
  } catch {
    callbacks.onError("Could not start checkout. Please try again.");
  }
}
