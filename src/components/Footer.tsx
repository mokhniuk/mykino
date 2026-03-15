import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { config } from '@/lib/config';

export default function Footer() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <span>
          © 2026 <span className="text-foreground font-medium">mykino.app</span>
          <span className="opacity-40 ml-2">v{__APP_VERSION__}</span>
        </span>
        <div className="flex gap-6">
          {config.hasManagedAI && (
            <>
              <button onClick={() => navigate('/pricing')} className="hover:text-foreground transition-colors">{t('footerPricing')}</button>
              <button onClick={() => navigate('/privacy')} className="hover:text-foreground transition-colors">{t('footerPrivacy')}</button>
              <button onClick={() => navigate('/terms')} className="hover:text-foreground transition-colors">{t('footerTerms')}</button>
              <button onClick={() => navigate('/contact')} className="hover:text-foreground transition-colors">{t('footerContact')}</button>
            </>
          )}
          <button onClick={() => navigate('/app')} className="hover:text-foreground transition-colors">{t('pricingFreeBtn')}</button>
        </div>
      </div>
    </footer>
  );
}
