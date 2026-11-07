# Database Design

**Engine:** PostgreSQL 16+ · **ORM:** Prisma · **Extensions:** `pg_trgm`, `pgvector`, `uuid-ossp`, `citext`

Conventions: UUID v7 primary keys (time-sortable), `created_at`/`updated_at` on all tables, `deleted_at` (soft delete) on user-facing tables, snake_case, money as `numeric(12,2)` + currency code (never float).

---

## 1. Entity map

```
users ─┬─ profiles ─┬─ resumes ── resume_versions
       │            ├─ profile_skills ── skills
       │            ├─ preferences
       │            └─ career_twins
       ├─ subscriptions ── invoices ── payments
       ├─ applications ─┬─ interviews
       │                └─ outcomes
       ├─ saved_opportunities
       ├─ matches ── opportunities ─┬─ opportunity_sources
       │                            ├─ opportunity_skills ── skills
       │                            └─ employers
       ├─ career_scores
       ├─ recommendations
       ├─ referral_clicks ── referral_links ── referral_programs ── referral_earnings
       ├─ notifications / messages
       ├─ activity_logs
       └─ analytics_events

employers ── recruiters
providers ─┬─ courses
           ├─ certifications
           └─ bookings

salary_records · skill_market_stats · market_trends (analytics/derived)
```

---

## 2. Identity & profile

```prisma
model User {
  id                String    @id @default(uuid())
  email             String    @unique @db.Citext
  emailVerifiedAt   DateTime?
  passwordHash      String?              // null if OAuth/magic-link only
  authProvider      String    @default("magic_link") // magic_link|google|apple
  name              String?
  locale            String    @default("en")
  countryCode       String?   @db.Char(2)
  timezone          String    @default("Europe/Berlin")
  role              String    @default("user")       // user|admin|support
  status            String    @default("active")     // active|suspended|deleting|deleted
  marketingConsent  Boolean   @default(false)
  aiProcessingConsent Boolean @default(false)
  onboardingStep    Int       @default(0)
  lastActiveAt      DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?
  hardDeleteAfter   DateTime?                        // GDPR: now()+30d

  profile           Profile?
  resumes           Resume[]
  applications      Application[]
  saved             SavedOpportunity[]
  matches           Match[]
  scores            CareerScore[]
  twin              CareerTwin?
  subscription      Subscription?
  referrals         ReferralLink[]
  clicks            ReferralClick[]
  notifications     Notification[]
  logs              ActivityLog[]

  @@index([status, lastActiveAt])
  @@index([countryCode])
}

model Profile {
  id                String   @id @default(uuid())
  userId            String   @unique
  headline          String?
  summary           String?  @db.Text
  yearsExperience   Int?
  seniority         String?                    // junior|mid|senior|staff|lead|principal
  currentRole       String?
  currentCompany    String?
  currentSalary     Numeric? @db.Decimal(12,2)
  salaryCurrency    String?  @db.Char(3)
  desiredSalaryMin  Numeric? @db.Decimal(12,2)
  desiredCurrency   String?  @db.Char(3)
  remotePreference  String?                    // remote|hybrid|onsite|any
  willingToRelocate Boolean  @default(false)
  targetCountries   String[]                   // ISO-2
  targetRoles       String[]
  workAuthorization Json?                      // {country: status}
  visaSponsorshipNeeded Boolean @default(false)
  riskTolerance     String?                    // conservative|balanced|aggressive
  goals             Json?                      // free-form structured goals
  timeToNextMove    String?                    // asap|3m|6m|12m|exploring
  completeness      Int      @default(0)       // 0-100
  embedding         Unsupported("vector(1536)")?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user              User @relation(fields: [userId], references: [id], onDelete: Cascade)
  skills            ProfileSkill[]
  preferences       Preference?
  @@index([seniority])
}
```

**`Preference`** — hard/soft filters (min comp, max commute, company size, funding stage, excluded companies, excluded industries, deal-breakers). Stored separately so filters can be tuned without touching the profile.

---

## 3. Resumes

