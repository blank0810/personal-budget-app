# Landing Page Positioning & Information Architecture Brief

**Date:** 2026-05-23
**Author:** Founder
**Status:** Design phase — positioning + IA only, NOT implementation
**Scope:** Full ground-up redesign of `app/(public)/page.tsx`

---

## 0. Locked constraints (carried in from the brief — do not relitigate)

- **Positioning:** AI-native + honest early-access. AI leads the story, but the AI Advisor is a teaser/mock today (`components/modules/dashboard/AiAdvisorTeaser.tsx` confirmed mock). We DO NOT claim live AI capability.
- **Aesthetic:** light gradient AI-startup (Vercel x Raycast x Linear). Note: current page is forced `dark`. The redesign moves to a **light** canvas with soft gradient washes. This is a deliberate break.
- **Audience:** freelancers / solo operators first; corporate later.
- **Truthfulness is non-negotiable.** No fabricated metrics, no fake testimonials, no unshipped features described as live.

### What is actually shipped today (verified against codebase — safe to claim as live)
- Unified transactions: income / expense / transfer / payment
- Accounts + per-account ledger
- Envelope budgets (category x month)
- Savings goals (with linked-account tracking)
- CSV import wizard (column mapping, dup detection, one-click undo)
- Financial reports + PDF export + emailed monthly digest
- Recurring transactions (automation via cron)
- Multi-currency (locked after onboarding)
- **Invoicing — shipped:** business identity + PDF invoices + email send (`server/modules/invoice/*`, `app/(authenticated)/invoices/*`)
- Dashboard with 5-pillar health score + charts

### What is NOT shipped (must be framed as early-access / coming soon)
- **AI Advisor** — conversational agent that analyzes spending, suggests budgets, and (eventually) executes actions. Currently a non-interactive looping mock. This is the flagship vision, NOT a live feature.

---

## 1. Value proposition — hero headline candidates

**Subhead (shared across all options):**
> The money app for freelancers and solo operators. Track income and spending, send invoices, hit your savings goals — and get an AI advisor that actually understands your numbers. Free to start, early access opening now.

> Note: "get an AI advisor" sits next to "early access opening now" — the early-access frame governs the AI clause. See Section 3 for the exact guardrail.

### Option A — AI-forward, vision-led (RECOMMENDED)
> **Your money, finally with a brain.**

Rationale: short, memorable, leans into the AI story without claiming a live feature. "finally with a brain" implies the AI is the differentiator while staying aspirational. Pairs with a "Coming soon" badge on the AI clause in the subhead.

### Option B — Audience-forward, job-led
> **Run your freelance finances on autopilot.**

Rationale: speaks directly to the freelancer/solo persona and the closed loop (work -> invoice -> income -> budget). "autopilot" gestures at automation + future AI. Slightly softer on the AI lead.

### Option C — Category-creation, contrarian
> **Budgeting apps track your past. This one plans your future.**

Rationale: positions against YNAB/Monarch/Copilot as backward-looking; "plans your future" sets up the AI advisor as the payoff. Strongest competitive framing, longest to read.

**Decision:** Ship **Option A** as the H1. Hold **Option C** as the problem-section headline (Section 4) so the contrarian framing still gets used. Option B is the fallback if we later decide to de-risk the AI lead.

---

## 2. Target audience & job-to-be-done

### Primary audience (who the page is written for)
**Freelancers and solo operators** — designers, developers, consultants, writers, coaches, indie makers. They earn variable, project-based income, invoice clients, and have no finance team. Today they juggle a budgeting app + a separate invoicing tool + a spreadsheet.

### Secondary audience (must not feel excluded)
**Personal budgeters** — people who just want to track spending, save, and pay off debt. The page must not read as "business-only." We keep a clear "also great for personal budgeting" thread so we don't alienate the largest install base.

### The job-to-be-done we sell against
> "When I get paid irregularly and run my own work, I want one place where my client billing and my personal money live together — so I always know what I actually earned, what's safe to spend, and what to save — without stitching together three tools."

