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
└── Karyvo
    Career intelligence
    An independent AI-powered career platform
    Web · a ZyraFlow product
```

**Why this works:** each product can grow into its own business with its own audience,
pricing and identity, while ZyraFlow owns the ecosystem and can launch a third product
without forcing every brand to share one name.

---

## What changed in the codebase

| Item | Value |
|---|---|
| Product brand | **Karyvo** (was CareerOS — taken) |
| Parent company | **ZyraFlow GmbH** |
| Brand line | *Career Intelligence · a ZyraFlow product* |
| Tagline | *Discover how much opportunity you're leaving on the table* |
| Renamed across | 31 files, including browser storage keys |
| Command | `node scripts/rebrand.cjs "New Name"` |

Not renamed, deliberately: the repo folder, the database file, the session cookie, test
fixture emails, git history. None are user-visible, and changing the cookie would log
everyone out for nothing.

---

## What Flow Ai teaches Karyvo

Flow Ai is 219,000 lines of Flutter across 339 files, with a structure worth copying rather
than reinventing. The three patterns that transfer directly:

### 1. Thin app, thick intelligence

Flow Ai's rule: *all modules connect only to FlowSense™, never module-to-module.*
Karyvo already follows a version of this (nothing reads the referral module; everything reads
the engine), but it is worth making explicit and enforced:

```
UI → Engine (twin, scoring, rates) → Data
         ↑
    one gateway, no sideways calls
```

Every new feature should connect to the engine, not to another feature.

### 2. Safety guardrails stated publicly

Flow Ai says plainly what it does *not* do: no diagnosis, no treatment, no pregnancy
prediction. That is trust-building, not legal boilerplate.

Karyvo's equivalent, and it should appear on the site:

- We do **not** promise you a job. We estimate probabilities, and estimates are sometimes wrong.
- We do **not** show a salary number we cannot defend with a sample size and a confidence level.
- We do **not** let a paying partner change what we recommend.
- We do **not** sell your data. Ever.

### 3. A shared parent-company identity

Both products should read as siblings: same restraint in language, same refusal to overclaim,
same "built for decades, not sessions" posture. That consistency is what makes a parent
company mean something.

---

## What Karyvo can offer back

Flow Ai's roadmap already contains a *"Productivity & Career Layer"* module — cycle-aware
productivity. Karyvo is the career intelligence layer that module would otherwise have to
build from scratch.

**A future integration worth prototyping:** a woman planning a career move or a negotiation
can see *when* in her cycle she performs best in interviews and high-stakes conversations.
That is a genuinely differentiated product, it belongs to ZyraFlow, and neither product
could build it alone.

Not now — after Karyvo has 100 paying users. But the brand architecture makes it possible,
which is the point of having one.

---

## Naming discipline going forward

- Product names are **ownable, short, sayable**: Karyvo, Flow Ai.
- Company name is **structural**: ZyraFlow.
- Never mix them: the product is Karyvo. The company is ZyraFlow GmbH. Karyvo is never
  "ZyraFlow Career" and ZyraFlow is never "the Karyvo company".