```prisma
model Resume {
  id            String   @id @default(uuid())
  userId        String
  label         String?                       // "AI/ML version", "contract version"
  fileUrl       String                        // private bucket key
  fileName      String
  mimeType      String
  sizeBytes     Int
  checksum      String                        // dedupe re-uploads
  parseStatus   String   @default("pending")  // pending|processing|parsed|failed
  parseError    String?
  isPrimary     Boolean  @default(false)
  createdAt     DateTime @default(now())
  deletedAt     DateTime?

  user          User @relation(fields: [userId], references: [id], onDelete: Cascade)
  versions      ResumeVersion[]

  @@index([userId, isPrimary])
}

model ResumeVersion {
  id            String   @id @default(uuid())
  resumeId      String
  versionNo     Int
  parsedJson    Json                          // structured extraction
  rawText       String   @db.Text
  embedding     Unsupported("vector(1536)")?
  optimisedFor  String?                       // opportunityId or role
  atsScore      Int?                          // 0-100
  createdBy     String   @default("user")     // user|optimiser
  createdAt     DateTime @default(now())

  resume        Resume @relation(fields: [resumeId], references: [id], onDelete: Cascade)
  @@unique([resumeId, versionNo])
}
```

**`parsedJson` contract** (validated with Zod, versioned with `schemaVersion`):
`{ schemaVersion, basics, summary, experience[{company,title,start,end,location,highlights[],skills[]}], education[], projects[], certifications[], languages[], totalYears, seniorityEstimate, inferredSkills[{name, confidence, evidence}] }`

---

## 4. Skills (controlled vocabulary — the foundation of the graph)

```prisma
model Skill {
  id            String   @id @default(uuid())
  canonicalName String   @unique @db.Citext
  slug          String   @unique
  category      String                        // language|framework|tool|domain|soft|certification
  parentId      String?                       // hierarchy: LLMOps → MLOps → ML
  description   String?
  isEmerging    Boolean  @default(false)
  decayRate     Numeric?  @db.Decimal(4,3)    // estimated relevance half-life (years)
  embedding     Unsupported("vector(1536)")?
  createdAt     DateTime @default(now())

  aliases       SkillAlias[]
  children      Skill[] @relation("SkillTree")
  parent        Skill?  @relation("SkillTree", fields: [parentId], references: [id])
  profileSkills ProfileSkill[]
  oppSkills     OpportunitySkill[]
  marketStats   SkillMarketStat[]

  @@index([category])
}

model SkillAlias {
  id       String @id @default(uuid())
  skillId  String
  alias    String @unique @db.Citext      // "react.js", "ReactJS", "React"
  skill    Skill  @relation(fields: [skillId], references: [id], onDelete: Cascade)
}

model ProfileSkill {
  id         String   @id @default(uuid())
  profileId  String
  skillId    String
  proficiency String  @default("working")   // learning|working|advanced|expert
  years      Numeric? @db.Decimal(4,1)
  source     String   @default("cv")        // cv|manual|inferred|assessment
  confidence Numeric  @default(1.0) @db.Decimal(3,2)
  verified   Boolean  @default(false)
  lastUsed   DateTime?
  profile    Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  skill      Skill    @relation(fields: [skillId], references: [id])

  @@unique([profileId, skillId])
  @@index([skillId])
}
```

---

## 5. Opportunity universe

