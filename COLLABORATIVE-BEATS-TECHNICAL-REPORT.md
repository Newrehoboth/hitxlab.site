# 🎵 COLLABORATIVE BEATS - TECHNICAL INSPECTION REPORT

**Project:** HITXLAB Beat Marketplace  
**Date:** November 16, 2026  
**Purpose:** Detailed technical analysis for implementing Collaborative Beats feature  
**Status:** ✅ Inspection Complete - No Files Modified

---

## 📋 EXECUTIVE SUMMARY

This report provides a comprehensive analysis of the existing HITXLAB codebase in preparation for implementing **Collaborative Beats** - a feature allowing multiple producers to co-create and co-own beats with automatic revenue splitting.

**Key Findings:**
- ✅ Solid foundation with Supabase backend and React/TanStack frontend
- ✅ Existing payment infrastructure (Paystack) supports split payments via subaccounts
- ✅ Producer authentication, profiles, and beat management already implemented
- ⚠️ Revenue splitting currently single-producer only
- ⚠️ No multi-producer ownership model in database
- ⚠️ License agreements assume single producer

---

## 🏗️ CURRENT ARCHITECTURE

### **Tech Stack**
- **Frontend:** React 19.2.0 + TanStack Router/Start
- **Backend:** Supabase (PostgreSQL 14.5)
- **Payment Gateway:** Paystack (Nigerian payments)
- **Email:** Resend API
- **Storage:** Supabase Storage (audio, covers, stems, WAV files)
- **Auth:** Supabase Auth with role-based access
- **Build:** Vite 8.0.16 + Nitro 3.0 (SSR)
- **Deployment:** Vercel (inferred from docs)

### **Project Structure**
```
src/
├── integrations/
│   └── supabase/           # Database client & types
├── routes/
│   ├── producer/           # Producer dashboard, upload, edit
│   ├── artist/             # Artist dashboard, purchases
│   ├── api/public/payments/# Payment webhooks
│   └── beat.$id.tsx        # Beat detail page
├── lib/
│   ├── beats-api.ts        # Beat CRUD operations
│   ├── commission.ts       # Revenue split calculations (10%)
│   ├── licenses.ts         # License types & contracts
│   ├── purchase-service.ts # Purchase creation & validation
│   ├── payouts.server.ts   # Paystack integration
│   └── store.tsx           # Auth & global state
├── components/
│   ├── ProducerLayout.tsx  # Producer dashboard layout
│   ├── BeatCard.tsx        # Beat display component
│   └── CartDrawer.tsx      # Shopping cart
└── data/
    └── beats.ts            # Beat type definitions
```

---

## 💾 DATABASE SCHEMA ANALYSIS

### **Existing Tables (Relevant to Collaborative Beats)**

#### 1. `beats` (Primary beat storage)
```sql
- id: uuid (PK)
- producer_id: uuid (FK → profiles.id)  ⚠️ SINGLE PRODUCER ONLY
- title: text
- description: text
- genre: text
- bpm: integer
- key: text
- mood: text
- tags: text[]
- cover_url: text (storage path)
- audio_url: text (storage path)
- wav_url: text (storage path)
- stems_url: text (storage path)
- duration: integer (seconds)
- plays: integer
- licenses: jsonb (array of license objects)
- published: boolean
- created_at: timestamp
- updated_at: timestamp
```

**Issues for Collaborative Beats:**
- ❌ `producer_id` is a single UUID, not an array
- ❌ No ownership percentage tracking
- ❌ No collaborator relationship table

#### 2. `producer_profiles` (Producer information)
```sql
- user_id: uuid (PK)
- producer_name: text
- username: text (unique)
- bio: text
- avatar_url: text
- banner_url: text
- brand_color: text
- instagram, spotify, tiktok, youtube, website: text
- city, country: text
- producer_tag: text
- created_at, updated_at: timestamp
```

**Status:** ✅ No changes needed for collaborative beats

#### 3. `purchases` (Beat sales)
```sql
- id: uuid (PK)
- beat_id: uuid (FK → beats.id)
- buyer_id: uuid (FK → profiles.id)
- producer_id: uuid ⚠️ SINGLE PRODUCER
- beat_title: text
- license_name: text
- license_type: text
- gross_amount: numeric
- platform_commission: numeric (10%)
- producer_earnings: numeric (90%)  ⚠️ SINGLE RECIPIENT
- payment_status: text (pending|paid|failed)
- payment_provider: text
- provider_reference: text
- provider_fee: numeric
- payout_mode: text (instant|wallet)
- purchased_at: timestamp
```

