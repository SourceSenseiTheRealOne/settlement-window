"use client";

import { useMemo, useState } from "react";
import type { WalletClient } from "viem";
import {
  quoteProtection,
  type ProtectionQuote,
} from "@/domain/protection";
import {
  deserializeProtectionMarket,
  type ProtectionMarketDto,
} from "@/lib/dreamdex/market-dto";
import type { ProtectionMarketSnapshot } from "@/lib/dreamdex/market-reader";
import {
  executeProtectionOrder,
  redeemProtection,
  type ProtectionExecution,
  type ProtectionRedemption,
} from "@/lib/dreamdex/order-writer";
import type { ProtectionResolution } from "@/lib/dreamdex/resolution-reader";
import {
  connectShannonWallet,
  type WalletConnection,
} from "@/lib/dreamdex/wallet";
import {
  SHANNON_EXPLORER_URL,
} from "@/lib/dreamdex/config";
import {
  attestSettlementReceipt,
  configuredReceiptAddress,
  createShieldReceipt,
  finalizeShieldReceipt,
  type ReceiptWrite,
} from "@/lib/receipt/receipt-client";
import {
  formatProbabilityMicros,
  formatUsdMicros,
  parseUsdMicros,
  shortHash,
} from "@/lib/format";

type SettlementType = "invoice" | "bridge";
type QuoteState = {
  market: ProtectionMarketSnapshot;
  quote: ProtectionQuote;
  exposureUsdMicros: bigint;
};

const txUrl = (hash: string) => `${SHANNON_EXPLORER_URL}/tx/${hash}`;