```prisma
model Opportunity {
  id              String   @id @default(uuid())
  canonicalId     String?  @unique          // set on merge → survivor id
  type            String                     // job|contract|gig|fellowship|grant|scholarship|
                                             // accelerator|research|phd|hackathon|mentorship|
                                             // speaking|training|relocation|cofounder
  title           String
  slug            String?
  description     String?  @db.Text
  descriptionHash String
  employerId      String?
  roleFamily      String?                    // taxonomy: data_science|engineering|design|...
  seniority       String?
  employmentType  String?                    // full_time|part_time|contract|internship
  remoteType      String?                    // remote|hybrid|onsite
  city            String?
  region          String?
  countryCode     String?  @db.Char(2)
  timezoneOverlap String?
  compMin         Numeric? @db.Decimal(12,2)
  compMax         Numeric? @db.Decimal(12,2)
  compCurrency    String?  @db.Char(3)
  compPeriod      String?                    // hour|day|month|year
  compIsEstimate  Boolean  @default(false)
  visaSponsorship String   @default("unknown") // yes|likely|no|unknown
  requiresDegree  Boolean?
  experienceMin   Int?
  experienceMax   Int?
  skills          String[]                   // denormalised canonical names for fast filter
  applyUrl        String
  sourceQuality   Numeric  @default(0.5) @db.Decimal(3,2)
  status          String   @default("open")  // open|closed|filled|stale
  firstSeenAt     DateTime @default(now())
  lastSeenAt      DateTime @default(now())
  postedAt        DateTime?
  closesAt        DateTime?
  dedupeGroup     String?                    // blocking key
  embedding       Unsupported("vector(1536)")?
  searchVector    Unsupported("tsvector")?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  employer        Employer? @relation(fields: [employerId], references: [id])
  sources         OpportunitySource[]
  oppSkills       OpportunitySkill[]
  matches         Match[]
  savedBy         SavedOpportunity[]
  applications    Application[]

  @@index([type, status, countryCode])
  @@index([roleFamily, seniority])
  @@index([postedAt])
  @@index([dedupeGroup])
  @@index([skills], type: Gin)
}

model OpportunitySource {
  id            String   @id @default(uuid())
  opportunityId String
  sourceKey     String                       // mercor|micro1|turing|adzuna|remoteok|...
  externalId    String
  sourceUrl     String
  rawPayload    Json?
  isActive      Boolean  @default(true)
  firstSeenAt   DateTime @default(now())
  lastSeenAt    DateTime @default(now())
  opportunity   Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)

  @@unique([sourceKey, externalId])
  @@index([opportunityId])
}

model OpportunitySkill {
  opportunityId String
  skillId       String
  importance    Numeric @default(0.5) @db.Decimal(3,2) // 0-1
  isRequired    Boolean @default(false)
  opportunity   Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  skill         Skill @relation(fields: [skillId], references: [id])

  @@id([opportunityId, skillId])
  @@index([skillId])
}

model OpportunityEvent {          // append-only lifecycle log
  id            String   @id @default(uuid())
  opportunityId String
  eventType     String              // created|updated|source_lost|closed|reopened|reported
  payload       Json?
  createdAt     DateTime @default(now())
  @@index([opportunityId, createdAt])
}

model Employer {
  id           String  @id @default(uuid())
  name         String
  slug         String  @unique
  domain       String?
  logoUrl      String?
  industry     String?
  sizeBand     String?
  fundingStage String?
  countryCode  String? @db.Char(2)
  glassdoorRating Numeric? @db.Decimal(2,1)
  sponsorshipFriendly Boolean?               // learned from history
  healthScore  Numeric? @db.Decimal(4,2)     // hiring trend, layoffs, funding
  createdAt    DateTime @default(now())
  opportunities Opportunity[]
  recruiters   Recruiter[]
  @@index([name])
}

model Recruiter {
  id         String  @id @default(uuid())
  employerId String?
  name       String?
  email      String? @db.Citext
  linkedinUrl String?
  region     String?
  specialty  String?
  employer   Employer? @relation(fields: [employerId], references: [id])
  @@index([employerId])
}
```

---

## 6. Matching & intelligence

```prisma
model Match {
  id             String   @id @default(uuid())
  userId         String
  opportunityId  String
  matchScore     Numeric  @db.Decimal(5,2)     // 0-100
  skillFit       Numeric  @db.Decimal(5,2)
  experienceFit  Numeric  @db.Decimal(5,2)
  incomePotential Numeric @db.Decimal(5,2)
  interviewProbability Numeric @db.Decimal(5,2)
  offerProbability     Numeric @db.Decimal(5,2)
  riskScore      Numeric  @db.Decimal(5,2)
  missingSkills  String[]
  reasons        Json?                          // SHAP top features + LLM explanation
  modelVersion   String
  computedAt     DateTime @default(now())

  user           User @relation(fields: [userId], references: [id], onDelete: Cascade)
  opportunity    Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)

  @@unique([userId, opportunityId])
  @@index([userId, matchScore(sort: Desc)])
  @@index([opportunityId])
}

model CareerScore {
  id                String   @id @default(uuid())
  userId            String
  employability     Int
  interviewReadiness Int
  marketDemand      Int
  salaryPotential   Int
  futureGrowth      Int
  careerMomentum    Int
  overall           Int
  benchmarkPercentile Int?
  breakdown         Json?                        // per-score explanation + drivers
  computedAt        DateTime @default(now())
  user              User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, computedAt(sort: Desc)])
}

model CareerTwin {
  id              String   @id @default(uuid())
  userId          String   @unique
  version         Int      @default(1)
  state           Json                          // structured twin: goals, constraints, trajectory, preferences learned
  embedding       Unsupported("vector(1536)")?
  learningSignals Json?                         // what we've inferred from behaviour
  lastTrainedAt   DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  user            User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Recommendation {
  id         String   @id @default(uuid())
  userId     String
  kind       String                         // skill|learning|opportunity|strategy|profile
  title      String
  body       String   @db.Text
  rationale  String?
  confidence Numeric  @db.Decimal(3,2)
  actionUrl  String?
  status     String   @default("new")       // new|seen|acted|dismissed
  expiresAt  DateTime?
  createdAt  DateTime @default(now())
  @@index([userId, status, createdAt(sort: Desc)])
}

model SalaryRecord {                        // aggregated + user-contributed
  id            String  @id @default(uuid())
  roleFamily    String
  seniority     String?
  countryCode   String? @db.Char(2)
  city          String?
  remote        Boolean?
  channel       String?                       // fulltime|contract|freelance|marketplace:<name>
  skills        String[]
  amount        Numeric @db.Decimal(12,2)
  currency      String  @db.Char(3)
  period        String                        // hour|month|year
  source        String                        // posting|user_reported|partner
  sourceRef     String?
  sampleSize    Int     @default(1)
  verified      Boolean @default(false)
  observedAt    DateTime @default(now())
  @@index([roleFamily, countryCode, period])
  @@index([skills], type: Gin)
}

model SkillMarketStat {                     // derived, rebuilt nightly
  id            String  @id @default(uuid())
  skillId       String
  countryCode   String? @db.Char(2)
  periodStart   DateTime
  demandIndex   Numeric @db.Decimal(6,2)      // relative to 100 baseline
  postingCount  Int
  salaryPremium Numeric? @db.Decimal(6,2)     // % above baseline
  growthRate    Numeric? @db.Decimal(6,2)     // 90-day
  rank          Int?
  skill         Skill @relation(fields: [skillId], references: [id], onDelete: Cascade)
  @@unique([skillId, countryCode, periodStart])
}
```

