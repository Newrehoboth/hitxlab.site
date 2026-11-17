# 🛡️ CONTENT MODERATION SYSTEM - SETUP GUIDE

## What This Does

Complete moderation system with:
- ✅ **Beat Takedowns** (temporary or permanent)
- ✅ **User Strike System** (auto-suspend at 2 strikes)
- ✅ **Automatic Email Notifications**
- ✅ **Admin Dashboard Integration**

---

## 🚀 Step-by-Step Setup (10 Minutes)

### **Step 1: Run Database Migration** (2 minutes)

1. Open `MODERATION-SYSTEM-MIGRATION.sql`
2. Copy **ENTIRE** file content
3. Go to Supabase SQL Editor
4. Paste and click **RUN**
5. You should see: `✅ Moderation system created successfully!`

This creates:
- `beat_moderation_actions` table
- `user_strikes` table  
- `moderation_activity_log` table
- 3 database functions (takedown_beat, give_user_strike, get_user_moderation_summary)

---

### **Step 2: Test Locally** (3 minutes)

The backend files are already created:
- ✅ `src/lib/moderation.server.ts` - Server logic
- ✅ `src/lib/moderation.functions.ts` - API functions
- ✅ `src/components/ModerationPanel.tsx` - UI components

Now add it to your admin dashboard:

---

### **Step 3: Add to Admin Dashboard** (5 minutes)

Open `src/routes/admin/index.tsx` and add this import at the top:

```typescript
import { TakedownBeatModal, GiveStrikeModal } from "@/components/ModerationPanel";
import { takedownBeatFn, giveUserStrikeFn } from "@/lib/moderation.functions";
```

Then add these state variables inside the `AdminDashboard` component:

```typescript
const [selectedBeatForTakedown, setSelectedBeatForTakedown] = useState<any>(null);
const [selectedUserForStrike, setSelectedUserForStrike] = useState<any>(null);
```

Then add action buttons to your beat listings:

```typescript
{/* In your beat list, add these buttons */}
<button
  onClick={() => setSelectedBeatForTakedown(beat)}
  className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/20"
>
  <Ban className="h-3 w-3" />
  Takedown
</button>

<button
  onClick={() => setSelectedUserForStrike({ id: beat.producer_id, name: beat.producer_name, email: beat.producer_email })}
  className="flex items-center gap-1 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs text-yellow-500 hover:bg-yellow-500/20"
>
  <ShieldAlert className="h-3 w-3" />
  Give Strike
</button>
```

And at the bottom of your component, add the modals:

```typescript
{/* Moderation Modals */}
{selectedBeatForTakedown && (
  <TakedownBeatModal
    beat={selectedBeatForTakedown}
    onClose={() => setSelectedBeatForTakedown(null)}
    onSuccess={refreshData}
  />
)}

{selectedUserForStrike && (
  <GiveStrikeModal
    user={selectedUserForStrike}
    onClose={() => setSelectedUserForStrike(null)}
    onSuccess={refreshData}
  />
)}
```

---

## 🧪 Testing It Out

### Test 1: Takedown a Beat

1. Go to `localhost:8080/admin`
2. Find a beat in the beats list
3. Click **"Takedown"** button
4. Fill out the form:
   - Action: Temporary or Permanent
   - Reason: "Uploaded Music Instead of Beat"
   - Details: "This is a full song with vocals, not an instrumental"
   - Expiry: 7 days (for temporary)
5. Click **"Takedown & Send Email"**

**What Happens:**
- ✅ Beat `moderation_status` set to `taken_down_temporary` or `taken_down_permanent`
- ✅ Beat `published` set to `false` (hidden from buyers)
- ✅ Email sent to producer explaining the takedown
- ✅ Action logged in `beat_moderation_actions` table

**Email Preview:**
```
Subject: ⚠️ Beat Temporarily Taken Down: [Beat Title]

Hello [Producer],

Your beat "[Beat Title]" has been temporarily taken down by our moderation team.

Reason: Uploaded Music Instead of Beat
This is a full song with vocals, not an instrumental.

This takedown will expire on [Date].
```

---

### Test 2: Give User a Strike

1. Go to `localhost:8080/admin`
2. Find a user or beat
3. Click **"Give Strike"** button
4. Fill out the form:
   - Severity: Warning
   - Reason: "Uploaded Music Instead of Beat"
   - Details: "You uploaded a song instead of an instrumental beat"
5. Click **"Give Strike & Send Email"**

**What Happens:**
- ✅ Strike recorded in `user_strikes` table
- ✅ Profile `active_strikes` incremented
- ✅ If 2nd strike: User auto-suspended (`is_suspended = true`)
- ✅ Email sent explaining the strike

