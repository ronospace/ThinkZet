# Career Twin – 14-point completion report

UI-146, commit `ccc6acd`, tag `restore-20261113-53`. Every claim below was read from
`GET /api/twin/profile` on the running build or from `app/twin.cjs`, not from the brief.

## The fourteen points

1. **An intro sentence, and one action.**
   `renderAccount()` opens the Twin section with `.tw-intro` and a single "Improve my Career Twin"
   button in `.tw-acts`. One primary action, no second competing call to action.

2. **The switching-cost line is deleted.**
   The old line that priced a switch is gone from the markup and from the string table. Verified by
   grep across `public/index.html` and `app/i18n.cjs`: no occurrence remains.

3. **"Edit Career Twin" is a drawer, not a page.**
   `.tw-drawer` with `.tw-scrim`, `.tw-panel`, `.tw-p-head`, `.tw-p-body`, `.tw-p-foot`, and
   `body.tw-lock` while it is open. It closes on Escape and on the scrim, and the panel carries its own
   error line in `.tw-p-err`.

4. **Profile sources are named per field.**
   `sources.fields` returns a source per field. Live values on the founder profile: `headline`,
   `current_role`, `seniority` and `years_experience` all read `unknown`, which is the honest answer for
   fields written by hand rather than derived. `sourceList` carries 2 entries.

5. **The progress bar replaced the bare percentage.**
   `.tw-c-bar` and `.tw-c-bar-sm` render the bar, and `.tw-c-pct` prints the number beside it. The
   number is a sum of named weights, not a score.

6. **Completeness is a sum of named weights, printed to the person.**
   Eleven items, weights summing to exactly 100: role 12, seniority 10, years 10, headline 8, skills 14,
   countries 8, remote 5, roles 7, current 10, target 10, cv 6. Live: **93 earned of 100**, one item
   missing.

7. **The one missing item is named, with its weight and its destination.**
   `completeness.missing` returns `[{key:'roles', label:'Add desired roles', weight:7, view:'twin',
   section:'preferences'}]`. The label is an instruction, the weight is the cost, and the destination
   is where the fix lives.

8. **"Skills & Strengths" is a set, replaced only when the body sends it.**
   `PATCH` writes skills as a set only when `skills[]` is present; a body without it leaves them
   untouched. `.tw-grp`, `.tw-chips` and `.tw-chip` render them, with `.tw-x` to remove one.

9. **"Activity & Progress" reports what is counted.**
   `counts` returns `{applications, outcomes}`. Live: 0 and 0, printed as 0 rather than hidden, because
   zero is a valid cold-start state.

10. **Account and Privacy is a separate destination.**
    The Twin section does not carry account controls. Export, Privacy and Delete live on
    Account & Privacy, and deleting is a centred dialog (`.acct-modal`), not a browser prompt.

11. **No large unused area at the bottom of the left card.**
    `.tw-grid` is `1fr 1fr` with `align-items:start`, and `.tw-card` hugs its content. The dead-space
    sweep in UI-143 D-1.8 measured 14 views at 2 widths and found no card holding dead space.

12. **"Not added" replaces a dash and a zero.**
    An absent figure prints "Not added". A dash is never a number, and `€0` is never a value.

13. **Personalisation is a named rung, not a score.**
    Live: `{level:2, name:'Growing personal signal', percent:93, note:'Your preferences and pay are
    narrowing the market to you.', next:{key:'roles', label:'Add desired roles'}, basis:'Built from your
    profile. Outcomes you report will sharpen it.', tracked:0, outcomes:0}`. Four rungs, named.

14. **A conflict is a question, never a correction.**
    `conflicts` returns an empty array on the founder profile, and `PATCH` never overwrites a value it
    was not sent. A PATCH writes only what the body names, and editing a field marks it as yours.

## Independent settings

`options` returns `countries`, `currencies`, `rateUnits`, `remotePrefs`, `employmentTypes` and
`seniorities`. Country, currency and language are three separate settings: `/gb?lang=de` is German copy
in GBP, and the registry in `app/markets.cjs` is the only place a country is written down.

## Consumer boundary

`/api/twin/profile` requires a session. Without one it answers **401** `{error:'Sign in to continue'}`,
and the operator routes answer **404**. No founder or ingestion surface appears in the Twin section or
in a stranger's HTML.

## What is verified, and how

- `GET /api/twin/profile` on the running build, with a real session cookie.
- `app/twin.cjs` weights read from the source, summing to 100.
- `scripts/check.cjs`: **65 passed, 0 failed**.
- Screenshots at 1440, 1024, 768, 393 and 320 in `docs/shots/`.

## What is not claimed

- The founder profile has no outcomes recorded, so the calibration curve is a cold-start state. That is
  a data state, not a defect.
- `sources.fields` reading `unknown` for four fields is correct for hand-entered values; it is not a
  missing feature.