---

## 7. Action & outcome (the moat)

```prisma
model Application {
  id            String   @id @default(uuid())
  userId        String
  opportunityId String
  resumeVersionId String?
  status        String   @default("saved")
                // saved|applied|screening|interviewing|offer|accepted|rejected|withdrawn|ghosted
  appliedAt     DateTime?
  source        String?                       // how they applied
  notes         String?  @db.Text
  nextActionAt  DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user          User @relation(fields: [userId], references: [id], onDelete: Cascade)
  opportunity   Opportunity @relation(fields: [opportunityId], references: [id])
  interviews    Interview[]
  outcomes      Outcome[]

  @@unique([userId, opportunityId])
  @@index([userId, status])
}

model Interview {
  id            String   @id @default(uuid())
  applicationId String
  stage         String                        // screen|technical|system_design|behavioural|final
  scheduledAt   DateTime?
  outcome       String?                       // passed|failed|pending|no_show
  feedback      String?  @db.Text
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  @@index([applicationId])
}

model Outcome {                              // APPEND-ONLY. The moat.
  id             String   @id @default(uuid())
  userId         String
  applicationId  String?
  opportunityId  String?
  outcomeType    String   @db.Check(["interview","offer","hire","rejection","no_response",
                                     "rate_increase","fellowship","grant","visa_approved",
                                     "relocation_completed","other"])
  occurredAt     DateTime
  offerAmount    Numeric? @db.Decimal(12,2)
  offerCurrency  String?  @db.Char(3)
  offerPeriod    String?
  salaryDeltaPct Numeric? @db.Decimal(5,2)
  satisfactionScore Int?                       // 1-5
  verified       Boolean  @default(false)
  verificationMethod String?                   // offer_letter|email|partner|self_report
  consentToAggregate Boolean @default(false)
  notes          String?  @db.Text
  createdAt      DateTime @default(now())
  application    Application? @relation(fields: [applicationId], references: [id])
  @@index([userId, occurredAt])
  @@index([outcomeType, occurredAt])
}

model SavedOpportunity {
  id            String @id @default(uuid())
  userId        String
  opportunityId String
  savedAt       DateTime @default(now())
  user          User @relation(fields: [userId], references: [id], onDelete: Cascade)
  opportunity   Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  @@unique([userId, opportunityId])
}
```

**Why `Outcome` is append-only:** it's the training data for every calibrated model and the asset any acquirer wants. It must be auditable, never mutated, and always attributable to a consent flag.

---

## 8. Commerce & referral

