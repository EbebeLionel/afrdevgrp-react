# 🔧 Firebase Storage Error - Complete Troubleshooting Guide

## Current Error:

```
storage/unauthorized - events/admin-user-001/ghhQINfibZXzOsJPxPDo/photo.jpg
```

Your Storage Bucket: `adg-columbia-13d72.firebasestorage.app`

---

## ✅ Solution 1: Verify Storage is Enabled

### Step 1: Check if Firebase Storage is Set Up

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: **adg-columbia-13d72**
3. Click **Storage** in left sidebar
4. **If you see "Get Started"** → Click it to initialize Storage
5. Choose "Start in test mode" → Click Next
6. Select your region → Click Done

### Step 2: Verify Your Bucket

After setup, confirm your bucket name matches:

```
adg-columbia-13d72.firebasestorage.app
```

---

## ✅ Solution 2: Apply Rules with Correct Bucket Format

Sometimes Firebase uses different bucket formats. Try BOTH versions:

### Version A (Standard Format):

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

### Version B (Explicit Bucket):

```javascript
rules_version = '2';
service firebase.storage {
  match /b/adg-columbia-13d72.firebasestorage.app/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

**Try Version A first. If it doesn't work after 60 seconds, try Version B.**

---

## ✅ Solution 3: Check Browser Console for Detailed Errors

1. Open your browser Developer Tools (F12)
2. Go to **Console** tab
3. Try uploading again
4. Look for error messages starting with:
   - `FirebaseError`
   - `storage/`
   - `CORS`

### Common Error Patterns:

#### Error Pattern 1: "CORS policy"

**Problem**: CORS configuration issue
**Solution**: Add CORS configuration to Storage

Create file `cors.json`:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
```

Then run in terminal:

```bash
gsutil cors set cors.json gs://adg-columbia-13d72.firebasestorage.app
```

#### Error Pattern 2: "project not found"

**Problem**: Wrong project ID
**Solution**: Verify project ID in Firebase Console matches your config

#### Error Pattern 3: "quota exceeded"

**Problem**: Firebase free tier limit reached
**Solution**: Check Firebase Console → Usage tab

---

## ✅ Solution 4: Clear Cache and Test Fresh

1. **Clear browser cache completely**
2. **Clear localStorage**:
   - Open DevTools (F12)
   - Go to Application tab
   - Storage → Local Storage
   - Right-click → Clear
3. **Hard refresh page**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
4. **Try uploading again**

---

## ✅ Solution 5: Test with Firebase Console Upload

### Verify Storage Works at All:

1. Firebase Console → Storage
2. Click "Upload file" button
3. Upload any test image
4. **If this fails** → Storage isn't properly initialized
5. **If this works** → Problem is in your app code/rules

---

## ✅ Solution 6: Double-Check Rule Publication

### Verify Rules Were Actually Applied:

1. Firebase Console → Storage → Rules
2. Look at the **Published** timestamp
3. Should be recent (within last few minutes)
4. Click "View Published Rules"
5. Confirm rules match what you pasted

### Common Mistakes:

❌ Rules not saved (forgot to click Publish)
❌ Wrong project selected
❌ Rules have syntax error (red underline in editor)
❌ Looking at Firestore Rules instead of Storage Rules

---

## ✅ Solution 7: Verify Firebase Config

Check your [`firebase.ts`](src/firebase.ts) configuration:

```typescript
storageBucket: "adg-columbia-13d72.firebasestorage.app";
```

### Verify in Firebase Console:

1. Project Settings (gear icon)
2. General tab
3. Scroll to "Your apps"
4. Find Web App config
5. Compare ALL values match your `firebase.ts`

Especially check:

- apiKey
- authDomain
- projectId
- storageBucket ← **Most important for this error**

---

## ✅ Solution 8: Test with Minimal Code

Create a test file to isolate the issue:

```typescript
// test-upload.ts
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

async function testUpload() {
  try {
    // Create a tiny test file
    const blob = new Blob(["test"], { type: "text/plain" });
    const file = new File([blob], "test.txt");

    // Try to upload
    const storageRef = ref(storage, "test/test.txt");
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);

    console.log("✅ Upload successful!", url);
  } catch (error) {
    console.error("❌ Upload failed:", error);
  }
}

testUpload();
```

Run this test and check what error you get.

---

## ✅ Solution 9: Check Firebase Project Permissions

### Verify You Have Correct Permissions:

1. Firebase Console → Project Settings
2. Users and Permissions tab
3. Make sure you're listed as **Owner** or **Editor**
4. If you're only **Viewer**, you can't change rules

---

## ✅ Solution 10: Restart Everything

Sometimes Firebase just needs a fresh start:

1. **Close all browser tabs** with Firebase Console
2. **Clear browser cache**
3. **Reopen Firebase Console**
4. **Reapply the rules** (copy/paste fresh)
5. **Click Publish**
6. **Wait 2-3 minutes**
7. **Hard refresh your app** (Ctrl+Shift+R)
8. **Try upload again**

---

## 🎯 Quick Diagnostic Checklist

Go through this checklist in order:

- [ ] Storage is initialized in Firebase Console
- [ ] Bucket name matches: `adg-columbia-13d72.firebasestorage.app`
- [ ] Rules were published (check timestamp)
- [ ] Rules look correct (no syntax errors)
- [ ] Waited at least 60 seconds after publishing
- [ ] Browser cache cleared
- [ ] Hard refreshed the app page
- [ ] Checked browser console for additional errors
- [ ] Firebase config matches Project Settings
- [ ] I have Editor/Owner permissions on the project

---

## 🆘 If Nothing Works

### Report These Details:

1. **Exact error message from browser console** (screenshot)
2. **Current Storage Rules** (screenshot from Firebase Console)
3. **Storage initialization status** (is "Get Started" button still visible?)
4. **Your role in the project** (Owner/Editor/Viewer?)
5. **Any other error messages** in console

### Alternative Temporary Solution:

If you need to continue development while troubleshooting:

**Use Mock Data Instead:**

```typescript
// In Events.tsx, temporarily comment out actual upload
const mockPhotoUrl = "https://via.placeholder.com/400";
// Use mockPhotoUrl instead of actual upload result
```

This lets you test other features while fixing Storage.

---

## 📚 Additional Resources

- [Firebase Storage Quickstart](https://firebase.google.com/docs/storage/web/start)
- [Firebase Storage Security Rules](https://firebase.google.com/docs/storage/security)
- [Troubleshooting Storage](https://firebase.google.com/docs/storage/web/handle-errors)

---

**Last Updated**: 2025-11-10  
**Your Project**: adg-columbia-13d72  
**Your Bucket**: adg-columbia-13d72.firebasestorage.app
