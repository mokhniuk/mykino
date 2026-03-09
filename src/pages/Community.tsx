import { useNavigate } from 'react-router-dom';
import { Server, Key, Database, Zap, Shield, Package, ChevronRight, Terminal, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import Footer from '@/components/Footer';

const PROVIDERS = [
  { name: 'OpenAI', env: 'OPENAI_API_KEY', example: 'sk-...' },
  { name: 'Anthropic', env: 'ANTHROPIC_API_KEY', example: 'sk-ant-...' },
  { name: 'Gemini', env: 'GEMINI_API_KEY', example: 'AIza...' },
  { name: 'Mistral', env: 'MISTRAL_API_KEY', example: 'your-key' },
  { name: 'Ollama (local)', env: 'OLLAMA_BASE_URL', example: 'http://host.docker.internal:11434' },
];

const COMPOSE = `services:
  mykino:
    image: ghcr.io/mokhniuk/mykino:latest
    ports:
      - "8080:8080"
    environment:
      # Pick ONE AI provider:
      OPENAI_API_KEY: sk-...
      # ANTHROPIC_API_KEY: sk-ant-...
      # GEMINI_API_KEY: AIza...
      # MISTRAL_API_KEY: your-key

      # Optional: cross-device sync via your own Supabase project
      # SUPABASE_URL: https://xxxx.supabase.co
      # SUPABASE_ANON_KEY: eyJ...`;

export default function Community() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const features = [
    { icon: <Key size={20} className="text-primary" />, title: t('communityF1Title'), desc: t('communityF1Desc') },
    { icon: <Database size={20} className="text-primary" />, title: t('communityF2Title'), desc: t('communityF2Desc') },
    { icon: <Shield size={20} className="text-primary" />, title: t('communityF3Title'), desc: t('communityF3Desc') },
    { icon: <Zap size={20} className="text-primary" />, title: t('communityF4Title'), desc: t('communityF4Desc') },
    { icon: <Package size={20} className="text-primary" />, title: t('communityF5Title'), desc: t('communityF5Desc') },
    { icon: <Server size={20} className="text-primary" />, title: t('communityF6Title'), desc: t('communityF6Desc') },
  ];

  return (
    <div className="bg-background min-h-screen">

      {/* Nav */}
      <div className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
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

      <div className="max-w-5xl mx-auto px-6 py-16 space-y-20">

        {/* Hero */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
            <Server size={12} />
            {t('communityBadge')}
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
            {t('communityHeroLine1')}<br />{t('communityHeroLine2')}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t('communitySubtitle')}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <a
              href="https://github.com/mokhniuk/mykino"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              {t('communityGithubBtn')}
            </a>
            <button
              onClick={() => navigate('/pricing')}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('communityComparePlans')} <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-2">
              {f.icon}
              <p className="font-semibold text-foreground text-sm">{f.title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Quick start */}
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-foreground">{t('communityQuickStartTitle')}</h2>
            <p className="text-muted-foreground">{t('communityQuickStartSub')}</p>
          </div>

          {/* Step 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">1</span>
              <p className="font-semibold text-foreground">{t('communityStep1Label')} <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">docker-compose.yml</code></p>
            </div>
            <div className="rounded-xl bg-secondary/60 border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
                <Terminal size={13} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-mono">docker-compose.yml</span>
              </div>
              <pre className="text-xs font-mono text-foreground p-4 overflow-x-auto leading-relaxed">{COMPOSE}</pre>
            </div>
          </div>

          {/* Step 2 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">2</span>
              <p className="font-semibold text-foreground">{t('communityStep2Label')}</p>
            </div>
            <div className="rounded-xl bg-secondary/60 border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
                <Terminal size={13} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-mono">shell</span>
              </div>
              <pre className="text-xs font-mono text-foreground p-4">docker compose up -d</pre>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-2.5">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
            <p className="font-semibold text-foreground">{t('communityStep3Label')} <a href="http://localhost:8080" className="text-primary hover:underline">localhost:8080</a> {t('communityStep3Done')}</p>
          </div>
        </div>

        {/* AI providers */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">{t('communityProvidersTitle')}</h2>
          <p className="text-muted-foreground">{t('communityProvidersSub')}</p>
          <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
            {PROVIDERS.map((p) => (
              <div key={p.env} className="flex items-center justify-between px-4 py-3 bg-card">
                <div className="flex items-center gap-3">
                  <Check size={14} className="text-green-500 shrink-0" />
                  <span className="text-sm font-medium text-foreground">{p.name}</span>
                </div>
                <code className="text-xs text-muted-foreground font-mono bg-secondary px-2 py-1 rounded">
                  {p.env}=<span className="opacity-60">{p.example}</span>
                </code>
              </div>
            ))}
          </div>
        </div>

        {/* Supabase optional */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-primary" />
            <h3 className="font-semibold text-foreground">{t('communitySupabaseTitle')}</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('communitySupabaseDesc1')} <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">supabase.com</a>{t('communitySupabaseDesc2')} <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">supabase/schema.sql</code> {t('communitySupabaseDesc3')}
          </p>
          <div className="rounded-xl bg-secondary/60 border border-border overflow-hidden">
            <pre className="text-xs font-mono text-foreground p-4 leading-relaxed">{`SUPABASE_URL: https://xxxx.supabase.co\nSUPABASE_ANON_KEY: eyJ...`}</pre>
          </div>
          <p className="text-xs text-muted-foreground">{t('communitySupabaseNote')}</p>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4 py-4">
          <h2 className="text-2xl font-bold text-foreground">{t('communityCTATitle')}</h2>
          <p className="text-muted-foreground">{t('communityCTADesc')}</p>
          <a
            href="https://github.com/mokhniuk/mykino"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            {t('communityCTABtn')}
          </a>
        </div>

      </div>

      <Footer />
    </div>
  );
}