This is the wedge no competitor owns:
- YNAB / Monarch / Copilot Money: personal finance only, no invoicing.
- Harvest / Toggl: time + invoicing, no personal budget.
- FreshBooks / Wave: business accounting + invoicing, no personal budgeting.
- **Us:** the only tool where client work flows into your personal budget — and (soon) an AI that reasons across both.

---

## 3. The honest AI narrative

The AI Advisor is the flagship story but is not live. We make it the lead by selling the **vision and the waitlist**, not a working product. The discipline: every AI mention is wrapped in a forward-looking, early-access frame.

### What we CAN claim today (true now)
- "An AI financial advisor is in the works / coming soon / opening for early access."
- "We're building toward an AI that reads your transactions, budgets, and invoices and tells you what to do next."
- "Join the early-access list to be first in line and help shape it."
- We can show the **mock/preview** as a labeled preview ("Preview of what's coming," never "here's your advisor working").

### What we CANNOT claim (not true yet)
- "Our AI analyzes your spending." (present tense, implies live)
- "Ask the AI anything about your money." (implies an interactive shipped feature)
- Any AI accuracy stat, "saved users X," or AI-generated insight quote.

### Framing rule (give this to the copy/frontend agents)
- Any sentence describing AI behavior must be in **future tense or gated**: "will," "coming soon," "in early access," "join the waitlist."
- The AI spotlight section carries a persistent **"Early access" / "Coming soon" pill** that is visually obvious, not buried.
- The hero subhead clause about AI is acceptable because it is immediately qualified by "early access opening now."

### Waitlist mechanic — copy

**Pill / eyebrow on the AI section:**
> EARLY ACCESS · AI ADVISOR

**Section microcopy under the CTA:**
> Be first in line. We'll email you when the AI advisor opens — no spam, just one note when it's ready.

**Button label:** `Join the early-access list`
**Confirmation state:** `You're on the list. We'll be in touch, Ehnand-style — short and to the point.`
**Honest counter (optional, only if real):** if we want a number, use a true one or none. Do NOT invent "12,000 on the waitlist." Acceptable if real: "Built in the open by a solo founder." Otherwise omit any count.

**Implementation note for backend agent:** the waitlist needs a real capture (email -> table or existing notification list). If we cannot capture emails honestly at launch, the CTA must route to register instead, and the section copy changes to "Create a free account and you'll be first to know." Never show a waitlist form that silently discards input.

---

## 4. Page information architecture (ordered narrative spine)

Narrative spine: **Hook (AI vision) -> Problem -> Solution (bento) -> AI spotlight (early access) -> How it works -> Proof (real product) -> Trust -> Pricing/free -> FAQ -> Final CTA -> Footer.**

We intentionally lead with the AI hook in the hero, then ground it in real shipped features before returning to the AI spotlight — so the page earns the AI promise with real product before re-pitching the vision.

---

### Section 1 — Navbar
- **Purpose:** orient + give the two CTAs immediately.
- **Contents:** logo (Personal Budget Planner), anchor links (Features, How it works, AI Advisor, Pricing, FAQ), `Log in` (text), `Start free` (primary button).
- **Visual:** light, translucent, blurred-on-scroll bar. Subtle bottom border. Borrow from Linear's minimal pinned navbar.

### Section 2 — Hero
- **Purpose:** state the value prop + AI hook + dual CTA in one screen.
- **Headline:** "Your money, finally with a brain." (Option A)
- **Subhead:** the shared subhead from Section 1 of this brief.
- **Body direction:** one tight subhead, no paragraph. An "Early access" pill near the AI clause.
- **CTAs:** primary `Start free` -> /register; secondary `Join AI early access` -> waitlist anchor.
- **Microcopy:** "Free to start. No credit card. Your data is yours."
- **Visual/proof:** a real product screenshot of the dashboard (light theme) in a clean browser frame with a soft gradient glow behind it. Use the actual dashboard, not a hand-drawn mock. (Screenshots exist in repo root, e.g. dashboard captures — use a real, light-mode capture.)