**Issues:**
- ❌ `producer_earnings` assumes single recipient
- ❌ No split tracking between multiple producers
- ❌ No individual earnings per collaborator

#### 4. `payout_accounts` (Paystack subaccounts)
```sql
- id: uuid (PK)
- producer_id: uuid (FK → profiles.id)
- bank_name: text
- account_number: text
- account_name: text
- bank_code: text
- paystack_subaccount_code: text ✅ CRITICAL FOR SPLITS
- paystack_subaccount_id: integer
- is_verified: boolean
- created_at, updated_at: timestamp
```

**Status:** ✅ Already supports split payments via Paystack subaccounts

#### 5. `producer_wallets` (Earnings tracking)
```sql
- id: uuid (PK)
- producer_id: uuid (FK → profiles.id)
- available_balance: numeric
- pending_balance: numeric
- lifetime_earnings: numeric
- total_withdrawn: numeric
- sales_count: integer
- currency: text (NGN)
- created_at, updated_at: timestamp
```

**Issues:**
- ⚠️ Individual wallet tracking works
- ⚠️ Need to credit multiple wallets for collaborative beats

#### 6. `notifications` (User notifications)
```sql
- id: uuid (PK)
- user_id: uuid
- title: text
- message: text
- type: text
- link: text
- actor_id: uuid
- is_read: boolean
- created_at: timestamp
```

**Status:** ✅ Can notify all collaborators

---

## 🔑 AUTHENTICATION & AUTHORIZATION

### **Current Implementation**
```typescript
// src/lib/store.tsx
export type Role = "producer" | "artist" | "admin";
export type User = { 
  id: string; 
  name: string; 
  email: string; 
  role: Role 
};

// Auth context provides:
- useAuth() → { user, session, loading, signIn, signUp, signOut }
- Supabase Auth with JWT tokens
- Row Level Security (RLS) policies
```

### **RLS Policies (from migrations)**
- Producers can only edit their own beats
- Artists can view all published beats
- Purchases are user-scoped
- Wallet operations are producer-scoped

**Impact on Collaborative Beats:**
- ✅ Need RLS policies allowing ALL collaborators to edit shared beats
- ✅ Need permission checks for adding/removing collaborators

---

## 💰 PAYMENT FLOW ANALYSIS

### **Current Purchase Flow**

```
1. ARTIST SIDE (CartDrawer.tsx)
   └─> User adds beat + license to cart
   └─> Clicks "Checkout"
   └─> Paystack initialization:
       {
         amount: gross_amount,
         email: buyer_email,
         reference: unique_ref,
         subaccount: producer_subaccount_code,  ✅ ALREADY SPLIT
         transaction_charge: 10% to platform
       }

2. PAYMENT GATEWAY
   └─> Paystack processes payment
   └─> Automatically splits:
       - 10% platform commission → HITXLAB account
       - 90% producer earnings → Producer subaccount
   └─> Sends webhook to /api/public/payments/webhook

3. WEBHOOK HANDLER (webhook.ts)
   └─> Verifies signature
   └─> Updates purchases table: payment_status = 'paid'
   └─> Credits producer_wallet (if payout_mode = 'wallet')
   └─> Unlocks downloads: download_status = 'unlocked'

4. DOWNLOAD (purchase-service.ts)
   └─> Validates ownership
   └─> Generates signed URLs for assets (MP3, WAV, stems)
```

### **Commission Calculation**
```typescript
// src/lib/commission.ts
export const PLATFORM_COMMISSION_RATE = 0.1; // 10%

export function calculateSplit(grossAmount: number) {
  const platformCommission = gross * 0.1;
  const producerEarnings = gross * 0.9;
  return { platformCommission, producerEarnings };
}
```

**Critical Finding:**
- ✅ Paystack subaccounts already support split payments
- ✅ Platform commission is fixed at 10%
- ⚠️ Currently only ONE subaccount per beat (single producer)
- ❌ No mechanism for multiple subaccounts (multiple collaborators)

---

## 🎹 BEAT UPLOAD & MANAGEMENT

### **Upload Flow** (`src/routes/producer/upload.tsx`)

