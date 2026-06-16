const FooterSection = () => {
  return (
    <footer className="bg-foreground text-background py-16 px-6 md:py-24 border-t-8 border-accent-lime">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          <div>
            <h3 className="text-4xl md:text-5xl font-black mb-4">Heirloom</h3>
            <p className="text-lg font-medium opacity-80 leading-relaxed">
              Heartbeat inheritance vault built on Solana.
              Your crypto doesn't die with you.
            </p>
          </div>

          <div>
            <h4 className="text-xl font-black uppercase tracking-widest mb-6">Protocol</h4>
            <ul className="space-y-3">
              {[
                { name: "Documentation", href: "https://docs.heirlm.xyz/" },
                { name: "GitHub", href: "https://github.com/HISTORIAH/Heirloom-app" },
              ].map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-lg font-bold hover:underline underline-offset-4 opacity-80 hover:opacity-100 transition-opacity"
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-black uppercase tracking-widest mb-6">Community</h4>
            <ul className="space-y-3">
              {[
                { name: "Twitter / X", href: "https://x.com/heirloom_app" },
              ].map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-lg font-bold hover:underline underline-offset-4 opacity-80 hover:opacity-100 transition-opacity"
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>

          </div>
        </div>

        <div className="border-t-4 border-background/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm font-bold uppercase tracking-widest opacity-60">
            Heirloom is not a legal will. It is programmable self-custody continuity.
          </p>
          <p className="text-sm font-bold uppercase tracking-widest opacity-60">
            Powered by Solana
          </p>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