```prisma
model Subscription {
  id               String   @id @default(uuid())
  userId           String   @unique
  plan             String                       // free|pro_monthly|pro_annual|pro_plus|cohort
  status           String                       // trialing|active|past_due|canceled|expired
  provider         String   @default("stripe")
  providerCustomerId String?
  providerSubId    String?
  currentPeriodStart DateTime?
  currentPeriodEnd   DateTime?
  cancelAtPeriodEnd Boolean @default(false)
  trialEndsAt      DateTime?
  canceledAt       DateTime?
  cancelReason     String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  user             User @relation(fields: [userId], references: [id], onDelete: Cascade)
  invoices         Invoice[]
  @@index([status, currentPeriodEnd])
}

model Invoice {
  id             String   @id @default(uuid())
  subscriptionId String
  number         String   @unique
  amount         Numeric  @db.Decimal(12,2)
  taxAmount      Numeric  @db.Decimal(12,2)
  currency       String   @db.Char(3)
  status         String                        // draft|open|paid|void|uncollectible
  issuedAt       DateTime
  paidAt         DateTime?
  pdfUrl         String?
  subscription   Subscription @relation(fields: [subscriptionId], references: [id])
  payments       Payment[]
  @@index([status, issuedAt])
}

model Payment {
  id            String   @id @default(uuid())
  invoiceId     String
  provider      String
  providerRef   String   @unique
  amount        Numeric  @db.Decimal(12,2)
  currency      String   @db.Char(3)
  status        String                        // succeeded|failed|refunded
  method        String?
  processedAt   DateTime @default(now())
  invoice       Invoice @relation(fields: [invoiceId], references: [id])
}

model ReferralProgram {
  id              String   @id @default(uuid())
  name            String
  partnerKey      String   @unique
  category        String                        // marketplace|training|immigration|coaching|jobboard
  payoutModel     String                        // cpa|revshare|hybrid
  payoutAmount    Numeric? @db.Decimal(12,2)
  payoutCurrency  String?  @db.Char(3)
  revSharePct     Numeric? @db.Decimal(5,2)
  attributionWindowDays Int @default(30)
  postbackUrl     String?
  isActive        Boolean  @default(true)
  terms           Json?
  createdAt       DateTime @default(now())
  links           ReferralLink[]
}

model ReferralLink {
  id            String   @id @default(uuid())
  programId     String
  userId        String?                         // null for platform-level links
  code          String   @unique
  targetUrl     String
  surface       String?                         // feed|detail|email|seo_page
  createdAt     DateTime @default(now())
  program       ReferralProgram @relation(fields: [programId], references: [id])
  user          User? @relation(fields: [userId], references: [id])
  clicks        ReferralClick[]
  @@index([programId, createdAt])
}

model ReferralClick {
  id          String   @id @default(uuid())
  linkId      String
  userId      String?
  ipHash      String?
  userAgent   String?
  countryCode String?  @db.Char(2)
  subId       String   @unique
  clickedAt   DateTime @default(now())
  link        ReferralLink @relation(fields: [linkId], references: [id])
  user        User? @relation(fields: [userId], references: [id])
  @@index([linkId, clickedAt])
}

model ReferralEarning {
  id             String   @id @default(uuid())
  programId      String
  clickId        String?
  externalId     String?                        // partner's conversion id
  state          String                         // clicked|registered|qualified|converted|approved|paid|rejected
  amount         Numeric  @db.Decimal(12,2)
  currency       String   @db.Char(3)
  earnedAt       DateTime?
  paidAt         DateTime?
  createdAt      DateTime @default(now())
  @@unique([programId, externalId])
  @@index([state, earnedAt])
}
```

---

## 9. Content marketplace

