import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';

export default function Privacy() {
  const navigate = useNavigate();
  const { t } = useI18n();

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
            onClick={() => navigate(-1)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('backBtn')}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary mb-4">{t('legalLabel')}</p>
        <h1 className="text-4xl font-bold text-foreground mb-3 leading-tight">{t('privacyTitle')}</h1>
        <p className="text-sm text-muted-foreground mb-12">{t('privacyUpdated')}</p>

        <div className="space-y-10 text-sm text-muted-foreground leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">{t('privacyShortTitle')}</h2>
            <p>{t('privacyShortText')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">{t('privacyDataTitle')}</h2>
            <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
              <div>
                <p className="font-medium text-foreground mb-1">{t('privacyLocalTitle')}</p>
                <p>{t('privacyLocalText')}</p>
              </div>
              <div className="border-t border-border pt-4">
                <p className="font-medium text-foreground mb-1">{t('privacyAnalyticsTitle')}</p>
                <p>{t('privacyAnalyticsText')}</p>
              </div>
              <div className="border-t border-border pt-4">
                <p className="font-medium text-foreground mb-1">{t('privacyTmdbTitle')}</p>
                <p>{t('privacyTmdbText')}</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">{t('privacyAiTitle')}</h2>
            <p>{t('privacyAiText')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">{t('privacyProTitle')}</h2>
            <p>{t('privacyProText')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">{t('privacyCookiesTitle')}</h2>
            <p>{t('privacyCookiesText')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">{t('privacyRightsTitle')}</h2>
            <p>{t('privacyRightsText')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">{t('privacyContactTitle')}</h2>
            <p>
              {t('privacyContactText')} <a href="mailto:hello@mykino.app" className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity">hello@mykino.app</a>.
            </p>
          </section>

        </div>
      </div>

      <footer className="border-t border-border px-6 py-10 mt-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>© 2026 <span className="text-foreground font-medium">mykino.app</span></span>
          <div className="flex gap-6">
            <button onClick={() => navigate('/privacy')} className="hover:text-foreground transition-colors">{t('footerPrivacy')}</button>
            <button onClick={() => navigate('/terms')} className="hover:text-foreground transition-colors">{t('footerTerms')}</button>
            <button onClick={() => navigate('/contact')} className="hover:text-foreground transition-colors">{t('footerContact')}</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
