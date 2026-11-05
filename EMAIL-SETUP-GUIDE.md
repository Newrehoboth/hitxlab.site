# Email Setup Guide - Fix OTP Not Arriving

## Your Supabase Project Info

**Project ID**: `jcnritxaulgwdeardfss`
**Project URL**: `https://jcnritxaulgwdeardfss.supabase.co`

## Step-by-Step: Configure Resend for Email Sending

### Step 1: Access Your Supabase Dashboard

1. Go to: **https://supabase.com/dashboard**
2. Sign in (if not already signed in)
3. You should see your project: **jcnritxaulgwdeardfss**
4. Click on it

**OR** go directly to:
https://supabase.com/dashboard/project/jcnritxaulgwdeardfss

### Step 2: Configure SMTP Settings

1. In your Supabase project, click **Settings** (gear icon in bottom left)
2. Click **Auth** in the left sidebar
3. Scroll down to **SMTP Settings** section
4. Click **Enable Custom SMTP**
5. Fill in these details:

```
SMTP Host: smtp.resend.com
SMTP Port: 587
SMTP User: resend
SMTP Password: YOUR_RESEND_API_KEY
Sender Email: noreply@hitxlab.com.ng
Sender Name: Octave
```

6. Click **Save**

### Step 3: Verify Domain in Resend (IMPORTANT!)

Your site URL is `hitxlab.com.ng`, so you need to verify this domain in Resend:

1. Go to: **https://resend.com/domains**
2. Click **Add Domain**
3. Enter: `hitxlab.com.ng`
4. Follow instructions to add DNS records
5. Once verified, update Sender Email in Supabase to: `noreply@hitxlab.com.ng`

**OR** if you don't want to verify the domain yet, use Resend's test email:
```
Sender Email: onboarding@resend.dev
```

### Step 4: Test Email Sending

1. Go back to your app
2. Try signing up with a new email OR
3. Try the "Resend code" button
4. Check your email inbox (and spam folder!)

## Troubleshooting

### Issue: "Domain not verified"
**Solution**: Use `onboarding@resend.dev` as Sender Email until you verify your domain

### Issue: Still not receiving emails
**Check**:
1. Spam folder
2. Resend dashboard for delivery logs: https://resend.com/emails
3. Supabase Auth logs: Settings → Auth → Logs

### Issue: Can't access Supabase
**Solution**: 
1. Check if you have access to the email used for Lovable
2. Try "Forgot Password" on Supabase
3. OR contact Lovable support to get Supabase access

## Alternative: Skip Email Verification for Development

If you just want to test without email, you can disable email verification:

1. Go to Supabase → Settings → Auth
2. Scroll to **Email Auth**
3. Toggle OFF **"Enable email confirmations"**
4. **WARNING**: Only do this for development! Turn it back on for production

## Your Resend API Key

Already in your `.env` file:
```
RESEND_API_KEY="your_resend_api_key_here"
```

Make sure to use your actual Resend API key!

## Quick Test Commands

After configuring SMTP, test with curl:

```bash
curl --request POST \
  --url https://jcnritxaulgwdeardfss.supabase.co/auth/v1/signup \
  --header 'apikey: sb_publishable_Cz_Aiqat9O_GHZAkpFrsqQ_ZnSthm-G' \
  --header 'content-type: application/json' \
  --data '{"email":"test@example.com","password":"password123"}'
```

Check Resend dashboard to see if email was sent!

## Summary

1. ✅ Your Resend API key is correct
2. ⚠️ You need to configure Supabase to USE Resend
3. ⚠️ You need to verify hitxlab.com.ng in Resend OR use onboarding@resend.dev
4. ✅ Once configured, OTP emails will arrive!

## Need Help?

If you can't access Supabase dashboard:
- Try password reset at: https://supabase.com/dashboard/sign-in
- Use the email associated with your Lovable account
- Contact Lovable support if still stuck

The key issue: Supabase is trying to send emails but doesn't know to use Resend. Once you configure SMTP settings, it will work! 🚀
