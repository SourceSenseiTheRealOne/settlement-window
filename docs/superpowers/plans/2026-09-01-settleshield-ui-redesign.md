# SettleShield UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic dark SaaS presentation with a deliberate settlement-infrastructure interface while preserving all existing product behavior.

**Architecture:** Keep React state, DreamDEX adapters, receipt writes, API routes, and contract code unchanged. Restructure only semantic JSX and CSS, then mirror the same visual system in the static Pages showcase. Existing Playwright/Brave proof scripts remain the runtime gate.

**Tech Stack:** Next.js 16, React 19, TypeScript, native CSS, static HTML/CSS/JS, Playwright Core, Brave.

## Global Constraints

- No changes to domain, market, wallet, API, receipt, or contract behavior.
- Keep one near-black theme and one mint accent.
- Use fewer rounded cards and pills; favor editorial spacing, hairlines, and strong numeric hierarchy.
- Keep all content visible without JavaScript and avoid decorative autoplay motion.
- Preserve `prefers-reduced-motion`, keyboard focus, and true mobile support.
- Keep the Pages boundary explicit: calculator is illustrative; wallet execution belongs to the full app.
- Desktop and mobile horizontal overflow must remain zero.
- Browser console/page errors must remain empty.

---

### Task 1: Freeze semantic and runtime contracts

**Files:**
- Modify: `scripts/browser-proof.ts`
- Modify: `scripts/showcase-proof.ts`

**Interfaces:**
- Consumes: current public/local routes and Playwright Core.
- Produces: assertions for the new visual hierarchy without coupling to implementation-only classes.

- [ ] **Step 1: Add failing contracts**

Require headings/labels `Settlement exposure`, `Protection limits`, `Protection economics`, and `Verified lifecycle`. Assert the quote calculator remains operable and proof links remain present.

- [ ] **Step 2: Verify RED**

Run:

```bash
npx --yes pnpm@10.18.1 browser:proof
npx --yes pnpm@10.18.1 showcase:proof
```

Expected: both fail because the new hierarchy is absent.

- [ ] **Step 3: Keep geometry gates**

Retain exact `innerWidth`, `scrollWidth`, desktop/mobile screenshots, and empty error-buffer assertions.

### Task 2: Redesign the full Next product surface

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/features/protection/ProtectionWizard.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: existing component state and write handlers unchanged.
- Produces: an editorial product shell with clearer settlement inputs, protection limits, quote economics, and receipt lifecycle.

- [ ] **Step 1: Recompose the page shell**

Use a compact navigation bar, left-aligned product statement, and a proof-led mechanism panel. Keep hero copy factual and under two lines at desktop.

- [ ] **Step 2: Group the form semantically**

Add `Settlement exposure` and `Protection limits` field groups around existing inputs. Preserve every input value, event handler, and accessible label.

- [ ] **Step 3: Recompose quote and lifecycle states**

Promote cost, payout, and net offset as the dominant numeric layer under `Protection economics`. Present execution, receipt, attestation, resolution, and payout as one `Verified lifecycle` sequence without changing conditional logic.

- [ ] **Step 4: Replace generic styling**

Use squared editorial panels, sparse borders, tabular numbers, restrained radii, clear focus rings, and one accent. Keep explicit mobile collapse and reduced-motion rules.

- [ ] **Step 5: Verify GREEN**

Run tests, typecheck, production build, and `browser:proof`.

### Task 3: Bring the Pages showcase into visual parity

**Files:**
- Modify: `showcase/index.html`
- Update: `docs/assets/settleshield-pages-desktop.png`
- Update: `docs/assets/settleshield-pages-mobile.png`

**Interfaces:**
- Consumes: verified public proof JSON and existing static calculator behavior.
- Produces: a static public showcase that matches the redesigned full app.

- [ ] **Step 1: Mirror semantic structure and tokens**

Reuse the same navigation, hero, field groups, economics hierarchy, proof language, radii, and responsive collapse.

- [ ] **Step 2: Preserve static truth boundary**

Keep `Pages showcase`, verified reference-price wording, final `Resolved` state, and all explorer links.

- [ ] **Step 3: Verify GREEN**

Run `showcase:proof`, policy guard, true mobile/desktop screenshots, and visual QA.

### Task 4: Freeze and publish

**Files:**
- Modify only the redesign paths listed above plus generated reviewed screenshots.

**Interfaces:**
- Produces: reviewed commit on `development` and updated GitHub Pages deployment.

- [ ] **Step 1: Run closure gates**

```bash
npx --yes pnpm@10.18.1 test
npx --yes pnpm@10.18.1 typecheck
npx --yes pnpm@10.18.1 build
npx --yes pnpm@10.18.1 browser:proof
npx --yes pnpm@10.18.1 showcase:proof
npx --yes pnpm@10.18.1 pages:policy
```

- [ ] **Step 2: Inspect exact staged scope and secret exclusions**

Require `.env.local` and mutable proof files to remain ignored.

- [ ] **Step 3: Commit and push**

```bash
git commit -m "feat: refine SettleShield product design"
git push origin development
```

- [ ] **Step 4: Verify hosted Pages**

Require hosted workflow success, HTTP 200, expected headings, proof status `Resolved`, zero overflow, and no browser errors.
