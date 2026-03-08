import { useNavigate } from 'react-router-dom';
import { Mail, Github, Globe } from 'lucide-react';

export default function Contact() {
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
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary mb-4">Get in touch</p>
        <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">Contact</h1>
        <p className="text-lg text-muted-foreground leading-relaxed mb-12">
          My Kino is built and maintained by one person. I read every message and reply to most of them.
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
              <p className="font-semibold text-foreground mb-0.5">Email</p>
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
              <p className="font-semibold text-foreground mb-0.5">Developer</p>
              <p className="text-sm text-muted-foreground">Oleg Mokhniuk — mokhniuk.online</p>
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
              <p className="font-semibold text-foreground mb-0.5">Bug reports & feature requests</p>
              <p className="text-sm text-muted-foreground">Open an issue on GitHub</p>
            </div>
            <span className="text-muted-foreground group-hover:text-foreground transition-colors text-sm">↗</span>
          </a>

        </div>

        <div className="mt-10 rounded-2xl bg-secondary/50 border border-border p-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Response time:</span> Usually within a few days. For billing or Pro subscription issues, email is the fastest path.
          </p>
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
