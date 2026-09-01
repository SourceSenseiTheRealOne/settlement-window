import { ProtectionWizard } from "@/features/protection/ProtectionWizard";

export default function Home() {
  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="SettleShield home">
          <span className="brand-mark">S</span>
          <span>SettleShield</span>
        </a>
        <div className="network-label">Somnia Shannon Testnet</div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Bounded settlement protection</p>
          <h1>Protect value while crypto settlement is pending.</h1>
          <p className="hero-description">
            Use ETH DOWN Event Contracts to offset part of a short-term price drop. Cost and maximum payout are known before execution.
          </p>
        </div>
        <div className="principle-panel" aria-label="Protection properties">
          <div>
            <span>Maximum loss</span>
            <strong>Protection cost</strong>
          </div>
          <div>
            <span>Leverage</span>
            <strong>None</strong>
          </div>
          <div>
            <span>Liquidation</span>
            <strong>None</strong>
          </div>
        </div>
      </section>

      <ProtectionWizard />

      <section className="plain-language">
        <h2>What this protects</h2>
        <p>
          SettleShield covers settlement time, not every market move. A winning Event Contract can offset part of a loss. It does not guarantee an exchange rate or full compensation.
        </p>
      </section>
    </main>
  );
}
