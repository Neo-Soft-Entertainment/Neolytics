import { ok } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { syncStripeCheckoutSession, syncStripeSubscriptionRecord, verifyStripeWebhookEvent } from "@/lib/stripe";

export async function POST(request: Request) {
  const body = await request.text();

  try {
    const event = verifyStripeWebhookEvent(body, request.headers.get("stripe-signature"));

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (session.mode === "subscription") {
        await syncStripeCheckoutSession(session.id);
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      await syncStripeSubscriptionRecord(event.data.object);
    }
  } catch (error) {
    logger.error({ error }, "Stripe webhook failed");
    return new Response("Webhook error", { status: 400 });
  }

  return ok({ received: true });
}
