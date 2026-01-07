# Firebase Setup Guide for ADG Application

## Prerequisites Setup (Required Before Authentication Works)

Your authentication system is fully coded and deployed, but Firebase services need to be enabled in the Firebase Console. Follow these steps in order:

---

## Step 1: Enable Email/Password Authentication

### Instructions:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **adg-columbia-13d72**
3. In the left sidebar, click **Authentication** (under "Build" section)
4. Click the **Get Started** button (if this is your first time)
5. Click on the **Sign-in method** tab at the top
6. Under "Sign-in providers", find **Email/Password**
7. Click on **Email/Password** to expand it
8. Toggle **Enable** to ON
9. Click **Save**

**Status**: ⚠️ **REQUIRED** - Your authentication will not work without this!

---

## Step 2: Create Firestore Database

### Instructions:

1. In Firebase Console, click **Firestore Database** in the left sidebar
2. Click **Create database** button
3. Choose **Start in production mode** (we'll add custom rules next)
4. Select your preferred **Cloud Firestore location** (e.g., `us-east1`)
5. Click **Enable**
6. Wait for the database to be created (takes ~1 minute)

**Status**: ⚠️ **REQUIRED** - User profiles are stored here!

---

## Step 3: Apply Firestore Security Rules

### Instructions:

1. In Firestore Database, click on the **Rules** tab at the top
2. You'll see the default rules editor
3. **Delete all existing rules** in the editor
4. **Copy the rules** from [`FIREBASE_SECURITY_RULES.md`](./FIREBASE_SECURITY_RULES.md) (lines 27-165)
5. **Paste** the rules into the Firebase Rules editor
6. Click **Publish** at the top right
7. Wait for confirmation that rules are published

**The rules to copy start with:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ...
```

**Status**: ⚠️ **REQUIRED** - Protects user data and enables proper access control!

---

## Step 4: (Optional) Set Up Admin User

To allow a user to create/edit events, you need to mark them as an admin.

### Instructions:

1. First, **create a user account** by signing up on your website
2. In Firebase Console, go to **Firestore Database**
3. Click on the **Data** tab
4. You should see a `users` collection (created when you signed up)
5. Click on the `users` collection to expand it
6. Click on your user document (it will have a long UID like `abc123def456`)
7. You'll see fields: `uid`, `email`, `name`, `birthday`, `school`, `createdAt`
8. Click **Add field** button
9. Enter:
   - Field: `isAdmin`
   - Type: `boolean`
   - Value: `true` (check the box)
10. Click **Add**
11. The user is now an admin and can manage events

**Status**: ✅ Optional - Only needed for event management

---

## Verification Checklist

After completing Steps 1-3, verify everything is working:

### ✅ Check 1: Authentication Enabled

- Go to Firebase Console → Authentication → Sign-in method
- **Email/Password** should show as **Enabled**

### ✅ Check 2: Firestore Created

- Go to Firebase Console → Firestore Database
- You should see the database (even if empty)
- Rules tab should show your custom rules

### ✅ Check 3: Website Works

1. Visit: https://adg-columbia-13d72.web.app
2. Click the login icon in the header
3. Try signing up with:
   - Name: Test User
   - Email: test@example.com
   - Password: test123 (at least 6 characters)
   - Birthday: 2000-01-01
   - School: Test University
4. If successful:
   - You'll be redirected to the home page
   - The login icon will be replaced with a green circle showing "T"
   - Click the avatar to see your name and logout option

### ✅ Check 4: Data in Firestore

- After signing up, go to Firestore Database → Data tab
- You should see a new `users` collection
- Click to expand and see your user document with all your data

---

## Common Issues and Solutions

### Issue: "An error occurred. Please try again."

**Solution**: You haven't enabled Email/Password authentication (Step 1)

### Issue: "Missing or insufficient permissions"

**Solution**: You haven't applied Firestore Security Rules (Step 3) or Firestore isn't created (Step 2)

### Issue: Login icon doesn't change to avatar

**Possible causes**:

1. Check browser console for errors (F12)
2. Make sure Firestore rules are published
3. Try logging out and logging in again
4. Clear browser cache and refresh

### Issue: Can't create events

**Solution**: Your user needs to be marked as admin (Step 4)

---

## Summary

**Required Steps** (Do these now):

1. ✅ Enable Email/Password Authentication
2. ✅ Create Firestore Database
3. ✅ Apply Firestore Security Rules

**Optional Steps**: 4. Set up admin users (only for event management)

After completing the required steps, your authentication system will work perfectly!

---

## Support

If you encounter any issues:

1. Check the browser console (F12 → Console tab) for error messages
2. Verify each step was completed correctly
3. Make sure you're using the correct Firebase project (adg-columbia-13d72)
4. Try logging out and back in
5. Clear browser cache if needed

---

**Last Updated**: November 2025  
**Project**: ADG Columbia Application  
**Firebase Project**: adg-columbia-13d72  
**Hosting URL**: https://adg-columbia-13d72.web.app
