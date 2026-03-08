import { useNavigate } from 'react-router-dom';

export default function Privacy() {
  const navigate = useNavigate();

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
            ← Back
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary mb-4">Legal</p>
        <h1 className="text-4xl font-bold text-foreground mb-3 leading-tight">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-12">Last updated: March 2026</p>

        <div className="space-y-10 text-sm text-muted-foreground leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">The short version</h2>
            <p>
              My Kino is a privacy-first app. Your watchlist, favourites, and watch history live entirely on your device. We never see them, never store them on a server, and never sell them to anyone.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">What data we collect</h2>
            <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
              <div>
                <p className="font-medium text-foreground mb-1">Nothing personal — by design</p>
                <p>Your watchlist, watched history, favourites, genre preferences, and settings are stored in your browser's IndexedDB. This data never leaves your device unless you explicitly export it.</p>
              </div>
              <div className="border-t border-border pt-4">
                <p className="font-medium text-foreground mb-1">Anonymous usage analytics</p>
                <p>
                  We use <a href="https://umami.mokhni.uk/share/fH4J4yX37j8uuyU7" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity">Umami</a> — a privacy-focused, open-source analytics tool. It collects only aggregate, anonymous data: page views and feature interactions. No cookies, no personal identifiers, no cross-site tracking. The full dataset is publicly viewable at the link above.
                </p>
              </div>
              <div className="border-t border-border pt-4">
                <p className="font-medium text-foreground mb-1">Movie & TV data</p>
                <p>When you search or browse, queries are sent to The Movie Database (TMDB) API. Please refer to <a href="https://www.themoviedb.org/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity">TMDB's privacy policy</a> for their data practices.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">AI Advisor</h2>
            <p>
              If you use the AI Advisor feature, your queries are sent directly to the AI provider you configure (OpenAI, Anthropic, Google, Mistral, or a local Ollama instance). My Kino does not proxy or log these requests. Your API key is stored locally on your device only.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">Pro / cloud sync (coming soon)</h2>
            <p>
              When cloud sync is available, the minimum data needed to sync your collection (encrypted) will be stored on our servers. A separate, detailed policy will be published before this feature launches.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">Cookies</h2>
            <p>My Kino does not use cookies. Local app state is stored in localStorage and IndexedDB.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">Your rights</h2>
            <p>
              Because we don't collect personal data, there is nothing to request, correct, or delete on our end. You can clear all local app data at any time via <span className="text-foreground font-medium">Settings → Data → Clear All Data</span>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">Contact</h2>
            <p>
              Questions about privacy? Email <a href="mailto:hello@mykino.app" className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity">hello@mykino.app</a>.
            </p>
          </section>

        </div>
      </div>

      <footer className="border-t border-border px-6 py-10 mt-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>© 2026 <span className="text-foreground font-medium">mykino.app</span></span>
          <div className="flex gap-6">
            <button onClick={() => navigate('/privacy')} className="hover:text-foreground transition-colors">Privacy</button>
            <button onClick={() => navigate('/terms')} className="hover:text-foreground transition-colors">Terms</button>
            <button onClick={() => navigate('/contact')} className="hover:text-foreground transition-colors">Contact</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
