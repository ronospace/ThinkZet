# ThinkZet – Engineering Rules

These rules apply to every change, by every contributor, human or agent. They exist so the repo stays clean, the product stays honest, and nothing is left half done.

## 1. Task discipline

1. Every piece of work has an ID in `docs/planning/TASKS.md` before it starts. IDs are never reused.
2. Each task has one category, one status and one owner (`Us` = engineering, `You` = needs the founder).
3. Statuses: `OPEN` → `IN PROGRESS` → `DONE` or `BLOCKED`. A blocked task names exactly what unblocks it.
4. A task is not `DONE` until it has been verified (see section 4) and pushed.
5. Nothing is dropped silently. If scope changes, the task is edited and the reason is written next to it.
6. The register is updated in the same commit as the work it describes.

## 2. Git discipline

1. Work happens on `master`. No feature branches, no stashes left behind, no second clone.
2. One task, one commit. A commit is made only after the task is verified clean (section 4) and the files for that task are staged by name, never with a blanket add that sweeps in unrelated edits.
3. Before staging: `git status` shows only files belonging to the task. Anything else is either finished and committed on its own, or left alone.
4. The commit message starts with the task ID, then says what changed and why. Example: `AUTH-06: use the provider's first name for the greeting`.
5. After every set of related tasks, an annotated tag marks a restore point (`restore-YYYYMMDD-N`) with a one-line note of what is safe about it. To go back: `git checkout <tag> -- <path>` for a file, or `git revert <commit>` for a change. History is never rewritten once pushed.
6. No duplicate work: before starting, search the register and the code for the same task. If it exists, extend it.
7. If a verification fails, the change stays unstaged until it passes. A failing change is never committed to be fixed later.
8. The register (`docs/planning/TASKS.md`) is updated in the same commit as the work.

## 2b. Repository hygiene

1. `master` is always deployable. Railway builds from it on every push.
2. One logical change per commit. The message says what changed and why, in the imperative.
3. No secrets in git, ever: keys, tokens, webhook secrets, `.env` files, database files. `app/.env` and `data/` stay in `.gitignore`.
4. Never paste a secret into chat, a commit message, a log line or a screenshot. If one leaks, it is rotated the same day (task `SEC-*`).
5. No generated clutter, scratch files, backups or duplicate docs in the tree. Strategy lives in `docs/strategy/`, operations in `docs/planning/`, deployment in `deploy/`.
6. `git status` is clean at the end of every working session.

## 3. Code standards

1. Zero runtime dependencies. Node built-ins only (`node:sqlite`, `node:http`, `node:crypto`). A new dependency needs a written reason in the PR.
2. No hardcoded colours in the UI. Use the semantic tokens (`--panel`, `--ink`, `--accent`, `--good`, `--warn`, `--bad`, `--track`) so both themes work.
3. Copy: no em dashes. Use a spaced en dash ` – ` or a hyphen. Headlines are short; a block of text is a paragraph of at most two lines before it gets structure (label, value, chip, row).
4. The product name is **ThinkZet**. The company name appears only in the legal footer.
5. Every user-visible number states where it came from. Never present an estimate as a fact.
6. Referral and partner logic is isolated from ranking and scoring. Money must never change what a user sees first.
7. Failures are handled, not hidden: a failed email, webhook or ingest is logged with a reason and surfaced in the Engine screen.

## 4. Verification before DONE

A change is verified only when all of these hold:

1. `node scripts/check.cjs` passes (API contract).
2. `node scripts/browser-check.cjs` passes (route and width matrix, zero console errors).
3. Any UI change has been rendered at 360, 393 and 1280 px in both themes and looked at, not assumed.
4. Anything that touches production (billing, auth, email, DNS) is tested against the live URL, not only locally.
5. The browser measurement, not the code, decides whether something overflows or is cut off.

## 5. Security and trust

1. Sign-in codes are never returned by the API once a mail provider is live.
2. OAuth requires a verified email, a one-time `state` and a `nonce`.
3. Stripe webhooks are accepted only with a valid signature and are idempotent.
4. Rate limits sit on every public write endpoint.
5. User data export and deletion must keep working (GDPR).

## 6. Deployment

1. Production runs on Railway today (`thinkzet.com`), with a volume mounted at `/app/data`.
2. The container starts as root, fixes volume ownership, then drops to the `node` user (`deploy/entrypoint.sh`).
3. `railway.json` must not set `startCommand`; it would bypass the entrypoint.
4. Environment variables are documented in `env.example`. Production values live only in Railway.
5. Long-term target is Hetzner (EU data residency); `deploy/provision.sh` is kept working.

## 7. Working with the founder

1. One clear next step at a time when the founder is in a dashboard. Exact field values, exact button names.
2. Say what was verified and what was not. Never claim a result that was not measured.
3. Never leave an item open without a number, an owner and a next action.
