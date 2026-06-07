import { SubscriptionPlan } from "@prisma/client";
import Stripe from "stripe";

import { env } from "@/env";
import { db } from "@/lib/db";
import { syncOrganizationSubscriptionFromStripe } from "@/lib/subscription-service";

function getStripe() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured.");
  }

  return new Stripe(env.STRIPE_SECRET_KEY);
}

function getStripePriceId(plan: SubscriptionPlan) {
  if (plan === SubscriptionPlan.PLUS) {
    return env.STRIPE_PRICE_PLUS_MONTHLY;
  }

  if (plan === SubscriptionPlan.PRO) {
    return env.STRIPE_PRICE_PRO_MONTHLY;
  }

  return null;
}

function getPlanFromStripePriceId(priceId: string | null | undefined) {
  if (!priceId) {
    return null;
  }

  if (priceId === env.STRIPE_PRICE_PLUS_MONTHLY) {
    return SubscriptionPlan.PLUS;
  }

  if (priceId === env.STRIPE_PRICE_PRO_MONTHLY) {
    return SubscriptionPlan.PRO;
  }

  return null;
}

export function canUseStripeCheckout(plan: SubscriptionPlan) {
  return plan === SubscriptionPlan.PLUS || plan === SubscriptionPlan.PRO;
}

export async function createStripeCheckoutSession(params: {
  organizationId: string;
  organizationName: string;
  userEmail: string;
  plan: SubscriptionPlan;
}) {
  const priceId = getStripePriceId(params.plan);

  if (!priceId) {
    throw new Error(`Missing Stripe price for the ${params.plan} plan.`);
  }

  const stripe = getStripe();
  const organization = await db.organization.findUniqueOrThrow({
    where: {
      id: params.organizationId
    },
    select: {
      stripeCustomerId: true
    }
  });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    client_reference_id: params.organizationId,
    success_url: `${env.AUTH_URL}/signup/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.AUTH_URL}/settings`,
    customer: organization.stripeCustomerId ?? undefined,
    customer_email: organization.stripeCustomerId ? undefined : params.userEmail,
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    metadata: {
      organizationId: params.organizationId,
      plan: params.plan
    },
    subscription_data: {
      metadata: {
        organizationId: params.organizationId,
        plan: params.plan,
        organizationName: params.organizationName
      }
    }
  });

  if (!session.url) {
    throw new Error("Stripe checkout session did not return a redirect URL.");
  }

  return session;
}

export async function createStripeBillingPortalSession(params: {
  organizationId: string;
}) {
  const stripe = getStripe();
  const organization = await db.organization.findUniqueOrThrow({
    where: {
      id: params.organizationId
    },
    select: {
      stripeCustomerId: true
    }
  });

  if (!organization.stripeCustomerId) {
    throw new Error("This organization does not have an active Stripe customer yet.");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: organization.stripeCustomerId,
    return_url: `${env.AUTH_URL}/settings`
  });

  if (!session.url) {
    throw new Error("Stripe billing portal did not return a redirect URL.");
  }

  return session;
}

export async function syncStripeCheckoutSession(sessionId: string) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (!session.subscription) {
    throw new Error("Stripe checkout session does not contain a subscription.");
  }

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id;

  return syncStripeSubscription(subscriptionId);
}

export async function syncStripeSubscription(subscriptionId: string) {
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"]
  });
  return syncStripeSubscriptionRecord(subscription);
}

export async function syncStripeSubscriptionRecord(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata.organizationId;

  if (!organizationId) {
    throw new Error("Stripe subscription is missing organization metadata.");
  }

  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const plan = getPlanFromStripePriceId(priceId);
  const currentPeriodStart = subscription.items.data[0]?.current_period_start ?? null;
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end ?? null;
  const canceledAt = subscription.cancel_at ?? subscription.canceled_at;

  if (!plan) {
    throw new Error("Unable to map the Stripe subscription back to a Neolytics plan.");
  }

  return syncOrganizationSubscriptionFromStripe({
    organizationId,
    plan,
    customerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null,
    subscriptionId: subscription.id,
    priceId,
    isCanceled: subscription.status === "canceled",
    currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart * 1000) : null,
    currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
    canceledAt: canceledAt ? new Date(canceledAt * 1000) : null
  });
}

export function verifyStripeWebhookEvent(body: string, signature: string | null) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("Stripe webhook is not configured.");
  }

  if (!signature) {
    throw new Error("Missing Stripe signature.");
  }

  return getStripe().webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
}
