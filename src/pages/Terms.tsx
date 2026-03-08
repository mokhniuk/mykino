import { useNavigate } from 'react-router-dom';

export default function Terms() {
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
        <h1 className="text-4xl font-bold text-foreground mb-3 leading-tight">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-12">Last updated: March 2026</p>

        <div className="space-y-10 text-sm text-muted-foreground leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">Acceptance</h2>
            <p>By using My Kino, you agree to these terms. If you don't agree, please don't use the app. These terms apply to the free PWA and any future Pro subscription.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">What My Kino is</h2>
            <p>My Kino is a personal film tracking Progressive Web App developed and maintained by Oleg Mokhniuk. It is provided as-is, primarily free of charge, with an optional Pro subscription for additional features.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">Free tier</h2>
            <div className="rounded-2xl bg-card border border-border p-6 space-y-2">
              <p>The free version of My Kino is available without registration and without time limit. We reserve the right to modify or discontinue features, but will provide reasonable notice for any breaking changes.</p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">Pro subscription (coming soon)</h2>
            <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
              <div>
                <p className="font-medium text-foreground mb-1">Billing</p>
                <p>Pro is billed monthly or annually. Prices are shown in EUR and include applicable taxes. Payments are processed by Stripe.</p>
              </div>
              <div className="border-t border-border pt-4">
                <p className="font-medium text-foreground mb-1">Free trial</p>
                <p>Pro includes a 14-day free trial. No charge is made until the trial ends. You may cancel at any time before the trial ends without being charged.</p>
              </div>
              <div className="border-t border-border pt-4">
                <p className="font-medium text-foreground mb-1">Cancellation</p>
                <p>You may cancel your Pro subscription at any time. Cancellation takes effect at the end of the current billing period. No partial refunds are issued for unused time, except where required by law.</p>
              </div>
              <div className="border-t border-border pt-4">
                <p className="font-medium text-foreground mb-1">Refunds</p>
                <p>If you experience a technical issue that prevents you from using Pro features, contact us at <a href="mailto:hello@mykino.app" className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity">hello@mykino.app</a> and we will make it right.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">Acceptable use</h2>
            <p>You agree not to use My Kino to:</p>
            <ul className="mt-3 space-y-1.5 list-disc list-inside">
              <li>Attempt to reverse-engineer or tamper with the app</li>
              <li>Use automated scraping or bulk data extraction</li>
              <li>Violate any applicable law or third-party rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">Third-party services</h2>
            <p>My Kino uses The Movie Database (TMDB) for film data. TMDB is not affiliated with My Kino. Their terms apply to their data. If you use the AI Advisor, the terms of your chosen AI provider also apply.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">Disclaimer</h2>
            <p>My Kino is provided "as is" without warranty of any kind. We do not guarantee uninterrupted availability. To the maximum extent permitted by law, we are not liable for any indirect or consequential damages arising from your use of the app.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">Changes to these terms</h2>
            <p>We may update these terms from time to time. Significant changes will be communicated via the app or by email if you have a Pro account. Continued use after changes constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">Governing law</h2>
            <p>These terms are governed by the laws of Germany. Disputes shall be subject to the jurisdiction of the courts of Germany.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">Contact</h2>
            <p>
              Questions about these terms? Email <a href="mailto:hello@mykino.app" className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity">hello@mykino.app</a>.
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
