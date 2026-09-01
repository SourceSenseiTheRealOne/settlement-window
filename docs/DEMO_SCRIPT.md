# SettleShield Demo Script

Target length: 2 minutes 35 seconds.

## 0:00-0:20 | Problem

"A business sends a $1,000 ETH invoice. Payment confirmation may take 15 to 60 minutes. During that gap, the business is exposed to ETH falling before settlement completes. Existing prediction-market apps help users speculate. SettleShield uses the same Event Contract infrastructure to protect part of an external settlement."

Show the SettleShield heading and the three properties: maximum loss is the protection cost, no leverage, no liquidation.

## 0:20-0:45 | Configure

1. Select **Crypto invoice**.
2. Use reference `DEMO-INVOICE-001`.
3. Enter `$1,000` settlement value.
4. Select `15 minutes`.
5. Enter a small testnet maximum cost and desired compensation that current liquidity supports.
6. Select **Find protection**.

Say: "SettleShield is bounded protection, not insurance and not a guaranteed exchange rate. It refuses compensation above the invoice value."

## 0:45-1:15 | Live terms

Point to:

- ETH DOWN direction;
- known maximum loss;
- maximum payout;
- maximum net offset;
- current DOWN price;
- visible DOWN shares;
- DreamDEX pool explorer link.

Say: "These are live Shannon terms. The application reads typed `asset` and `intervalSec` fields, checks the canonical onchain market status, and prices only visible DOWN liquidity."

## 1:15-1:45 | Execute

1. Connect the Shannon wallet.
2. Select **Protect settlement**.
3. Approve the wallet requests.
4. Open the DreamDEX transaction link.
5. Open the SettleShield receipt transaction.

Say: "The order is IOC. Anything that does not fill is canceled immediately. Zero fills are rejected; partial fills are labeled partial protection. The receipt links the actual fill, not a requested amount."

## 1:45-2:10 | External settlement

1. Paste the real test invoice, bridge, or signed attestation reference.
2. Select **Confirm settlement**.
3. Open its explorer transaction.

Say: "This step connects an external economic event to the protection position without pretending SettleShield is the payment or bridge network."

## 2:10-2:30 | Resolve and compensate

1. Select **Check Event Contract result**.
2. Show the DreamDEX resolution transaction.
3. Select **Complete protection receipt**.
4. Show actual payout, redemption transaction when applicable, and final receipt transaction.

Say: "If ETH DOWN wins, the NO position redeems and offsets part of the lost settlement value. If ETH UP wins, payout is zero and the known protection cost is lost. A void is recorded separately and pays the protocol-defined half value."

## 2:30-2:35 | Close

"SettleShield turns Event Contracts into demand from payments, bridges, OTC desks, payroll, and treasuries. It protects settlement time, not speculation."
