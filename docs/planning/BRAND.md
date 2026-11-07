# Brand architecture

## The structure

```
ZYRAFLOW GmbH
the technology company
│
├── Flow Ai
│   Women's life, wellness and intelligence OS
│   Flutter · iOS, Android, macOS, Web · live on both stores
│
└── MirrorSpread
    Career intelligence
    An independent AI-powered career platform
```

**The rule: the company name appears only in the legal footer.**

MirrorSpread stands alone as a brand. ZyraFlow GmbH appears exactly once per surface —
at the very bottom, as the copyright and legal entity:

> © 2026 ZyraFlow GmbH. All rights reserved. MirrorSpread is a product of ZyraFlow GmbH.

Never in the header. Never "by ZyraFlow" next to the logo. Never "a ZyraFlow product" in the
product chrome. A customer is buying MirrorSpread, not a division of a holding company.

---

## Where the name appears, precisely

| Surface | What it says |
|---|---|
| Browser title | MirrorSpread |
| Header / logo | MirrorSpread |
| Sidebar brand | MirrorSpread |
| App manifest | MirrorSpread |
| Email sender | MirrorSpread <brief@…> |
| Email footer | © 2026 ZyraFlow GmbH. All rights reserved. |
| Landing footer | © 2026 ZyraFlow GmbH. All rights reserved. MirrorSpread is a product of ZyraFlow GmbH. |
| Privacy / Terms | ZyraFlow GmbH operates MirrorSpread and is the data controller. + copyright line |
| Anything above the fold | **Never the company name** |

---

## What changed in the codebase

| Item | Value |
|---|---|
| Product brand | **MirrorSpread** |
| Legal entity | **ZyraFlow GmbH** |
| Renamed across | 32 files, including browser storage keys |
| Command | `node scripts/rebrand.cjs "New Name"` |

Not renamed, deliberately: the repo folder, the database file, the session cookie, test
fixture emails, git history. None are user-visible.

---

## What Flow Ai teaches MirrorSpread

Flow Ai is 219,000 lines of Flutter across 339 files, with a structure worth copying rather
than reinventing. Three patterns that transfer directly:

### 1. Thin app, thick intelligence

Flow Ai's rule: *all modules connect only to FlowSense™, never module-to-module.*
MirrorSpread should make the same law explicit:

```
UI → Engine (twin, scoring, rates) → Data
         ↑
    one gateway, no sideways calls
```

Every new feature connects to the engine, not to another feature.

### 2. Safety guardrails stated publicly

Flow Ai says plainly what it does *not* do. That is trust-building, not legal boilerplate.
MirrorSpread's equivalent, which should appear on the site:

- We do **not** promise you a job. We estimate probabilities, and estimates are sometimes wrong.
- We do **not** show a salary number we cannot defend with a sample size and confidence level.
- We do **not** let a paying partner change what we recommend.
- We do **not** sell your data. Ever.

### 3. A shared parent-company posture

Both products should read as siblings: same restraint in language, same refusal to overclaim,
same "built for decades, not sessions" posture. That consistency is what makes a parent
company mean something — even though the customer never sees the parent.

---

## What MirrorSpread can offer back

Flow Ai's roadmap already contains a *"Productivity & Career Layer"* — cycle-aware
productivity. MirrorSpread is the career intelligence that module would otherwise have to
build from scratch.

**A future integration worth prototyping:** a woman planning a career move or a negotiation
can see *when* in her cycle she performs best in interviews and high-stakes conversations.
That is genuinely differentiated, it belongs to ZyraFlow, and neither product could build it
alone.

Not now — after MirrorSpread has 100 paying users. But the architecture makes it possible,
which is the point of having one.

---

## Naming discipline

- Product names are **ownable, short, sayable**: MirrorSpread, Flow Ai.
- Company name is **structural and legal**: ZyraFlow GmbH.
- Never mix them in product chrome. The product is MirrorSpread. The company is ZyraFlow GmbH,
  and it belongs in the footer.
