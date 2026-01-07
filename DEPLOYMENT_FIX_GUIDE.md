# 🚨 Firebase Rules Deployment Fix Guide

## The Problem

Your video uploads weren't working because:

1. **Storage Rules**: Not deployed to Firebase (rules only existed locally)
2. **Firestore Rules**: Mismatched data structure (rules expected subcollections, but app uses arrays)
3. **Authorization**: Email checking needed to happen on Firebase side

## ✅ The Solution

I've fixed all three issues. Here's what changed:

### 1. Storage Rules Fixed ([`storage.rules`](storage.rules))

- ✅ Supports **both videos and photos**
- ✅ Checks authorization using Firebase Auth email
- ✅ Videos: up to 100MB
- ✅ Images: up to 10MB

### 2. Firestore Rules Fixed ([`firestore.rules`](firestore.rules))

- ✅ Matches your app's actual data structure (comments as arrays)
- ✅ Allows authenticated users to add comments
- ✅ Only authorized emails can create/delete reels and events

### 3. Authorization Service Updated ([`authorizationService.ts`](afrdevgrp-react/src/services/authorizationService.ts))

- ✅ Added **makumbalionel@gmail.com** to authorized list

---

## 🚀 Deploy Rules NOW

### Option 1: Quick Deploy (Recommended)

```bash
cd afrdevgrp-react
firebase deploy --only firestore:rules,storage:rules
```

**This will deploy both rule files in ~30 seconds.**

### Option 2: Manual Deploy via Console

#### Deploy Storage Rules:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: **adg-columbia-13d72**
3. Click **Storage** → **Rules** tab
4. Copy entire content from [`storage.rules`](storage.rules)
5. Paste and click **Publish**

#### Deploy Firestore Rules:

1. In Firebase Console, click **Firestore Database** → **Rules** tab
2. Copy entire content from [`firestore.rules`](firestore.rules)
3. Paste and click **Publish**

---

## 🔍 What Changed in the Rules

### Storage Rules Changes:

**Before:**

```javascript
// Rules didn't exist or were incomplete
```

**After:**

```javascript
// Only authorized emails can upload
function isAuthorizedEmail() {
  return (
    isAuthenticated() &&
    (request.auth.token.email == "adg.columbia@gmail.com" ||
      request.auth.token.email == "em3820@columbia.edu" ||
      request.auth.token.email == "fg2571@barnard.edu" ||
      request.auth.token.email == "makumbalionel@gmail.com")
  );
}

// Validates both images and videos
function isValidMedia() {
  return isValidImage() || isValidVideo();
}
```

### Firestore Rules Changes:

**Before (WRONG):**

```javascript
// Expected comments in subcollections
match /reels/{reelId}/comments/{commentId} {
  allow create: if isAuthenticated();
}
```

**After (CORRECT):**

```javascript
// Comments are arrays in the main document
match /reels/{reelId} {
  allow read: if true;
  allow create: if isAuthorizedEmail();
  allow update: if isAuthenticated() || isAuthorizedEmail();
  // ↑ Allows ANY authenticated user to add comments via arrayUnion
}
```

---

## ✅ Verification Steps

After deploying, test these scenarios:

### 1. Test Video Upload (makumbalionel@gmail.com)

```
✅ Sign in as makumbalionel@gmail.com
✅ Upload a video file
✅ Should succeed without errors
```

### 2. Test Photo Upload (makumbalionel@gmail.com)

```
✅ Sign in as makumbalionel@gmail.com
✅ Upload a photo for reel or event
✅ Should succeed without errors
```

### 3. Test Comments (Any authenticated user)

```
✅ Sign in with any email
✅ Add a comment to a reel
✅ Should succeed
```

### 4. Test Unauthorized Upload

```
✅ Sign in with non-authorized email
✅ Try to upload reel/event
❌ Should show authorization error (expected)
```

---

## 🐛 Troubleshooting

### "Permission Denied" After Deployment

**Cause:** Rules not yet propagated or user not properly authenticated

**Solutions:**

1. Wait 60 seconds after publishing
2. Hard refresh browser (Ctrl+Shift+R)
3. Sign out and sign back in
4. Check browser console for exact error

### "Storage/Unauthorized" Error

**Cause:** User email not in authorized list or not authenticated

**Check:**

```javascript
// In browser console:
console.log(auth.currentUser?.email);
// Should show: makumbalionel@gmail.com or other authorized email
```

**Fix:**

- Ensure user is signed in with Firebase Auth
- Verify email is in the authorized list in [`storage.rules`](storage.rules) lines 13-17

### "Invalid Argument" Error

**Cause:** File size exceeds limits or wrong file type

**Limits:**

- Images: 10MB maximum
- Videos: 100MB maximum
- Only image/_ and video/_ types allowed

**Fix:** Compress files before uploading

### Comments Not Working

**Cause:** Firestore rules not deployed or user not authenticated

**Check:**

1. Verify Firestore rules are published in console
2. Ensure user is signed in
3. Check that reels collection allows updates

---

## 📊 Current Configuration

### Authorized Emails:

- adg.columbia@gmail.com ✅
- em3820@columbia.edu ✅
- fg2571@barnard.edu ✅
- **makumbalionel@gmail.com** ✅ (newly added)

### File Limits:

- **Images:** 10MB
- **Videos:** 100MB

### Permissions:

| Action            | Authorized Emails | Any Authenticated | Public |
| ----------------- | ----------------- | ----------------- | ------ |
| Upload Reel/Event | ✅                | ❌                | ❌     |
| Add Comment       | ✅                | ✅                | ❌     |
| Like/View         | ✅                | ✅                | ✅     |
| Read Content      | ✅                | ✅                | ✅     |

---

## 📝 Adding More Authorized Emails Later

To add more authorized emails:

1. Edit [`storage.rules`](storage.rules) (lines 13-17)
2. Edit [`firestore.rules`](firestore.rules) (lines 12-16)
3. Edit [`authorizationService.ts`](afrdevgrp-react/src/services/authorizationService.ts) (line 9-15)
4. Deploy: `firebase deploy --only firestore:rules,storage:rules`

---

## 🎯 Summary

**What you need to do:**

1. ✅ Run: `cd afrdevgrp-react && firebase deploy --only firestore:rules,storage:rules`
2. ✅ Wait 60 seconds
3. ✅ Sign in as makumbalionel@gmail.com
4. ✅ Test video and photo uploads
5. ✅ Verify everything works

**Expected Result:**

- makumbalionel@gmail.com can upload videos and photos ✅
- Any authenticated user can comment ✅
- Everyone can view content ✅

---

**Last Updated:** 2025-11-21  
**Project:** adg-columbia-13d72  
**Status:** Ready to Deploy ✅
