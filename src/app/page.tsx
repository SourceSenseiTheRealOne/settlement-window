import { ProtectionWizard } from "@/features/protection/ProtectionWizard";

const EXPLORER = "https://shannon-explorer.somnia.network";

const evidence = [
  {
    label: "BUY NO IOC",
    value: "1.00 NO at 0.45 tUSDC",
    href: `${EXPLORER}/tx/0x2683372fa36bdeb2ddfd33661636abf79203632484942a9481477c0038242c0e`,
  },
  {
    label: "Protection receipt",
    value: "Exposure and fill linked",
    href: `${EXPLORER}/tx/0x9d2371ee1a08e4c5c9533a3729a004d5c8e8a6cea19edfee1a5f7d6250b02bee`,
  },
  {
    label: "Settlement attestation",
    value: "Owner-attested settlement",
    href: `${EXPLORER}/tx/0x13a99d56a326680d107ea7926c932845fe1129f255d298d6d57afcbc3dffe487`,
  },
  {
    label: "Final receipt",
    value: "Resolved with 0 payout",
    href: `${EXPLORER}/tx/0x7fe410cbe2de2091947038b9a8168ddcefe5cbb70761e13465ada74b8cf7b04e`,
  },
];

export default function Home() {
  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Settlement Window home">
          <span className="brand-mark">S</span>
          <span>Settlement Window</span>
        </a>
        <nav className="topnav" aria-label="Primary navigation">
          <a href="#protect">Product</a>
          <a href="#proof">Proof</a>
          <a href="https://github.com/SourceSenseiTheRealOne/settlement-window" target="_blank" rel="noreferrer">Source</a>
        </nav>
        <div className="network-label"><span aria-hidden="true" />Somnia Shannon</div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Settlement risk, bounded</p>
          <h1>Protect value while crypto settlement is pending.</h1>
          <p className="hero-description">
            Review a cost estimate. Buy a bounded ETH DOWN position. Keep the settlement and protection evidence linked onchain.
          </p>
          <div className="hero-actions">
            <a className="primary-link" href="#protect">Price protection</a>
            <a className="text-link" href="#proof">Inspect the proof</a>
          </div>
        </div>

        <aside className="mechanism" aria-label="How Settlement Window works">
          <div className="mechanism-header">
            <span>Settlement exposure</span>
            <strong>15-60 min</strong>
          </div>
          <div className="mechanism-row">
            <span>Invoice value</span>
            <strong>$1,000 USD</strong>
          </div>
          <div className="mechanism-row accent-row">
            <span>Bounded protection</span>
            <strong>ETH DOWN</strong>
          </div>
          <div className="mechanism-result">
            <span>Quote cost</span>
            <strong>Excludes network fees</strong>
          </div>
        </aside>
      </section>

      <ProtectionWizard />

      <section className="proof-section" id="proof" aria-labelledby="proof-heading">
        <div className="proof-heading">
          <p className="section-index">Public Shannon evidence</p>
          <h2 id="proof-heading">Verified lifecycle</h2>
          <p>One protection position, one external settlement attestation, and one final receipt. Every state transition is public.</p>
        </div>
        <div className="proof-ledger">
          {evidence.map((item) => (
            <a key={item.label} className="proof-row" href={item.href} target="_blank" rel="noreferrer">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <span className="proof-arrow" aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
        <div className="proof-outcome">
          <span>Market outcome</span>
          <strong>YES won</strong>
          <span>NO payout</span>
          <strong>0.00 tUSDC</strong>
          <span>Receipt</span>
          <strong>Resolved</strong>
        </div>
      </section>

      <footer className="site-footer">
        <p>Bounded protection for settlement time. No leverage. No liquidation. No promise of full coverage.</p>
        <a href="https://sourcesenseitherealone.github.io/settlement-window/testnet-proof.json" target="_blank" rel="noreferrer">Public proof JSON</a>
      </footer>
    </main>
  );
}
