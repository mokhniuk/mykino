import Stripe from 'stripe';
import { setUserPlan, getUserIdByCustomer, getStripeCustomerId } from './supabaseAdmin';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' });
  }
  return _stripe;
}

/** Creates (or reuses) a Stripe customer and returns a Checkout session URL. */
export async function createCheckoutSession(opts: {
  userId: string;
  email: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const stripe = getStripe();

  // Reuse existing customer to avoid duplicates
  let customerId = await getStripeCustomerId(opts.userId);

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: opts.email,
      metadata: { supabase_user_id: opts.userId },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: opts.priceId, quantity: 1 }],
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    allow_promotion_codes: true,
    // metadata on the session itself so checkout.session.completed can find the user
    metadata: { supabase_user_id: opts.userId },
    subscription_data: {
      metadata: { supabase_user_id: opts.userId },
    },
  });

  return session.url!;
}

/** Creates a Stripe Customer Portal session URL (for managing billing). */
export async function createPortalSession(opts: {
  userId: string;
  returnUrl: string;
}): Promise<string> {
  const stripe = getStripe();
  const customerId = await getStripeCustomerId(opts.userId);
  if (!customerId) throw new Error('No Stripe customer found for this user');

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: opts.returnUrl,
  });

  return session.url;
}

/** Processes an incoming Stripe webhook event and updates the user's plan. */
export async function handleWebhookEvent(rawBody: string, signature: string): Promise<void> {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    throw new Error('Webhook signature verification failed');
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id
        ?? await getUserIdByCustomer(session.customer as string);
      if (!userId) {
        console.error('[Stripe webhook] checkout.session.completed: could not resolve userId — Pro plan NOT granted', {
          sessionId: session.id,
          customer: session.customer,
          metadataUserId: session.metadata?.supabase_user_id ?? null,
        });
        break;
      }

      let subscriptionStatus = 'active';
      if (session.subscription) {
        try {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          subscriptionStatus = sub.status;
        } catch { /* keep default 'active' */ }
      }

      await setUserPlan(userId, 'pro', {
        customerId: session.customer as string,
        subscriptionId: session.subscription as string,
        subscriptionStatus,
      });
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id
        ?? await getUserIdByCustomer(sub.customer as string);
      if (!userId) break;

      const isActive = sub.status === 'active';
      await setUserPlan(userId, isActive ? 'pro' : 'free', {
        subscriptionId: sub.id,
        subscriptionStatus: sub.status,
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id
        ?? await getUserIdByCustomer(sub.customer as string);
      if (!userId) break;

      await setUserPlan(userId, 'free', {
        subscriptionId: sub.id,
        subscriptionStatus: 'canceled',
      });
      break;
    }

    // Ignore all other events
    default:
      break;
  }
}