```prisma
model Provider {
  id          String   @id @default(uuid())
  type        String                          // coach|cv_expert|recruiter|interviewer|
                                              // immigration|relocation|trainer
  name        String
  bio         String?  @db.Text
  avatarUrl   String?
  countryCode String?  @db.Char(2)
  languages   String[]
  hourlyRate  Numeric? @db.Decimal(10,2)
  currency    String?  @db.Char(3)
  rating      Numeric? @db.Decimal(2,1)
  reviewCount Int      @default(0)
  status      String   @default("pending")     // pending|active|suspended
  commissionPct Numeric @default(20) @db.Decimal(5,2)
  createdAt   DateTime @default(now())
  courses     Course[]
  certifications Certification[]
  bookings    Booking[]
}

model Course {
  id          String   @id @default(uuid())
  providerId  String?
  partnerKey  String                          // coursera|udemy|datacamp|aws|google
  title       String
  url         String
  skillIds    String[]
  level       String?
  durationHours Numeric? @db.Decimal(6,1)
  price       Numeric? @db.Decimal(10,2)
  currency    String?  @db.Char(3)
  rating      Numeric? @db.Decimal(2,1)
  isAffiliate Boolean  @default(true)
  provider    Provider? @relation(fields: [providerId], references: [id])
  @@index([skillIds], type: Gin)
}

model Certification {
  id          String   @id @default(uuid())
  providerId  String?
  name        String
  issuer      String
  url         String?
  skillIds    String[]
  price       Numeric? @db.Decimal(10,2)
  currency    String?  @db.Char(3)
  avgPrepWeeks Int?
  provider    Provider? @relation(fields: [providerId], references: [id])
}

model Booking {
  id          String   @id @default(uuid())
  providerId  String
  userId      String
  serviceType String
  scheduledAt DateTime
  durationMin Int
  amount      Numeric  @db.Decimal(10,2)
  currency    String   @db.Char(3)
  commission  Numeric  @db.Decimal(10,2)
  status      String   @default("pending")     // pending|confirmed|completed|cancelled|refunded
  provider    Provider @relation(fields: [providerId], references: [id])
  @@index([userId, scheduledAt])
}
```

---

## 10. Communication & audit

```prisma
model Notification {
  id        String   @id @default(uuid())
  userId    String
  type      String                         // daily_feed|match|outcome_reminder|billing|system
  channel   String   @default("in_app")    // in_app|email|push
  title     String
  body      String?  @db.Text
  actionUrl String?
  readAt    DateTime?
  sentAt    DateTime?
  createdAt DateTime @default(now())
  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, readAt, createdAt(sort: Desc)])
}

model Message {                            // copilot conversation history
  id        String   @id @default(uuid())
  userId    String
  threadId  String
  role      String                         // user|assistant|system
  content   String   @db.Text
  tokens    Int?
  model     String?
  createdAt DateTime @default(now())
  @@index([userId, threadId, createdAt])
}

model ActivityLog {                        // security + audit (not analytics)
  id         String   @id @default(uuid())
  userId     String?
  action     String                        // login|export|delete|billing_change|admin_view
  entityType String?
  entityId   String?
  ipHash     String?
  metadata   Json?
  createdAt  DateTime @default(now())
  user       User? @relation(fields: [userId], references: [id])
  @@index([userId, createdAt(sort: Desc)])
}

model AnalyticsEvent {                     // partitioned by month
  id         String   @id @default(uuid())
  userId     String?
  anonymousId String?
  event      String
  properties Json?
  sessionId  String?
  platform   String?
  createdAt  DateTime @default(now())
  @@index([event, createdAt])
  @@index([userId, createdAt])
}
```

---

## 11. Indexing & performance notes

| Concern | Decision |
|---|---|
| Feed query latency | Composite index `matches(user_id, match_score DESC)` + materialised `daily_feeds` table (precomputed top-100 per active user) |
| Vector search | `pgvector` HNSW index on `opportunities.embedding` and `profiles.embedding`; `m=16, ef_construction=64` |
| Text search | `tsvector` generated column + GIN index; `pg_trgm` GIN on `title` for fuzzy |
| Skill filtering | `skills text[]` + GIN — enables `skills && ARRAY[...]` in <10ms at 1M rows |
| Hot partitions | `analytics_events`, `matches`, `opportunity_events` partitioned by month |
| Soft-delete | Partial indexes `WHERE deleted_at IS NULL` on user-facing tables |
| N+1 | Prisma `include` discipline; a repository layer with explicit selects |

---

## 12. Data integrity rules

1. **No orphan money.** Every `payment` has an `invoice`; every `invoice` a `subscription`.
2. **`outcomes` is append-only.** Corrections are new rows with `supersedes_id`.
3. **Soft delete everywhere user-facing**, hard delete only by the GDPR job.
4. **`matches` are derived** — safe to delete and recompute; never a source of truth.
5. **`referral_earnings` are immutable** after `approved`; corrections via a compensating row.
6. **All timestamps UTC** in the DB; localisation at the presentation layer.

---

## 13. The 6 tables that matter most

If the schema had to be cut to six tables, these are the company:

1. `users` / `profiles` — who the person is
2. `opportunities` (+`opportunity_sources`) — what exists in the world
3. `matches` — what fits
4. `applications` — what they're doing about it
5. **`outcomes`** — what actually happened ← the moat
6. `subscriptions` — what pays for it

Everything else is supporting infrastructure. **Prioritise correctness on table 5 above all others.**