### Section 3 — Social proof / honest credibility strip
- **Purpose:** build trust WITHOUT fake logos or fake user counts.
- **Headline:** none (it's a strip).
- **Body direction:** honest signal chips. Examples: "Built in the open by a solo founder," "Free forever for personal use," "No ads. No data selling," "Public changelog & feature board." Optionally a "Featured on" row ONLY if real. If we have no third-party logos, use the honest-chips version — do not fabricate press or "as seen on."
- **Visual:** horizontal row of subtle chips/icons, muted. Borrow Mercury's restrained trust strip styling but with honesty-first content instead of bank/VC logos we don't have.

### Section 4 — Problem
- **Purpose:** name the freelancer/solo pain so the reader feels seen.
- **Headline:** "Budgeting apps track your past. This one plans your future." (Option C, repurposed)
- **Body direction:** 2-3 short pain points: variable income makes "what can I spend?" hard; invoicing lives in a separate tool from your budget; you only find out the damage at month-end. Frame as the gap between billing tools and budgeting tools.
- **Visual:** a "before" diagram — three disconnected app tiles (a budgeting app, an invoicing tool, a spreadsheet) with broken arrows between them. Sets up the closed-loop solution.

### Section 5 — Core features bento
- **Purpose:** prove the product is real and broad. This is where shipped features carry the weight.
- **Eyebrow:** FEATURES
- **Headline:** "One app for the whole loop: earn, track, budget, save."
- **Body direction:** bento grid of REAL features only. Each tile = real feature, plain present-tense copy:
  - **Invoicing (hero tile, large):** "Send branded invoices and get paid. When a client pays, the income lands in your budget automatically." (closed-loop differentiator — give this the biggest tile)
  - **Unified transactions:** income, expense, transfer, payment in one ledger.
  - **Envelope budgets:** monthly category budgets, real-time tracking.
  - **Savings goals:** targets + linked-account progress.
  - **Recurring + CSV import:** automate bills; import from your bank with dup detection and undo.
  - **Reports + PDF / monthly email:** summaries to your inbox, export to PDF.
  - **Multi-currency + health score:** small supporting tiles.
- **Visual:** each tile carries a small real UI snippet or icon. Borrow Vercel/Linear bento layout (mixed tile sizes, hairline borders, soft fills). The invoicing tile gets a mini invoice/ledger visual to telegraph the loop.

### Section 6 — AI Advisor spotlight (EARLY ACCESS — the flagship)
- **Purpose:** make AI the emotional peak of the page while staying honest.
- **Eyebrow:** EARLY ACCESS · AI ADVISOR
- **Headline:** "An advisor that actually reads your numbers. Coming soon."
- **Body direction:** describe the vision in future tense: "It'll look at your income, spending, budgets, and invoices and tell you what's safe to spend, what to save, and where you're drifting — in plain language." Then the early-access pitch + waitlist CTA.
- **CTA:** `Join the early-access list` (waitlist mechanic from Section 3 of this brief).
- **Visual:** the existing mock chat as a clearly **labeled preview** ("Preview — in development"), dimmed/elevated in a device frame with the "Coming soon" pill. Borrow Raycast AI section styling (gradient-lit chat card on light bg) — but with explicit preview labeling so it never reads as live.

### Section 7 — How it works
- **Purpose:** show the closed loop concretely; reduce "how is this different" friction.
- **Eyebrow:** HOW IT WORKS
- **Headline:** "From invoice to budget, in one flow."
- **Body direction:** 3-4 numbered steps: (1) Log your work / send an invoice. (2) Client pays — income is recorded. (3) Your budget and goals update automatically. (4) See your full picture on the dashboard. For personal budgeters, note step 1 can simply be "log income and expenses."
- **Visual:** the loop as a connected diagram (the "after" to Section 4's broken "before"). Animated reveal on scroll.

### Section 8 — Dashboard / product preview
- **Purpose:** prove the daily experience is good, not just the feature list.
- **Eyebrow:** THE DAILY VIEW
- **Headline:** "Open the app, know exactly where you stand."
- **Body direction:** one line on the health score + at-a-glance KPIs. Emphasize "the daily experience matters more than the feature list."
- **Visual:** large, real, light-mode dashboard screenshot (use an actual capture — there are dashboard PNGs in the repo). No fabricated numbers; use a realistic seeded demo. If we show pesos, keep it consistent with the "Ehnand, Philippines" persona.

### Section 9 — Security & trust
- **Purpose:** answer the "is my money data safe?" objection honestly.
- **Eyebrow:** PRIVACY & TRUST
- **Headline:** "Your financial data stays yours."
- **Body direction:** only true claims: encrypted in transit, no ads, no selling data, you can export and delete your data, built by a named solo founder (Ehnand) who uses it himself. Avoid unverifiable claims like "bank-level encryption" unless we can substantiate (prefer "encrypted connections / encrypted at rest" if true; otherwise soften).
- **Visual:** trust icons (lock, no-ads, export, open changelog). Borrow Mercury's calm trust section tone.

### Section 10 — Pricing / "free" framing
- **Purpose:** remove cost objection; set expectation honestly for future paid AI.
- **Eyebrow:** PRICING
- **Headline:** "Free to start. Honest about what's next."
- **Body direction:** Core budgeting + invoicing is free to use now. Be honest that the AI advisor may be a paid add-on when it launches (don't promise "free forever AI" we can't sustain). One simple card: "Free — everything you see today." Optional muted second card: "AI Advisor — coming soon, early-access list open." No fake price, no fake tiers.
- **Visual:** one or two clean pricing cards. Borrow Copilot Money's single-clear-plan simplicity over a noisy 3-tier grid.

### Section 11 — FAQ
- **Purpose:** absorb objections + reinforce honesty + help SEO.
- **Headline:** "Questions, answered straight."
- **Body direction:** real Q&As:
  - "Is the AI advisor available now?" -> "Not yet. It's in development — join the early-access list and you'll be first in."
  - "Is it really free?" -> what's free today, what may be paid later.
  - "Do I have to be a freelancer?" -> "No. It's great for personal budgeting too; invoicing is there when you need it."
  - "Can I import my bank transactions?" -> yes, CSV with dup detection + undo.
  - "Can I send real invoices?" -> yes, branded PDF invoices with email send (this IS live).
  - "Who builds this?" -> solo founder (Ehnand), built in the open with a public changelog + feature board.
- **Visual:** accordion. Borrow Linear/Vercel FAQ accordion styling.

### Section 12 — Final CTA
- **Purpose:** last conversion push, dual-path.
- **Headline:** "Start free today. Be first to the AI."
- **Body direction:** one line restating the loop + the early-access hook.
- **CTAs:** primary `Start free`; secondary `Join AI early access`.
- **Visual:** centered, gradient-lit panel. Borrow Vercel's bold closing CTA band.

### Section 13 — Footer
- **Purpose:** nav, legal, credibility.
- **Contents:** product links, changelog, feature requests, privacy/terms, "Built by Ehnand," GitHub/social if real. No fake "company" addresses or fake team pages.

---

## 5. CTA strategy

- **Primary CTA (everywhere):** `Start free` -> `/register`. This is the conversion goal. Reasoning: the real product is shippable value today; we want signups, not just waitlist sentiment.
- **Secondary CTA:** `Join AI early access` -> waitlist anchor/section. Captures intent for the flagship without overpromising.
- **Hero microcopy:** "Free to start. No credit card. Your data is yours."
- **Waitlist CTA label:** `Join the early-access list` (in the AI section); `Join AI early access` (compact, in hero/final CTA).
- **"Free" CTA wording:** prefer `Start free` over "Free forever." Avoid "Free forever" as a blanket promise because future AI may be paid — "Start free" is honest and still low-friction. If we want permanence language, scope it: "Free forever for personal budgeting."
- **Hierarchy rule:** primary CTA is solid/filled; secondary is outline/ghost. Never two equal-weight buttons.

---

## 6. Trust & honesty guardrails

### Claims we are NOT allowed to make
1. AI features described in present tense or as usable now ("our AI analyzes…", "ask the AI…").
2. Any AI performance/accuracy/savings metric.
3. Fabricated user counts ("trusted by 10,000 freelancers," "12k on the waitlist").
4. Fake or composite testimonials with invented names/quotes/avatars (the current `Testimonials.tsx` quotes from "Maria S.", "James R.", "Anna L." are placeholders — do NOT carry them into the redesign as if real).
5. Fake press / "as seen on" / customer logos we don't have.
6. Unverifiable security claims ("bank-level encryption," "SOC 2") unless substantiated.
7. "Free forever" applied to the whole product if AI may be paid.

### Honest alternatives we CAN use
- "Built in the open by a solo founder (Ehnand)." (true, and a differentiator)
- "Early access," "Coming soon," "Join the waitlist" for AI.
- Real product screenshots (light mode) instead of invented dashboards.
- A real public changelog + feature-request board link as social proof of momentum.
- For testimonials: either (a) omit the section entirely until we have real opt-in quotes, or (b) replace it with the "honest credibility strip" (Section 5 of IA). **Decision: omit fake testimonials; ship the honest credibility strip instead.** Add real testimonials later only with consent.
- Substitute true security statements ("encrypted connections, no ads, no data selling, export & delete anytime") for vague badges.

---

## 7. SEO content angle

- **Primary keyword / topic:** "budgeting app for freelancers" (and the cluster: "freelancer finance app," "invoicing + budgeting in one app," "self-employed money tracker"). This is a lower-competition, high-intent niche that matches our wedge — better than fighting "budget app" head-on against YNAB/Monarch.
- **Secondary angle for the AI story:** target "AI budgeting" / "AI financial advisor" as a future/early-access topic — drives the waitlist, and we own honest "coming soon" framing now while building authority for when it ships.

**Suggested `<title>` (honest + click-worthy):**
> Budgeting & Invoicing for Freelancers — Personal Budget Planner

**Suggested meta description:**
> Track income and spending, send branded invoices, and hit your savings goals — all in one free app built for freelancers and solo operators. AI advisor coming soon: join early access.

**Notes for the SEO/frontend agents:**
- Keep the AI claim in meta in future tense ("coming soon," "early access") so the SERP snippet matches the honest on-page framing.
- H1 = Option A hero headline; ensure section H2s use keyword-aligned phrasing ("budgeting for freelancers," "send invoices," "how it works").
- Real OG image (light dashboard) — there's prior work on OG images (`2026-04-26-link-preview-og-image-design.md`); reuse that pipeline.

---

## 8. Structural references (what we borrow from whom)

- **Vercel** — bento feature grid + bold gradient closing CTA band + light-with-glow hero. Borrow: bento layout for Section 5, final CTA for Section 12.
- **Raycast** — AI section as a gradient-lit chat card on a light background. Borrow: the AI Advisor spotlight (Section 6) visual treatment — but add explicit "preview / coming soon" labeling, which Raycast doesn't need (theirs is live).
- **Linear** — restrained pinned navbar, hairline-bordered cards, clean FAQ accordion, tight typographic hierarchy. Borrow: navbar (Section 1), card styling, FAQ (Section 11).
- **Mercury** — calm trust/security section and a restrained credibility strip. Borrow: Sections 3 and 9 tone — substituting honest chips for the bank/VC logos we don't have.
- **Copilot Money** — single clear plan instead of a noisy 3-tier pricing grid. Borrow: pricing simplicity (Section 10).

---

## 9. Open items to resolve before build (hand-offs)

- **Backend:** decide the real waitlist capture (table or notification list). If not ready, route waitlist CTA to /register and adjust copy (Section 3). Never discard form input silently.
- **Frontend:** produce real light-mode screenshots (dashboard, invoice, AI mock-as-preview). The redesign moves off the forced `dark` wrapper in `app/(public)/page.tsx`.
- **Founder (me) sign-off:** confirm Option A as H1 and the "omit fake testimonials" decision before copy is finalized.