```typescript
// Step 1: Beat Information
- title, description, genre, mood, bpm, key, tags

// Step 2: File Uploads (with size limits)
- Cover image (10MB max) → beat-covers bucket
- MP3 preview (50MB max) → beat-audio bucket
- WAV file (400MB max, optional) → beat-files bucket
- Stems ZIP (1.5GB max, optional) → beat-files bucket

// Step 3: Licensing
- Configure 4 license tiers (Basic, Pro, Premium, Exclusive)
- Set prices per tier
- Define usage rights & limits

// Final: Publish
- Insert into beats table
- Generate signed URLs
- Publish to marketplace
```

**Storage Buckets:**
- `beat-covers/` - Cover art (public read)
- `beat-audio/` - MP3 previews (public read)
- `beat-files/` - WAV + stems (authenticated download)

**Issues for Collaborative Beats:**
- ⚠️ Upload form assumes single producer
- ⚠️ No collaborator invitation during upload
- ⚠️ No ownership percentage input

---

## 📄 LICENSE SYSTEM

### **License Structure** (`src/lib/licenses.ts`)
```typescript
export type License = {
  id: string;
  type: "basic" | "professional" | "premium" | "unlimited" | "exclusive";
  name: string;
  price: number;
  files: string[]; // ["MP3", "WAV", "Stems"]
  streamingLimit: string; // "Up to 500K streams"
  distributionLimit: string; // "Unlimited"
  commercialRights: string;
  exclusive: boolean;
  isNegotiable: boolean;
  contract: string; // Legal agreement text
  version: number;
};

// Default licenses generated with:
defaultLicenses(basePrice: number)
```

**Contract Template Excerpt:**
```
This License Agreement ("Agreement") is entered into as of the purchase date 
between the Artist ("Licensee") and [PRODUCER NAME] ("Producer").

GRANT OF LICENSE: Producer grants Licensee a non-exclusive license to use 
the instrumental musical composition ("Beat")...
```

**Issues for Collaborative Beats:**
- ❌ Contract assumes single "[PRODUCER NAME]"
- ❌ No multi-producer credit clause
- ❌ No ownership percentage disclosure
- ❌ Need: "Producer A (50%), Producer B (30%), Producer C (20%)"

---

## 🔄 PRODUCER DASHBOARD

### **Dashboard Tabs** (`src/routes/producer/dashboard.tsx`)
- Overview (stats, revenue chart)
- My Beats (beat list with edit/delete)
- Sample Packs
- Orders (searchable sales with buyer info)
- Purchases (beats bought by producer)
- Followers
- Notifications
- Analytics (plays, revenue trends)
- Direct Messages
- Negotiations
- Contracts (license agreements)
- Settings

**Key Components:**
```typescript
// Beat Management
<MyBeats beats={beats} onDelete={handleDelete} />
  └─> Edit button → /producer/edit/$id
  └─> Delete button → confirms & deletes

// Orders View
<DetailedOrders orders={orders} />
  └─> Searchable by order ID, buyer email, beat title
  └─> Shows: buyer info, license tier, revenue
  └─> Download signed contract PDF
```

**Issues for Collaborative Beats:**
- ⚠️ "My Beats" shows only producer's own beats
- ❌ No "Collaborative Beats" section
- ❌ No pending collaboration invites
- ❌ No collaborator management UI

---

## 🛒 CHECKOUT & CART SYSTEM

### **Cart Component** (`src/components/CartDrawer.tsx`)
```typescript
export type CartItem = {
  id: string;
  beat: Beat;
  license: License;
  contractVersion: number;
  acceptedAt: string;
};

// Cart state (global)
const { items, addWithLicense, remove, clear, total } = useCart();

// Checkout flow
1. User clicks "Proceed to Checkout"
2. Validates signed-in status
3. Calls Paystack.initialize() with:
   - email: user.email
   - amount: total * 100 (kobo)
   - reference: `hitxlab_${timestamp}`
   - subaccount: producer_subaccount_code  ✅ SPLIT PAYMENT
   - transaction_charge: 10% to platform
4. On success → record purchase → send emails
```

**Critical Code:**
```typescript
// Get producer subaccount for split payment
const { data: subData } = await supabase.rpc(
  'get_subaccount_for_beat',
  { _beat_id: item.beat.id }
);
const subaccountCode = subData?.[0]?.code;

// Paystack config
{
  key: PAYSTACK_PUBLIC_KEY,
  email: user.email,
  amount: total * 100,
  subaccount: subaccountCode,  // Producer receives 90%
  bearer: 'subaccount',
  transaction_charge_type: 'flat_subaccount',
  transaction_charge: platformCommission * 100
}
```

