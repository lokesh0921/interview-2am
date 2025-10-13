# Production Email Setup Guide

## Issue: Users not receiving login emails in production

### Current Setup

- Using Supabase Magic Link authentication
- Project: `auxozhqevneiwqudtjsz.supabase.co`
- Frontend: `https://interview-2am.vercel.app`

### Required Fixes

#### 1. Supabase Dashboard Configuration

**Go to:** https://supabase.com/dashboard/project/auxozhqevneiwqudtjsz

**A. Authentication → URL Configuration**

```
Site URL: https://interview-2am.vercel.app
Redirect URLs:
  - https://interview-2am.vercel.app/**
  - https://interview-2am-arw9.vercel.app/**
```

**B. Authentication → Email Templates**

- Enable "Magic Link" template
- Customize email content if needed
- Test email template

**C. Authentication → SMTP Settings (CRITICAL)**

```
Enable custom SMTP: YES
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: lokeshpawar721@gmail.com
SMTP Pass: [Gmail App Password]
SMTP Admin Email: lokeshpawar721@gmail.com
```

#### 2. Gmail App Password Setup

1. Enable 2-Factor Authentication on Gmail
2. Generate App Password:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password in Supabase SMTP settings

#### 3. Environment Variables Check

**Frontend (.env):**

```env
VITE_SUPABASE_URL=https://auxozhqevneiwqudtjsz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1eG96aHFldm5laXdxdWR0anN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNzAxNjYsImV4cCI6MjA3Mzg0NjE2Nn0.Feafb0gzpHQgF6-AagvpSEkHohkIGHTxk4T9d89TFnE
VITE_API_BASE=https://interview-2am-2.onrender.com/api
```

**Backend (.env):**

```env
SUPABASE_URL=https://auxozhqevneiwqudtjsz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1eG96aHFldm5laXdxdWR0anN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNzAxNjYsImV4cCI6MjA3Mzg0NjE2Nn0.Feafb0gzpHQgF6-AagvpSEkHohkIGHTxk4T9d89TFnE
SUPABASE_JWKS_URL=https://auxozhqevneiwqudtjsz.supabase.co/auth/v1/keys
```

#### 4. Testing Steps

1. **Test in Supabase Dashboard:**

   - Go to Authentication → Users
   - Try sending a test email

2. **Test in Production:**

   - Try login with a test email
   - Check spam folder
   - Check Supabase logs

3. **Debug Steps:**
   - Check browser console for errors
   - Check Supabase logs in dashboard
   - Verify email is not in spam

#### 5. Common Issues & Solutions

**Issue: "Email not confirmed"**

- Solution: Check email templates are enabled

**Issue: "Invalid redirect URL"**

- Solution: Add production URLs to redirect list

**Issue: "Rate limit exceeded"**

- Solution: Set up custom SMTP

**Issue: Emails going to spam**

- Solution: Configure SPF/DKIM records (advanced)

### Quick Fix Checklist

- [ ] Configure custom SMTP in Supabase
- [ ] Set correct Site URL and Redirect URLs
- [ ] Enable email templates
- [ ] Test email delivery
- [ ] Check spam folders
- [ ] Verify environment variables in production

### Support

If issues persist:

1. Check Supabase logs in dashboard
2. Test with different email providers
3. Consider using alternative email service (SendGrid, Mailgun)
