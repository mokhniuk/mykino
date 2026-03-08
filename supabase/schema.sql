-- MyKino sync + billing schema
-- Run this in your Supabase project: SQL Editor → New query → paste & run.
--
-- For community self-hosters: create a free project at supabase.com,
-- run this SQL, then add SUPABASE_URL and SUPABASE_ANON_KEY to your docker-compose.

-- ─── Watchlist ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.watchlist (
  user_id    UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  imdb_id    TEXT   NOT NULL,
  data       JSONB  NOT NULL,
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::BIGINT,
  PRIMARY KEY (user_id, imdb_id)
);
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own data only" ON public.watchlist;
CREATE POLICY "Own data only" ON public.watchlist
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── Watched ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.watched (
  user_id    UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  imdb_id    TEXT   NOT NULL,
  data       JSONB  NOT NULL,
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::BIGINT,
  PRIMARY KEY (user_id, imdb_id)
);
ALTER TABLE public.watched ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own data only" ON public.watched;
CREATE POLICY "Own data only" ON public.watched
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── Favourites ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.favourites (
  user_id    UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  imdb_id    TEXT   NOT NULL,
  data       JSONB  NOT NULL,
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::BIGINT,
  PRIMARY KEY (user_id, imdb_id)
);
ALTER TABLE public.favourites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own data only" ON public.favourites;
CREATE POLICY "Own data only" ON public.favourites
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── TV Tracking ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tv_tracking (
  user_id    UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tv_id      TEXT   NOT NULL,
  data       JSONB  NOT NULL,
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::BIGINT,
  PRIMARY KEY (user_id, tv_id)
);
ALTER TABLE public.tv_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own data only" ON public.tv_tracking;
CREATE POLICY "Own data only" ON public.tv_tracking
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── Profiles (plan + Stripe metadata) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                     UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                   TEXT    NOT NULL DEFAULT 'free',  -- 'free' | 'pro'
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  subscription_status    TEXT,   -- 'active' | 'trialing' | 'canceled' | 'past_due' etc.
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Auto-create a free profile whenever a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