**Issues for Collaborative Beats:**
- ❌ `get_subaccount_for_beat` returns ONE subaccount
- ❌ Paystack split logic assumes single producer
- ⚠️ Need: Multi-subaccount splits OR post-purchase distribution

---

## 📧 EMAIL & NOTIFICATIONS

### **Email Service** (`src/lib/email.ts`)
```typescript
// Uses Resend API
- sendPurchaseConfirmation(buyer, beat, license)
- sendProducerSaleNotification(producer, buyer, beat, license)
- sendAcademyApplicationConfirmation(...)
```

**Purchase Email Flow:**
1. Artist receives: Purchase confirmation with download links
2. Producer receives: Sale notification with buyer info

**Issues for Collaborative Beats:**
- ❌ Only ONE producer is notified
- ❌ Need: Notify ALL collaborators of sale
- ❌ Email should show split amounts: "You earned ₦X (30% of ₦Y)"

---

## 📊 ANALYTICS & STATS

### **Producer Analytics** (`src/components/ProducerAnalytics.tsx`)
- Total plays
- Revenue trends (chart)
- Top performing beats
- Sales by license type
- Follower growth

**Data Sources:**
```typescript
- beats.plays (integer)
- beat_plays_log (daily tracking)
- purchases (revenue)
- producer_wallets (lifetime_earnings)
```

**Issues for Collaborative Beats:**
- ⚠️ Analytics show only individual producer's stats
- ❌ No combined stats for collaborative beats
- ❌ No per-collaborator breakdown

---

## 🎯 WHAT'S NEEDED FOR COLLABORATIVE BEATS

### **1. DATABASE CHANGES** (High Priority)

#### New Table: `beat_collaborators`
```sql
CREATE TABLE beat_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beat_id UUID NOT NULL REFERENCES beats(id) ON DELETE CASCADE,
  producer_id UUID NOT NULL REFERENCES profiles(id),
  ownership_percentage NUMERIC(5,2) NOT NULL CHECK (ownership_percentage > 0 AND ownership_percentage <= 100),
  role TEXT NOT NULL, -- 'owner' | 'collaborator'
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'pending' | 'removed'
  added_by UUID REFERENCES profiles(id),
  added_at TIMESTAMP NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMP,
  removed_at TIMESTAMP,
  UNIQUE(beat_id, producer_id)
);

-- Ensure total ownership = 100%
CREATE OR REPLACE FUNCTION check_total_ownership()
RETURNS TRIGGER AS $$
DECLARE
  total NUMERIC;
BEGIN
  SELECT SUM(ownership_percentage) INTO total
  FROM beat_collaborators
  WHERE beat_id = NEW.beat_id AND status = 'active';
  
  IF total > 100 THEN
    RAISE EXCEPTION 'Total ownership cannot exceed 100%%';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_ownership_total
AFTER INSERT OR UPDATE ON beat_collaborators
FOR EACH ROW EXECUTE FUNCTION check_total_ownership();
```

#### Modify: `purchases` table
```sql
-- Add JSON field for split tracking
ALTER TABLE purchases
ADD COLUMN earnings_split JSONB;

-- Example structure:
{
  "producer_A_id": { "percentage": 50, "amount": 11250 },
  "producer_B_id": { "percentage": 30, "amount": 6750 },
  "producer_C_id": { "percentage": 20, "amount": 4500 }
}
-- Total: 90% of gross (25000) = 22500 split among collaborators
```

#### New Table: `collaboration_invites`
```sql
CREATE TABLE collaboration_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beat_id UUID NOT NULL REFERENCES beats(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES profiles(id),
  invitee_id UUID NOT NULL REFERENCES profiles(id),
  ownership_percentage NUMERIC(5,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'declined' | 'expired'
  message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  UNIQUE(beat_id, invitee_id, status)
);
```

### **2. BACKEND CHANGES** (High Priority)