**Email Preview (Strike 1):**
```
Subject: ⚠️ Strike 1/2 - Warning

Hello [User],

Your account has received a Warning.

Reason: Uploaded Music Instead of Beat
You uploaded a song instead of an instrumental beat.

⚠️ Warning: One more strike will result in account suspension.

Strike Status: 1 / 2
```

**Email Preview (Strike 2 - Auto-Suspension):**
```
Subject: 🚨 Account Suspended - Strike 2

Hello [User],

Your account has been suspended due to multiple strikes.

Reason: Uploaded Music Instead of Beat

Account Suspended: You cannot upload beats, edit content, or receive earnings.

Strike Status: 2 / 2
```

---

## 📊 How The System Works

### **Beat Takedown Flow**
```
Admin clicks "Takedown"
  ↓
Fill out reason + details
  ↓
Database function: takedown_beat()
  ↓
- Update beat.moderation_status
- Set beat.published = false
- Record in beat_moderation_actions
  ↓
Send email to producer
  ↓
Beat hidden from marketplace
```

### **Strike System Flow**
```
Admin clicks "Give Strike"
  ↓
Fill out reason + details
  ↓
Database function: give_user_strike()
  ↓
- Insert into user_strikes
- Increment profile.active_strikes
- If strikes >= 2: Auto-suspend
  ↓
Send email to user
  ↓
If suspended: User can't upload/edit
```

---

## 🔍 Checking Results

### Database Queries:

```sql
-- Check beat moderation actions
SELECT * FROM public.beat_moderation_actions ORDER BY created_at DESC LIMIT 10;

-- Check user strikes
SELECT * FROM public.user_strikes ORDER BY created_at DESC LIMIT 10;

-- Check suspended users
SELECT id, name, email, active_strikes, is_suspended, suspended_at
FROM public.profiles
WHERE is_suspended = true;

-- Check taken down beats
SELECT id, title, moderation_status, moderation_reason, taken_down_at
FROM public.beats
WHERE moderation_status IN ('taken_down_temporary', 'taken_down_permanent');
```

---

## 📧 Email Configuration

The system uses **Resend** for emails. Make sure you have:

```env
RESEND_API_KEY=re_xxxxx
```

Emails are sent from: `moderation@hitxlab.com`

If emails aren't sending:
1. Check `.env` for `RESEND_API_KEY`
2. Verify domain in Resend dashboard
3. Check server logs for email errors

---

## 🎯 Takedown Reasons

```typescript
- copyright_claim           → "Copyright Claim"
- uploaded_music_not_beat   → "Uploaded Music Instead of Beat"  
- inappropriate_content     → "Inappropriate Content"
- spam                      → "Spam"
- terms_violation           → "Terms of Service Violation"
- other                     → "Other"
```

## ⚠️ Strike Reasons

```typescript
- copyright_violation               → "Copyright Violation"
- uploaded_music_instead_of_beat    → "Uploaded Music Instead of Beat"
- inappropriate_content             → "Inappropriate Content"
- spam                              → "Spam"
- terms_violation                   → "Terms of Service Violation"
- multiple_violations               → "Multiple Violations"
- other                             → "Other"
```

---

## 🔒 Security Features

1. **Admin-Only Access**: All moderation functions require admin role
2. **RLS Policies**: Users can only see their own moderation history
3. **Activity Logging**: All actions logged in `moderation_activity_log`
4. **Email Confirmation**: Emails marked as sent in database
5. **Auto-Suspension**: 2 strikes = automatic suspension (can't be bypassed)

---

## 📝 Future Enhancements (Optional)

- [ ] Appeal system for users
- [ ] Temporary strike expiry (auto-remove after 90 days)
- [ ] Bulk moderation actions
- [ ] Moderation queue (pending review)
- [ ] User notification center (view strikes in dashboard)
- [ ] Restore taken down beats
- [ ] Moderation analytics dashboard

---

## ✅ Checklist

- [ ] Run `MODERATION-SYSTEM-MIGRATION.sql` in Supabase
- [ ] Add moderation imports to admin dashboard
- [ ] Add Takedown and Strike buttons to beat list
- [ ] Add modals at bottom of admin component
- [ ] Test takedown a beat
- [ ] Test give user a strike
- [ ] Check email was sent
- [ ] Verify database records created

---

## 🆘 Troubleshooting

**Error: "Forbidden: Admin access required"**
- Solution: Run `QUICK-FIX-ADMIN.sql` to grant admin role

**Error: "Table beat_moderation_actions does not exist"**
- Solution: Run `MODERATION-SYSTEM-MIGRATION.sql` in Supabase

**Emails not sending**
- Check `RESEND_API_KEY` in `.env`
- Verify domain in Resend dashboard
- Check browser console for errors

**Beat still visible after takedown**
- Refresh the page (Cmd+Shift+R)
- Check `beats.moderation_status` in database
- Verify `published = false`

---

**Ready to test!** 🎉
