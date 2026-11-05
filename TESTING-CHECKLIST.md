# Testing Checklist - Artist vs Producer Routing

## ✅ Test Cases to Verify

### Test 1: Artist Sign-in Flow
- [ ] Open browser console (F12)
- [ ] Navigate to `/auth`
- [ ] Sign in with: `mainsitemail09@gmail.com` / `Tochi123!!!`
- [ ] **Expected**: Console shows `role: "artist"`
- [ ] **Expected**: Redirects to `/artist/dashboard`
- [ ] **Expected**: Shows artist dashboard (not producer onboarding)

### Test 2: Artist Navigation Protection
- [ ] While logged in as artist, try to go to `/producer/dashboard`
- [ ] **Expected**: Automatically redirected to `/artist/dashboard`
- [ ] Try to go to `/producer/onboarding`
- [ ] **Expected**: Redirected to `/` (home page)

### Test 3: Artist Dashboard Features
- [ ] Can view "Overview" tab
- [ ] Can view "My Purchases" tab
- [ ] Can view "Messages/Negotiations" tab
- [ ] Can view "Settings" tab
- [ ] Can browse beats marketplace
- [ ] Stats show correctly (purchases, negotiations, total spent)

### Test 4: Producer Sign-in Flow (if you have producer account)
- [ ] Sign out from artist account
- [ ] Sign in with producer credentials
- [ ] **Expected**: Console shows `role: "producer"`
- [ ] **Expected**: Redirects to `/producer/onboarding` (if no profile) OR `/producer/dashboard` (if profile exists)
- [ ] **Expected**: Shows producer dashboard/onboarding

### Test 5: Producer Navigation Protection
- [ ] While logged in as producer, can access `/producer/dashboard`
- [ ] Can access `/producer/upload`
- [ ] Can access `/producer/onboarding`
- [ ] Try to go to `/artist/dashboard`
- [ ] **Expected**: Should NOT be redirected away (producers can view artist dashboard)

### Test 6: No Infinite Redirects
- [ ] Log in as artist
- [ ] Navigate to `/artist/dashboard`
- [ ] Hard refresh page (Cmd+Shift+R or Ctrl+Shift+R)
- [ ] **Expected**: Page loads once, no flashing/redirecting
- [ ] Navigate to settings tab
- [ ] Hard refresh again
- [ ] **Expected**: Stays on settings, no redirect loop

### Test 7: Incognito/Private Window Test
- [ ] Open incognito/private window
- [ ] Go to `/auth`
- [ ] Sign in as artist
- [ ] **Expected**: Clean sign-in, no cached issues
- [ ] **Expected**: Correct redirect to `/artist/dashboard`

## 🔍 Debug Information to Check

When signing in, the console should show (in order):

1. **loadUser function** (may appear multiple times):
   ```
   🔍 loadUser - DB data: { ... }
   🔍 loadUser - metadata: { ... }
   🔍 loadUser - final user: { ... }
   ```

2. **Sign-in handler**:
   ```
   🔍 Sign-in successful. User: { ... }
   🔍 User role: artist (or producer)
   🔍 Routing to: /artist/dashboard (or /producer/onboarding)
   ```

3. **Layout protection** (if accessing producer routes):
   ```
   🔍 ProducerLayout - user: { ... }
   🔍 ProducerLayout - user role: artist
   🔍 ProducerLayout - User is not a producer, redirecting to artist dashboard
   ```

## 🐛 Common Issues and Solutions

### Issue: Console shows `role: "producer"` for artist account
**Solution**: Run `fix-artist-role.sql` in Supabase SQL Editor

### Issue: Console shows `role: "artist"` but still goes to producer onboarding
**Solution**: Check if there's a second console message that's changing the route

### Issue: Multiple `loadUser` calls with different results
**Solution**: Race condition - clear cache and try again

### Issue: No console messages appear at all
**Solution**: Hard refresh the page (Cmd+Shift+R) to get latest code with debug logging

### Issue: Redirect loop between onboarding and dashboard
**Solution**: This was fixed in previous update - make sure you have latest code

## 📊 What to Report Back

If the issue persists, please provide:

1. **Screenshot or copy-paste of ALL console messages** (🔍 ones)
2. **What page you end up on** after sign-in
3. **Your expected behavior** vs what actually happened
4. **Any error messages** (red text in console)

## ✨ Success Criteria

The fix is successful when:
- ✅ Artist login goes directly to `/artist/dashboard`
- ✅ No flashing/redirecting to other pages
- ✅ Console shows `role: "artist"` consistently
- ✅ Hard refresh doesn't cause redirects
- ✅ Incognito window works correctly
- ✅ Settings page and all tabs work without redirects

## 🧹 After Testing

Once everything works:
1. Let me know so I can remove the debug console.log statements
2. Keep the SQL fix script for future reference
3. Document any other issues you find
