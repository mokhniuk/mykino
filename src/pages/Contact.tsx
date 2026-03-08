import { useNavigate } from 'react-router-dom';
import { Mail, Github, Globe } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import Footer from '@/components/Footer';

export default function Contact() {
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
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary mb-4">{t('contactLabel')}</p>
        <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">{t('contactTitle')}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed mb-12">
          {t('contactSubtitle')}
        </p>

        <div className="space-y-3">

          <a
            href="mailto:hello@mykino.app"
            className="flex items-center gap-5 p-6 rounded-2xl bg-card border border-border hover:border-primary/40 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Mail size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground mb-0.5">{t('contactEmailTitle')}</p>
              <p className="text-sm text-muted-foreground">hello@mykino.app</p>
            </div>
            <span className="text-muted-foreground group-hover:text-foreground transition-colors text-sm">→</span>
          </a>

          <a
            href="https://mokhniuk.online"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-5 p-6 rounded-2xl bg-card border border-border hover:border-primary/40 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Globe size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground mb-0.5">{t('contactDevTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('contactDevDesc')}</p>
            </div>
            <span className="text-muted-foreground group-hover:text-foreground transition-colors text-sm">↗</span>
          </a>

          <a
            href="https://github.com/anthropics/claude-code/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-5 p-6 rounded-2xl bg-card border border-border hover:border-primary/40 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Github size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground mb-0.5">{t('contactGithubTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('contactGithubDesc')}</p>
            </div>
            <span className="text-muted-foreground group-hover:text-foreground transition-colors text-sm">↗</span>
          </a>

        </div>

        <div className="mt-10 rounded-2xl bg-secondary/50 border border-border p-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">{t('contactResponseTitle')}</span> {t('contactResponseText')}
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