export function ProtectionWizard() {
  const [settlementType, setSettlementType] = useState<SettlementType>("invoice");
  const [externalReference, setExternalReference] = useState("INV-2026-0901-001");
  const [exposureUsd, setExposureUsd] = useState("1000");
  const [intervalSec, setIntervalSec] = useState<900 | 3600>(900);
  const [maxCostUsd, setMaxCostUsd] = useState("10");
  const [compensationUsd, setCompensationUsd] = useState("10");
  const [quoteState, setQuoteState] = useState<QuoteState | null>(null);
  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [execution, setExecution] = useState<ProtectionExecution | null>(null);
  const [receipt, setReceipt] = useState<ReceiptWrite | null>(null);
  const [settlementReference, setSettlementReference] = useState("");
  const [attestationTx, setAttestationTx] = useState<string | null>(null);
  const [resolution, setResolution] = useState<ProtectionResolution | null>(null);
  const [redemption, setRedemption] = useState<ProtectionRedemption | null>(null);
  const [finalizationTx, setFinalizationTx] = useState<string | null>(null);
  const [busy, setBusy] = useState<
    "quote" | "connect" | "execute" | "receipt" | "attest" | "resolve" | "redeem" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const receiptAddress = configuredReceiptAddress();
  const visibleLiquidity = useMemo(
    () => quoteState?.market.downAsks.reduce((sum, level) => sum + level.sharesMicros, 0n) ?? 0n,
    [quoteState],
  );

  function clearExecutedState() {
    setExecution(null);
    setReceipt(null);
    setAttestationTx(null);
    setResolution(null);
    setRedemption(null);
    setFinalizationTx(null);
  }

  async function requestQuote() {
    setBusy("quote");
    setError(null);
    clearExecutedState();
    try {
      const exposureUsdMicros = parseUsdMicros(exposureUsd);
      const response = await fetch(`/api/markets?interval=${intervalSec}`, {
        cache: "no-store",
      });
      const body = (await response.json()) as {
        market?: ProtectionMarketDto;
        error?: string;
      };
      if (!response.ok || !body.market) {
        throw new Error(body.error ?? "DreamDEX did not return a usable market.");
      }
      const market = deserializeProtectionMarket(body.market);
      const quote = quoteProtection(
        {
          exposureUsdMicros,
          desiredCompensationUsdMicros: parseUsdMicros(compensationUsd),
          maxCostUsdMicros: parseUsdMicros(maxCostUsd),
          intervalSec,
          settlementFeeBps: market.settlementFeeBps,
        },
        market.downAsks,
      );
      setQuoteState({ market, quote, exposureUsdMicros });
    } catch (cause) {
      setQuoteState(null);
      setError(cause instanceof Error ? cause.message : "Quote failed.");
    } finally {
      setBusy(null);
    }
  }

  async function connectWallet(): Promise<WalletConnection> {
    if (wallet) return wallet;
    setBusy("connect");
    setError(null);
    try {
      const connection = await connectShannonWallet();
      setWallet(connection);
      return connection;
    } finally {
      setBusy(null);
    }
  }

  async function recordReceipt(client: WalletClient, result: ProtectionExecution) {
    if (!quoteState) throw new Error("Refresh the protection quote first.");
    setBusy("receipt");
    const written = await createShieldReceipt(client, {
      settlementType,
      externalReference,
      marketId: quoteState.market.marketId,
      protectionOrderTxHash: result.transactionHash,
      exposureUsdMicros: quoteState.exposureUsdMicros,
      maximumCostUsdMicros: result.actualCostUsdMicros,
      protectedSharesMicros: result.filledSharesMicros,
      maximumPayoutUsdMicros: result.protectedPayoutUsdMicros,
      eventContractExpiry: quoteState.market.expiry,
    });
    setReceipt(written);
    setBusy(null);
  }

  async function executeProtection() {
    if (!quoteState) return;
    if (!receiptAddress) {
      setError("Receipt registry is not deployed or configured. Protection execution is blocked.");
      return;
    }
    setError(null);
    setBusy("execute");
    try {
      const connection = await connectWallet();
      setBusy("execute");
      const result = await executeProtectionOrder(
        connection.client,
        quoteState.market,
        quoteState.quote,
      );
      setExecution(result);
      await recordReceipt(connection.client, result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Protection execution failed.");
    } finally {
      setBusy(null);
    }
  }

  async function retryReceipt() {
    if (!wallet || !execution) return;
    setError(null);
    try {
      await recordReceipt(wallet.client, execution);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Receipt creation failed.");
    } finally {
      setBusy(null);
    }
  }

  async function attestSettlement() {
    if (!wallet || !receipt) return;
    setBusy("attest");
    setError(null);
    try {
      const hash = await attestSettlementReceipt(
        wallet.client,
        receipt.shieldId,
        settlementReference,
      );
      setAttestationTx(hash);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Settlement attestation failed.");
    } finally {
      setBusy(null);
    }
  }

  async function refreshResolution() {
    if (!quoteState) return;
    setBusy("resolve");
    setError(null);
    try {
      const response = await fetch(
        `/api/markets/${quoteState.market.marketId}/resolution`,
        { cache: "no-store" },
      );
      const body = (await response.json()) as {
        resolution?: ProtectionResolution;
        error?: string;
      };
      if (!response.ok || !body.resolution) {
        throw new Error(body.error ?? "DreamDEX resolution read failed.");
      }
      setResolution(body.resolution);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Resolution read failed.");
    } finally {
      setBusy(null);
    }
  }

  async function completeResolvedShield() {
    if (!wallet || !receipt || !execution || !quoteState || !resolution || !attestationTx) return;
    setBusy("redeem");
    setError(null);
    try {
      const redeemed = await redeemProtection(
        wallet.client,
        quoteState.market,
        execution,
        resolution,
      );
      setRedemption(redeemed);
      const outcome = resolution.winningOutcome ?? 0;
      const finalized = await finalizeShieldReceipt(
        wallet.client,
        receipt.shieldId,
        outcome,
        resolution.isVoided,
        redeemed.payoutUsdMicros,
        redeemed.transactionHash,
      );
      setFinalizationTx(finalized);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Protection finalization failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section id="protect" className="product-shell" aria-label="SettleShield protection workflow">
      <div className="configuration-pane">
        <div className="workspace-heading">
          <div>
            <span className="step-label">Protection workspace</span>
            <h2>Price the settlement gap.</h2>
            <p>Describe the pending value, then set the most you are willing to spend protecting it.</p>
          </div>
          <span className="safety-note">No leverage / no liquidation</span>
        </div>

        <div className="group-heading">
          <span>Exposure</span>
          <h3>Settlement exposure</h3>
        </div>

        <div className="segmented" role="group" aria-label="Settlement type">
          <button className={settlementType === "invoice" ? "selected" : ""} onClick={() => setSettlementType("invoice")} type="button">Crypto invoice</button>
          <button className={settlementType === "bridge" ? "selected" : ""} onClick={() => setSettlementType("bridge")} type="button">Bridge transfer</button>
        </div>

        <div className="form-grid">
          <label>
            External reference
            <input value={externalReference} onChange={(event) => setExternalReference(event.target.value)} placeholder="Invoice or bridge reference" />
          </label>
          <label>
            Settlement value (USD)
            <input inputMode="decimal" value={exposureUsd} onChange={(event) => setExposureUsd(event.target.value)} />
          </label>
          <div className="group-heading full-field limits-heading">
            <span>Limits</span>
            <h3>Protection limits</h3>
          </div>
          <label>
            Settlement window
            <select value={intervalSec} onChange={(event) => setIntervalSec(Number(event.target.value) as 900 | 3600)}>
              <option value={900}>15 minutes</option>
              <option value={3600}>1 hour</option>
            </select>
          </label>
          <label>
            Maximum protection cost (USD)
            <input inputMode="decimal" value={maxCostUsd} onChange={(event) => setMaxCostUsd(event.target.value)} />
          </label>
          <label className="full-field">
            Desired maximum payout (USD)
            <input inputMode="decimal" value={compensationUsd} onChange={(event) => setCompensationUsd(event.target.value)} />
            <small>This is a cap, not a promise to cover the complete price move. Shannon test execution uses tUSDC as the equivalent test-dollar collateral unit.</small>
          </label>
        </div>

        <button className="primary-button" disabled={busy !== null} onClick={requestQuote} type="button">
          {busy === "quote" ? "Checking live liquidity..." : "Find protection"}
        </button>

        {error && <div className="error-message" role="alert">{error}</div>}
      </div>

      <aside className="economics-pane" aria-live="polite">
        {!quoteState ? (
          <div className="empty-quote">
            <span className="empty-label">Ready for quote</span>
            <h2>Protection economics</h2>
            <p>Set a budget and compensation cap. SettleShield will refuse thin, stale, or over-budget protection.</p>
          </div>
        ) : (
          <>
            <div className="section-heading">
              <div>
                <span className="step-label">Live market quote</span>
                <h2>Protection economics</h2>
              </div>
              <span className="market-status">Trading</span>
            </div>

            <dl className="quote-metrics">
              <div><dt>Direction</dt><dd>ETH DOWN</dd></div>
              <div><dt>Known maximum loss</dt><dd>{formatUsdMicros(quoteState.quote.knownMaximumLossUsdMicros)}</dd></div>
              <div><dt>Maximum payout</dt><dd>{formatUsdMicros(quoteState.quote.maxPayoutUsdMicros)}</dd></div>
              <div><dt>Maximum net offset</dt><dd>{formatUsdMicros(quoteState.quote.maxNetOffsetUsdMicros)}</dd></div>
              <div><dt>Average DOWN price</dt><dd>{formatProbabilityMicros(quoteState.quote.averagePriceMicros)}</dd></div>
              <div><dt>Visible DOWN shares</dt><dd>{(Number(visibleLiquidity) / 1_000_000).toFixed(2)}</dd></div>
            </dl>

            <div className="market-line">
              <span>{quoteState.market.symbol}</span>
              <a href={`${SHANNON_EXPLORER_URL}/address/${quoteState.market.pool}`} target="_blank" rel="noreferrer">View pool</a>
            </div>

            {!receiptAddress && (
              <div className="warning-message">
                Receipt registry missing. Deploy it on Shannon before execution.
              </div>
            )}

            <button className="primary-button" disabled={busy !== null || !receiptAddress || Boolean(execution)} onClick={executeProtection} type="button">
              {busy === "execute" ? "Executing IOC order..." : execution ? "Protection executed" : "Protect settlement"}
            </button>

            {!wallet && (
              <button className="secondary-button" disabled={busy !== null} onClick={() => void connectWallet().catch((cause) => setError(cause instanceof Error ? cause.message : "Wallet connection failed."))} type="button">
                {busy === "connect" ? "Connecting..." : "Connect wallet"}
              </button>
            )}
            {wallet && <p className="wallet-line">Wallet {shortHash(wallet.address)}</p>}

            {execution && (
              <div className="execution-panel">
                <h3>{execution.status === "FILLED" ? "Protection active" : "Partial protection active"}</h3>
                <p>{execution.fillRatioBps / 100}% filled. Actual cost {formatUsdMicros(execution.actualCostUsdMicros)}.</p>
                <a href={txUrl(execution.transactionHash)} target="_blank" rel="noreferrer">DreamDEX transaction</a>
                {!receipt && <button className="secondary-button" disabled={busy !== null} onClick={retryReceipt} type="button">Retry onchain receipt</button>}
              </div>
            )}

            {receipt && (
              <div className="receipt-panel">
                <h3>Onchain receipt linked</h3>
                <p>Shield {shortHash(receipt.shieldId)}</p>
                <a href={txUrl(receipt.transactionHash)} target="_blank" rel="noreferrer">Receipt transaction</a>
                {!attestationTx ? (
                  <div className="attestation-form">
                    <label>
                      External settlement reference
                      <input value={settlementReference} onChange={(event) => setSettlementReference(event.target.value)} placeholder="Payment tx, bridge tx, or signed attestation" />
                    </label>
                    <button className="secondary-button" disabled={busy !== null} onClick={attestSettlement} type="button">
                      {busy === "attest" ? "Attesting..." : "Confirm settlement"}
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="success-line">Settlement confirmed. <a href={txUrl(attestationTx)} target="_blank" rel="noreferrer">View attestation</a></p>
                    <button className="secondary-button" disabled={busy !== null} onClick={refreshResolution} type="button">
                      {busy === "resolve" ? "Reading oracle result..." : "Check Event Contract result"}
                    </button>
                    {resolution && (
                      <div className="resolution-panel">
                        <p><strong>Event status:</strong> {resolution.status}</p>
                        {resolution.resolutionTransactionHash && (
                          <a href={txUrl(resolution.resolutionTransactionHash)} target="_blank" rel="noreferrer">Resolution transaction</a>
                        )}
                        {(resolution.isResolved || resolution.isVoided) && !finalizationTx && (
                          <button className="primary-button" disabled={busy !== null} onClick={completeResolvedShield} type="button">
                            {busy === "redeem" ? "Redeeming and finalizing..." : "Complete protection receipt"}
                          </button>
                        )}
                      </div>
                    )}
                    {finalizationTx && redemption && (
                      <div className="compensation-panel">
                        <h3>{redemption.payoutUsdMicros > 0n ? "Compensation recorded" : "No compensation due"}</h3>
                        <p>Actual Event Contract payout: {formatUsdMicros(redemption.payoutUsdMicros)}.</p>
                        {redemption.shouldRedeem && (
                          <a href={txUrl(redemption.transactionHash)} target="_blank" rel="noreferrer">Redemption transaction</a>
                        )}
                        <a href={txUrl(finalizationTx)} target="_blank" rel="noreferrer">Final receipt transaction</a>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </aside>
    </section>
  );
}
