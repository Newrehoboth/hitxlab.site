# 🚀 MODERATION SYSTEM - RUN THIS SQL

## What To Do:

### **Step 1: Open Supabase SQL Editor**
1. Go to: https://supabase.com/dashboard
2. Select your HITXLAB project
3. Click **"SQL Editor"** in left sidebar

### **Step 2: Run The Migration**
1. Open `MODERATION-SYSTEM-MIGRATION.sql` in your code editor
2. Copy **ENTIRE** file content (Cmd+A, Cmd+C)
3. Paste into Supabase SQL Editor
4. Click **RUN** button

### **Step 3: Wait For Success**
You should see:
```
✅ Moderation system created successfully!
```

---

## That's It!

I've already added all the code to your admin dashboard.

Now just:
1. Make sure dev server is running: `npm run dev`
2. Go to: `http://localhost:8080/admin`
3. Look at the **Beats** tab
4. You'll see **"Takedown"** and **"Strike"** buttons

---

## Test It:

1. Click **"Takedown"** on any beat
2. Select reason: "Uploaded Music Instead of Beat"
3. Add details: "This is a full song with vocals"
4. Choose Temporary or Permanent
5. Click **"Takedown & Send Email"**

**Email will be sent to producer automatically!**

---

## Having Issues?

**SQL error?**
- Make sure you copied the ENTIRE file
- Check you're in the right Supabase project

**Buttons not showing?**
- Refresh page with Cmd+Shift+R
- Check browser console for errors

**TypeScript errors?**
- Restart dev server (Ctrl+C, then `npm run dev`)

---

✅ **Ready to test!**
