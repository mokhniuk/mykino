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
  email: string;
  returnUrl: string;
}): Promise<string> {
  const stripe = getStripe();
  let customerId = await getStripeCustomerId(opts.userId);

  if (!customerId) {
    // Fall back: search Stripe for an existing customer with this email
    if (opts.email) {
      const existing = await stripe.customers.list({ email: opts.email, limit: 1 });
      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      }
    }
    if (!customerId) throw new Error('No Stripe customer found — please subscribe via the checkout flow first.');
  }

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
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, secret);
  } catch (e: any) {
    throw new Error(`Webhook signature verification failed: ${e.message}`);
  }

  console.log(`[Stripe webhook] received: ${event.type} (${event.id})`);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`[Stripe webhook] checkout.session.completed — customer: ${session.customer}, metadata:`, session.metadata);

      const userId = session.metadata?.supabase_user_id
        ?? await getUserIdByCustomer(session.customer as string);

      if (!userId) {
        throw new Error(`checkout.session.completed: could not resolve supabase userId — customer: ${session.customer}, metadata.supabase_user_id: ${session.metadata?.supabase_user_id ?? 'missing'}`);
      }

      let subscriptionStatus = 'active';
      if (session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        subscriptionStatus = sub.status;
      }

      await setUserPlan(userId, 'pro', {
        customerId: session.customer as string,
        subscriptionId: session.subscription as string,
        subscriptionStatus,
      });
      console.log(`[Stripe webhook] plan set to pro for user ${userId}`);
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id
        ?? await getUserIdByCustomer(sub.customer as string);
      if (!userId) {
        console.warn(`[Stripe webhook] customer.subscription.updated: could not resolve userId for customer ${sub.customer} — skipping`);
        break;
      }
      const plan = sub.status === 'active' || sub.status === 'trialing' ? 'pro' : 'free';
      // If scheduled to cancel at period end, store that date; otherwise clear it
      const cancelAt = sub.cancel_at_period_end && sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null;
      await setUserPlan(userId, plan, { subscriptionId: sub.id, subscriptionStatus: sub.status, cancelAt });
      console.log(`[Stripe webhook] plan=${plan} cancelAt=${cancelAt ?? 'none'} for user ${userId}`);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id
        ?? await getUserIdByCustomer(sub.customer as string);
      if (!userId) {
        console.warn(`[Stripe webhook] customer.subscription.deleted: could not resolve userId for customer ${sub.customer} — skipping`);
        break;
      }
      await setUserPlan(userId, 'free', { subscriptionId: sub.id, subscriptionStatus: 'canceled', cancelAt: null });
      console.log(`[Stripe webhook] plan set to free for user ${userId} (subscription deleted)`);
      break;
    }

    default:
      console.log(`[Stripe webhook] ignored event type: ${event.type}`);
      break;
  }
}
