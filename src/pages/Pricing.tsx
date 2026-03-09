import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Minus, Sparkles, Cloud, Brain, ShieldCheck, Server } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import Footer from '@/components/Footer';

const MOCK_FILMS = [
  { emoji: '🎭', title: 'The Conversation', meta: 'Coppola · 1974 · Thriller', score: '98%' },
  { emoji: '🌿', title: 'Caché', meta: 'Haneke · 2005 · Drama', score: '95%' },
  { emoji: '🔥', title: 'A Separation', meta: 'Farhadi · 2011 · Drama', score: '93%' },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const demoFeatures = [
    'pricingDF1', 'pricingDF2', 'pricingDF3', 'pricingDF4',
  ] as const;

  const freeFeatures = [
    'pricingFF1', 'pricingFF2', 'pricingFF3',
  ] as const;

  const proFeatures = [
    'pricingPF1', 'pricingPF2', 'pricingPF3', 'pricingPF4', 'pricingPF5',
  ] as const;

  const communityFeatures = [
    'pricingCF1', 'pricingCF2', 'pricingCF3',
  ] as const;

  const faqs = [
    { q: 'pricingFaqQ1', a: 'pricingFaqA1' },
    { q: 'pricingFaqQ2', a: 'pricingFaqA2' },
    { q: 'pricingFaqQ3', a: 'pricingFaqA3' },
    { q: 'pricingFaqQ4', a: 'pricingFaqA4' },
    { q: 'pricingFaqQ5', a: 'pricingFaqA5' },
    { q: 'pricingFaqQ6', a: 'pricingFaqA6' },
  ] as const;

  return (
    <div className="bg-background min-h-screen">

      {/* Nav */}
      <div className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <img src="/icon-192.png" alt="My Kino" className="w-7 h-7 rounded-lg" />
            <span className="font-bold text-foreground text-base">My Kino</span>
          </button>
          <button
            onClick={() => navigate('/app')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('pricingBackToApp')} →
          </button>
        </div>
      </div>

      {/* Hero */}
      <section className="px-6 py-20 text-center max-w-5xl mx-auto">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-6">
          <Sparkles size={11} />
          {t('pricingBadge')}
        </span>
        <h1 className="text-5xl sm:text-6xl font-bold text-foreground mb-5 leading-[1.1] tracking-tight">
          {t('pricingHero')}
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto mb-10">
          {t('pricingSubtitle')}
        </p>

        {/* Billing toggle — affects Pro price only */}
        <div className="inline-flex items-center rounded-2xl border border-border bg-card p-1 mb-12">
          <button
            onClick={() => setIsAnnual(false)}
            className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${
              !isAnnual
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('pricingMonthly')}
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all relative ${
              isAnnual
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('pricingAnnual')}
            {!isAnnual && (
              <span className="absolute -top-2.5 -right-2 bg-destructive text-destructive-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                −35%
              </span>
            )}
          </button>
        </div>

        {/* Pricing cards — Demo | Free | Pro in one row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left mb-3">

          {/* Demo */}
          <div className="rounded-2xl bg-card border border-border p-7">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {t('pricingDemoTag')}
            </span>
            <div className="text-2xl font-bold text-foreground mt-3 mb-1">{t('pricingDemoName')}</div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">{t('pricingDemoDesc')}</p>
            <div className="mb-5">
              <span className="text-4xl font-bold text-foreground tracking-tight">€0</span>
              <p className="text-sm text-muted-foreground mt-1">{t('pricingDemoAlways')}</p>
            </div>
            <button
              onClick={() => navigate('/app')}
              className="w-full py-2.5 rounded-xl border border-border bg-transparent text-foreground font-semibold text-sm hover:bg-secondary transition-colors mb-5"
            >
              {t('pricingDemoBtn')}
            </button>
            <div className="border-t border-border pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground mb-3">
                {t('pricingWhatsIncluded')}
              </p>
              <ul className="space-y-2.5">
                {demoFeatures.map(key => (
                  <li key={key} className="flex items-start gap-3 text-sm">
                    <Check size={14} className="text-primary flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span className="text-foreground">{t(key)}</span>
                  </li>
                ))}
                <li className="flex items-start gap-3 text-sm">
                  <Minus size={14} className="text-muted-foreground/40 flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <span className="text-muted-foreground">AI recommendations</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Minus size={14} className="text-muted-foreground/40 flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <span className="text-muted-foreground">Cloud sync</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Free */}
          <div className="rounded-2xl bg-card border border-border p-7">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {t('pricingFreeTag')}
            </span>
            <div className="text-2xl font-bold text-foreground mt-3 mb-1">{t('pricingFreeName')}</div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">{t('pricingFreeDesc')}</p>
            <div className="mb-5">
              <span className="text-4xl font-bold text-foreground tracking-tight">€0</span>
              <p className="text-sm text-muted-foreground mt-1">{t('pricingFreeAlways')}</p>
            </div>
            <button
              onClick={() => navigate('/app/settings')}
              className="w-full py-2.5 rounded-xl border border-border bg-transparent text-foreground font-semibold text-sm hover:bg-secondary transition-colors mb-5"
            >
              {t('pricingFreeBtn')}
            </button>
            <div className="border-t border-border pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground mb-3">
                {t('pricingWhatsIncluded')}
              </p>
              <ul className="space-y-2.5">
                {freeFeatures.map(key => (
                  <li key={key} className="flex items-start gap-3 text-sm">
                    <Check size={14} className="text-primary flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span className="text-foreground">{t(key)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Pro */}
          <div className="rounded-2xl bg-card border-2 border-primary/40 p-7 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/[0.03] pointer-events-none rounded-2xl" />
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Sparkles size={10} />
              Pro
            </span>
            <div className="text-2xl font-bold text-foreground mt-3 mb-1">Pro</div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">{t('pricingProDesc')}</p>
            <div className="mb-5">
              <span className="text-4xl font-bold text-foreground tracking-tight">
                {isAnnual ? '€3.25' : '€4.99'}
              </span>
              <p className="text-sm text-muted-foreground mt-1">
                {isAnnual ? t('pricingProAnnual') : t('pricingProMonthly')}
              </p>
              {isAnnual && (
                <p className="text-xs text-primary font-medium mt-1">{t('pricingProSaving')}</p>
              )}
            </div>
            <button className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 mb-5">
              {t('pricingProBtn')}
            </button>
            <div className="border-t border-border pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground mb-3">
                {t('pricingEverythingPlus')}
              </p>
              <ul className="space-y-2.5">
                {proFeatures.map(key => (
                  <li key={key} className="flex items-start gap-3 text-sm">
                    <Check size={14} className="text-primary flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span className="text-foreground">{t(key)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>

        {/* Community — full-width card */}
        <div className="rounded-2xl bg-card border border-dashed border-border p-8 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                  <Server size={17} className="text-muted-foreground" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground block leading-none mb-1">
                    {t('pricingCommunityTag')}
                  </span>
                  <span className="text-lg font-bold text-foreground">{t('pricingCommunityName')}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-xl">
                {t('pricingCommunityDesc')}
              </p>
              <ul className="flex flex-wrap gap-x-6 gap-y-2">
                {communityFeatures.map(key => (
                  <li key={key} className="flex items-center gap-2 text-sm">
                    <Check size={13} className="text-primary flex-shrink-0" strokeWidth={2.5} />
                    <span className="text-foreground">{t(key)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2 flex-shrink-0">
              <p className="text-sm font-semibold text-muted-foreground">{t('pricingCommunityFree')}</p>
              <button
                onClick={() => navigate('/community')}
                className="px-6 py-3 rounded-xl border border-border bg-transparent text-foreground font-semibold text-sm hover:bg-secondary transition-colors whitespace-nowrap"
              >
                {t('pricingCommunityBtn')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature showcase */}
      <div className="border-t border-border bg-secondary/30">
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary mb-5">
              {t('pricingUnlocksLabel')}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
              {t('pricingAiSectionTitle')}
            </h2>
          </div>

          {/* Main AI feature */}
          <div className="rounded-2xl bg-card border border-border p-8 mb-4 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <Sparkles size={20} className="text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3 leading-snug">
                {t('pricingAiCardTitle')}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                {t('pricingAiCardDesc')}
              </p>
              <p className="text-xs font-semibold text-primary">{t('pricingAiCardHint')}</p>
            </div>

            {/* Mock recommendation */}
            <div className="rounded-2xl bg-background border border-border p-5">
              <div className="flex items-center gap-3 pb-4 mb-4 border-b border-border">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={14} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">MyKino AI</p>
                  <p className="text-xs text-muted-foreground">{t('pricingMockSub')}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                {t('pricingMockMsg')}
              </p>
              <div className="space-y-2">
                {MOCK_FILMS.map(film => (
                  <div
                    key={film.title}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card border border-border"
                  >
                    <div className="w-8 h-12 rounded-lg bg-secondary flex items-center justify-center text-base flex-shrink-0">
                      {film.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{film.title}</p>
                      <p className="text-xs text-muted-foreground">{film.meta}</p>
                    </div>
                    <span className="text-xs font-semibold text-primary flex-shrink-0">{film.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Two smaller feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-card border border-border p-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <Cloud size={20} className="text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-2">{t('pricingSyncTitle')}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t('pricingSyncDesc')}</p>
            </div>
            <div className="rounded-2xl bg-card border border-border p-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <Brain size={20} className="text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-2">{t('pricingTasteTitle')}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t('pricingTasteDesc')}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            {([
              { stat: '30', label: 'pricingTrialStat' },
              { stat: '€0', label: 'pricingNoDataStat' },
              { stat: '∞', label: 'pricingUnlimitedStat' },
            ] as const).map(item => (
              <div key={item.stat} className="rounded-2xl bg-card border border-border p-6">
                <div className="text-4xl font-bold text-primary mb-2 tracking-tight">{item.stat}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(item.label)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trust / privacy */}
      <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t('pricingBuiltTitle')}</h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">{t('pricingBuiltSubtitle')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-card border border-border p-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
              <ShieldCheck size={20} className="text-primary" />
            </div>
            <h4 className="font-semibold text-foreground mb-2">{t('pricingPrivacyTitle')}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{t('pricingPrivacyDesc')}</p>
          </div>
          <div className="rounded-2xl bg-card border border-border p-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
              <Check size={20} className="text-primary" strokeWidth={2.5} />
            </div>
            <h4 className="font-semibold text-foreground mb-2">{t('pricingCancelTitle')}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{t('pricingCancelDesc')}</p>
          </div>
          <div className="rounded-2xl bg-card border border-border p-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
              <Sparkles size={20} className="text-primary" />
            </div>
            <h4 className="font-semibold text-foreground mb-2">{t('pricingMaintainedTitle')}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{t('pricingMaintainedDesc')}</p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="border-t border-border bg-secondary/30">
        <div className="max-w-3xl mx-auto px-6 py-20 lg:py-28">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary mb-5">
              {t('pricingFaqLabel')}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
              {t('pricingFaqTitle')}
            </h2>
          </div>
          <div>
            {faqs.map((faq, i) => (
              <div key={i} className="border-b border-border">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="font-semibold text-foreground text-base">{t(faq.q)}</span>
                  <span className={`text-primary flex-shrink-0 text-xl font-light transition-transform duration-200 inline-block ${openFaq === i ? 'rotate-45' : ''}`}>
                    +
                  </span>
                </button>
                <div className={`text-sm text-muted-foreground leading-relaxed overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-48 pb-5' : 'max-h-0'}`}>
                  {t(faq.a)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="py-28 px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-5 leading-tight">
          {t('pricingCtaTitle')}
        </h2>
        <p className="text-lg text-muted-foreground mb-10 max-w-md mx-auto leading-relaxed">
          {t('pricingCtaSubtitle')}
        </p>
        <button className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
          {t('pricingCtaBtn')}
        </button>
        <p className="text-sm text-muted-foreground mt-5">{t('pricingCtaNote')}</p>
      </div>

      <Footer />
    </div>
  );
}