#### New Server Functions
```typescript
// src/lib/collaborative-beats.server.ts

/** Get all collaborators for a beat */
export async function getBeatCollaborators(beatId: string) {
  const { data } = await supabase
    .from('beat_collaborators')
    .select('*, producer:profiles(producer_name, username, avatar_url)')
    .eq('beat_id', beatId)
    .eq('status', 'active')
    .order('ownership_percentage', { ascending: false });
  return data || [];
}

/** Invite collaborator to beat */
export async function inviteCollaborator(
  beatId: string,
  inviteeId: string,
  ownershipPercentage: number,
  inviterId: string
) {
  // Validate: inviter is owner/collaborator
  // Validate: total ownership won't exceed 100%
  // Create invite
  // Send notification
}

/** Accept collaboration invite */
export async function acceptCollaboration(inviteId: string, userId: string) {
  // Validate invite is pending
  // Update beat_collaborators: add new collaborator
  // Update invite status: 'accepted'
  // Send notification to all collaborators
}

/** Calculate split earnings for collaborative beat */
export async function calculateCollaborativeSplit(
  beatId: string,
  grossAmount: number
) {
  const collaborators = await getBeatCollaborators(beatId);
  const platformCommission = grossAmount * 0.1;
  const producerTotal = grossAmount * 0.9;
  
  const splits = collaborators.map(c => ({
    producer_id: c.producer_id,
    percentage: c.ownership_percentage,
    amount: (producerTotal * c.ownership_percentage) / 100
  }));
  
  return { platformCommission, producerTotal, splits };
}
```

#### Update Payment Webhook
```typescript
// src/routes/api/public/payments/webhook.ts

// After successful payment:
if (succeeded) {
  // Check if beat is collaborative
  const { data: collabs } = await supabase
    .from('beat_collaborators')
    .select('producer_id, ownership_percentage')
    .eq('beat_id', purchase.beat_id)
    .eq('status', 'active');
  
  if (collabs && collabs.length > 0) {
    // Credit each collaborator's wallet proportionally
    const producerTotal = purchase.producer_earnings;
    
    for (const collab of collabs) {
      const amount = (producerTotal * collab.ownership_percentage) / 100;
      await supabase.rpc('credit_producer_wallet', {
        _producer_id: collab.producer_id,
        _amount: amount,
        _pending: false
      });
    }
    
    // Store split details
    await supabase
      .from('purchases')
      .update({ 
        earnings_split: collabs.reduce((acc, c) => ({
          ...acc,
          [c.producer_id]: {
            percentage: c.ownership_percentage,
            amount: (producerTotal * c.ownership_percentage) / 100
          }
        }), {})
      })
      .eq('id', purchase.id);
  }
}
```

### **3. FRONTEND CHANGES** (High Priority)

#### New Component: CollaboratorManager
```typescript
// src/components/CollaboratorManager.tsx

export function CollaboratorManager({ beatId, isOwner }: Props) {
  return (
    <div>
      {/* List current collaborators */}
      <CollaboratorList collaborators={collaborators} />
      
      {/* Add new collaborator (owner only) */}
      {isOwner && (
        <InviteForm 
          onInvite={handleInvite}
          availableOwnership={100 - totalOwnership}
        />
      )}
      
      {/* Pending invites */}
      <PendingInvites invites={pendingInvites} />
    </div>
  );
}
```

#### Update Beat Upload Form
```typescript
// src/routes/producer/upload.tsx

// Add new step: "Collaborators" (optional)
const steps = [
  "Beat information",
  "Upload files",
  "Licensing",
  "Collaborators" // NEW STEP
];

// After publishing beat:
if (collaboratorInvites.length > 0) {
  for (const invite of collaboratorInvites) {
    await inviteCollaborator(
      beatId,
      invite.producerId,
      invite.ownershipPercentage,
      user.id
    );
  }
}
```

#### Update Producer Dashboard
```typescript
// src/routes/producer/dashboard.tsx

// Add new tab: "Collaborative Beats"
const tabs = [
  ...existingTabs,
  "collaborative-beats",
  "collaboration-invites"
];

// Show beats where user is collaborator
function CollaborativeBeatsTab() {
  const { data: collabBeats } = await supabase
    .from('beat_collaborators')
    .select('*, beat:beats(*)')
    .eq('producer_id', user.id)
    .eq('status', 'active');
  
  return (
    <div>
      {collabBeats.map(c => (
        <BeatCard 
          beat={c.beat}
          badge={`${c.ownership_percentage}% owner`}
        />
      ))}
    </div>
  );
}
```

#### Update Beat Detail Page
```typescript
// src/routes/beat.$id.tsx

// Show all collaborators
<div className="collaborators">
  <h3>Produced by:</h3>
  {collaborators.map(c => (
    <Link to={`/producer/${c.username}`}>
      {c.producer_name} ({c.ownership_percentage}%)
    </Link>
  ))}
</div>
```

### **4. LICENSE AGREEMENT CHANGES** (Medium Priority)

```typescript
// src/lib/licenses.ts

// Update contract template
const CONTRACT_TEMPLATE = `
This License Agreement ("Agreement") is entered into as of the purchase date 
between the Artist ("Licensee") and the following Producers (collectively "Producer"):

{{#each collaborators}}
- {{producer_name}} ({{ownership_percentage}}% ownership)
{{/each}}

GRANT OF LICENSE: Producers grant Licensee a {{exclusive}} license to use 
the instrumental musical composition ("Beat") titled "{{beat_title}}"...

PRODUCER CREDITS: Licensee must credit the Beat as follows:
"Produced by {{#each collaborators}}{{producer_name}}{{#unless @last}}, {{/unless}}{{/each}}"
`;
```

### **5. EMAIL NOTIFICATION CHANGES** (Medium Priority)

```typescript
// src/lib/email.ts

// New: Send to all collaborators
export async function sendCollaborativeSaleNotification(
  beat: Beat,
  buyer: User,
  license: License,
  splits: EarningsSplit[]
) {
  for (const split of splits) {
    await resend.emails.send({
      to: split.producer_email,
      subject: `🎉 Sale: ${beat.title}`,
      html: `
        <p>Great news! "${beat.title}" was purchased.</p>
        <p><strong>Your earnings: ₦${split.amount.toLocaleString()}</strong></p>
        <p>Your ownership: ${split.percentage}%</p>
        <p>Buyer: ${buyer.name} (${buyer.email})</p>
        <p>License: ${license.name}</p>
      `
    });
  }
}
```

---

## ⚠️ RISKS & DEPENDENCIES

### **Technical Risks**

1. **Paystack Multi-Split Limitation**
   - **Risk:** Paystack may not support multiple subaccounts in a single transaction
   - **Mitigation:** Use post-purchase wallet crediting instead of real-time splits
   - **Impact:** Medium - requires wallet-based payout system

2. **Race Conditions in Ownership Validation**
   - **Risk:** Multiple invites could exceed 100% ownership
   - **Mitigation:** Use database triggers + row-level locks
   - **Impact:** Low - database constraints prevent invalid state

3. **RLS Policy Complexity**
   - **Risk:** Complex permission logic for shared beat editing
   - **Mitigation:** Clear policy: "owner OR active collaborator can edit"
   - **Impact:** Medium - requires careful testing

4. **Contract Legal Validity**
   - **Risk:** Multi-producer contracts may need legal review
   - **Mitigation:** Consult legal counsel for contract templates
   - **Impact:** High - affects platform liability

### **Business Risks**

1. **Revenue Distribution Disputes**
   - **Risk:** Collaborators disagree on ownership percentages
   - **Mitigation:** Lock ownership once beat is published
   - **Impact:** Medium - requires dispute resolution process

2. **Split Payment Timing**
   - **Risk:** Delayed payments if splits are manual
   - **Mitigation:** Automate wallet crediting in webhook
   - **Impact:** Low - 30-second delay acceptable

3. **Tax Implications**
   - **Risk:** Multiple earners complicate tax reporting
   - **Mitigation:** Each producer manages their own taxes
   - **Impact:** Low - producers are independent contractors

### **Dependencies**

1. **Database Migrations** ✅ Required
   - `beat_collaborators` table
   - `collaboration_invites` table
   - `purchases.earnings_split` column
   - RLS policies

2. **Paystack API Investigation** ⚠️ Required
   - Confirm multi-subaccount support
   - Test split payment scenarios
   - Alternative: Wallet-based distribution

3. **Legal Review** ⚠️ Recommended
   - Multi-producer contract template
   - Ownership dispute clause
   - Platform liability terms

4. **Email Template Updates** ✅ Required
   - Collaborative sale notifications
   - Collaboration invite emails
   - Ownership percentage display

---

## 📁 RELEVANT FILES

### **Frontend Files (React/TypeScript)**
```
src/routes/producer/
├── dashboard.tsx          # Producer dashboard with tabs
├── upload.tsx             # Beat upload form
├── edit.$id.tsx           # Beat edit form
└── $username.tsx          # Producer profile page

src/routes/
├── beat.$id.tsx           # Beat detail page
└── purchase/checkout.tsx  # Payment checkout

src/components/
├── ProducerLayout.tsx     # Producer navigation
├── BeatCard.tsx           # Beat display component
├── CartDrawer.tsx         # Shopping cart & checkout
└── ProducerAnalytics.tsx  # Analytics dashboard

src/lib/
├── beats-api.ts           # Beat CRUD operations
├── licenses.ts            # License types & contracts
├── commission.ts          # Revenue calculations
├── purchase-service.ts    # Purchase creation
├── payouts.server.ts      # Paystack integration
└── email.ts               # Email notifications
```

### **Backend Files (Supabase/SQL)**
```
supabase/migrations/
├── 20260726100138_*.sql   # Initial schema
├── 20260728100000_*.sql   # Purchases & downloads
├── 20260731190000_*.sql   # Paystack subaccounts
└── 20261109000003_*.sql   # Auto-split payments

src/integrations/supabase/
├── client.ts              # Supabase client
├── types.ts               # Generated DB types
└── auth-middleware.ts     # Auth helpers

src/routes/api/public/payments/
└── webhook.ts             # Payment webhooks
```

### **Database Functions (PostgreSQL)**
```sql
-- src/integrations/supabase/types.ts
get_subaccount_for_beat(_beat_id)      # Returns producer subaccount
credit_producer_wallet(...)             # Credits wallet balance
record_verified_marketplace_purchase()  # Creates purchase record
```

---

## 📈 IMPLEMENTATION PRIORITY

### **Phase 1: Core Database (Week 1)**
1. ✅ Create `beat_collaborators` table
2. ✅ Create `collaboration_invites` table
3. ✅ Add `purchases.earnings_split` column
4. ✅ Create ownership validation triggers
5. ✅ Update RLS policies

### **Phase 2: Backend Logic (Week 2)**
1. ✅ Implement collaboration invite system
2. ✅ Update purchase webhook for multi-split
3. ✅ Create server functions for collaborator management
4. ✅ Update email notifications
5. ✅ Test Paystack multi-split OR wallet distribution

### **Phase 3: Producer UI (Week 3)**
1. ✅ Add "Collaborators" step to upload form
2. ✅ Create CollaboratorManager component
3. ✅ Add "Collaborative Beats" dashboard tab
4. ✅ Add "Pending Invites" section
5. ✅ Update beat edit form

### **Phase 4: Public-Facing Updates (Week 4)**
1. ✅ Update beat detail page (show all collaborators)
2. ✅ Update license contracts (multi-producer)
3. ✅ Update producer profile pages
4. ✅ Add collaboration badges to BeatCard
5. ✅ Update analytics (split stats)

### **Phase 5: Testing & Polish (Week 5)**
1. ✅ End-to-end testing
2. ✅ Edge case handling (100% ownership, single owner, disputes)
3. ✅ Performance optimization
4. ✅ Legal review
5. ✅ Documentation

---

## ✅ RECOMMENDATION

The HITXLAB codebase is **well-structured and ready** for implementing Collaborative Beats with the following approach:

1. **Use Wallet-Based Distribution** (Not Real-Time Paystack Splits)
   - Safer and more flexible
   - Avoids Paystack API limitations
   - Allows for instant crediting after payment verification

2. **Lock Ownership After First Sale**
   - Prevents disputes mid-campaign
   - Maintains contract integrity
   - Clear ownership history

3. **Implement in 5 Phases** (5 weeks)
   - Allows for testing between phases
   - Minimizes risk of breaking existing features
   - Enables incremental rollout

4. **Legal Review Required**
   - Multi-producer contracts need validation
   - Dispute resolution policy needed
   - Tax implications clarification

---

## 📞 NEXT STEPS

1. ✅ **Approve this technical report**
2. ✅ **Confirm Paystack multi-split capability** (or approve wallet approach)
3. ✅ **Legal review contract templates**
4. ✅ **Begin Phase 1: Database migrations**
5. ✅ **Set up development environment for testing**

---

**Report Compiled By:** Kiro AI Development Assistant  
**Date:** November 16, 2026  
**Status:** ✅ Ready for Implementation

