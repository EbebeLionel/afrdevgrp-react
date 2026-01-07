# 🚀 Deploy Firebase Rules - Step-by-Step Guide

## 📋 Overview

This guide will help you deploy the updated Firebase Security Rules that support:

- ✅ **Video and photo uploads** for reels
- ✅ **Photo uploads** for events
- ✅ **Comments and captions** for reels
- ✅ **Authorization** for makumbalionel@gmail.com

---

## 🎯 Quick Deploy (Recommended)

If you have Firebase CLI installed, you can deploy both rules files at once:

```bash
cd afrdevgrp-react
firebase deploy --only firestore:rules,storage:rules
```

**That's it!** The rules will be deployed in about 30 seconds.

---

## 📖 Manual Deployment (Firebase Console)

If you prefer to use the Firebase Console or don't have Firebase CLI installed:

### Step 1: Deploy Storage Rules

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **adg-columbia-13d72**
3. Click **Storage** in the left sidebar
4. Click the **Rules** tab
5. **Delete all existing rules**
6. Open the file [`storage.rules`](storage.rules) in your editor
7. **Copy the entire content**
8. Paste into the Firebase Console editor
9. Click **Publish**
10. Wait 30-60 seconds for propagation

### Step 2: Deploy Firestore Rules

1. In Firebase Console, click **Firestore Database** in the left sidebar
2. Click the **Rules** tab
3. **Delete all existing rules**
4. Open the file [`firestore.rules`](firestore.rules) in your editor
5. **Copy the entire content**
6. Paste into the Firebase Console editor
7. Click **Publish**
8. Wait 30-60 seconds for propagation

---

## 🔧 Installing Firebase CLI (If Needed)

If you want to use the quick deploy method but don't have Firebase CLI:

### Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Login to Firebase

```bash
firebase login
```

### Initialize Firebase (if not already done)

```bash
cd afrdevgrp-react
firebase init
```

Select:

- ✅ Firestore
- ✅ Storage
- ✅ Hosting

### Deploy Rules

```bash
firebase deploy --only firestore:rules,storage:rules
```

---

## 🔐 What These Rules Do

### Storage Rules ([`storage.rules`](storage.rules))

#### **For Reels:**

- ✅ **Accepts both videos and photos**
- ✅ Videos: Up to 100MB
- ✅ Images: Up to 10MB
- ✅ Authorized emails only can upload
- ✅ Public can view (read access)

#### **For Events:**

- ✅ **Accepts photos only**
- ✅ Images: Up to 10MB
- ✅ Authorized emails only can upload
- ✅ Public can view (read access)

#### **Authorized Emails:**

- adg.columbia@gmail.com
- em3820@columbia.edu
- fg2571@barnard.edu
- **makumbalionel@gmail.com** ⭐ (newly added)

### Firestore Rules ([`firestore.rules`](firestore.rules))

#### **For Reels Collection:**

- ✅ Anyone can read reels
- ✅ Authorized emails can create/update/delete reels
- ✅ **Comments subcollection:**
  - Anyone can read comments
  - Any authenticated user can post comments
  - Users can edit/delete their own comments
  - Authorized emails can delete any comment
- ✅ **Captions subcollection:**
  - Anyone can read captions
  - Only authorized emails can create/edit/delete captions
- ✅ **Likes subcollection:**
  - Anyone can read likes
  - Authenticated users can like/unlike

#### **For Events Collection:**

- ✅ Anyone can read events
- ✅ Only authorized emails can create/update/delete events

---

## ✅ Verification Steps

After deploying, verify everything works:

### 1. Test Video Upload

```javascript
// Upload a video file for a reel
// Should succeed if logged in as authorized email
```

### 2. Test Photo Upload

```javascript
// Upload a photo for an event or reel
// Should succeed if logged in as authorized email
```

### 3. Test Comment Creation

```javascript
// Add a comment to a reel
// Should work for any authenticated user
```

### 4. Test Unauthorized Access

```javascript
// Try to upload with a non-authorized email
// Should fail with permission error (expected behavior)
```

---

## 🆘 Troubleshooting

### "Permission Denied" Errors

**Cause:** User is not properly authenticated or not using an authorized email.

**Solutions:**

1. Make sure the user is signed in with Firebase Auth
2. Verify the email is in the authorized list
3. Check that `request.auth.token.email` matches one of the authorized emails

### "File Too Large" Errors

**File Size Limits:**

- Images: 10MB maximum
- Videos: 100MB maximum

**Solution:** Compress files before uploading or increase limits in the rules files.

### Rules Not Taking Effect

**Wait Time:** Rules can take 30-60 seconds to propagate.

**Solutions:**

1. Wait at least 1 minute after publishing
2. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)
3. Clear browser cache
4. Check Firebase Console for successful deployment timestamp

### Wrong Content Type Error

**Cause:** File type not supported (only images and videos allowed).

**Accepted Types:**

- **Images:** image/jpeg, image/png, image/gif, image/webp, etc.
- **Videos:** video/mp4, video/webm, video/quicktime, etc.

**Solution:** Convert files to supported formats.

---

## 📱 Testing with Different Users

### Authorized User (Can Upload)

```javascript
// Sign in as: makumbalionel@gmail.com
// Try uploading a video → ✅ Should work
// Try uploading a photo → ✅ Should work
```

### Regular User (Can Comment)

```javascript
// Sign in with any authenticated email
// Try uploading → ❌ Should fail (not authorized)
// Try commenting → ✅ Should work
```

### Public User (Can View)

```javascript
// Don't sign in
// Try viewing reels → ✅ Should work
// Try uploading → ❌ Should fail (not authenticated)
```

---

## 🔄 Updating Rules Later

### To Add More Authorized Emails:

1. Edit [`storage.rules`](storage.rules) line 13-17
2. Edit [`firestore.rules`](firestore.rules) line 12-16
3. Add new email to both files
4. Deploy again: `firebase deploy --only firestore:rules,storage:rules`

### To Change File Size Limits:

1. Edit [`storage.rules`](storage.rules) line 23 (images) or line 29 (videos)
2. Deploy: `firebase deploy --only storage:rules`

---

## 📊 Rule File Locations

- **Storage Rules:** [`afrdevgrp-react/storage.rules`](storage.rules)
- **Firestore Rules:** [`afrdevgrp-react/firestore.rules`](firestore.rules)
- **Configuration:** [`afrdevgrp-react/firebase.json`](firebase.json)

---

## 🎉 Success Indicators

You'll know the deployment was successful when:

1. ✅ Firebase Console shows recent timestamp for rules
2. ✅ Video files upload without errors
3. ✅ Photo files upload without errors
4. ✅ Comments can be added to reels
5. ✅ Captions work properly
6. ✅ makumbalionel@gmail.com can upload content

---

## 📞 Need Help?

If you encounter issues:

1. Check the browser console (F12) for detailed error messages
2. Verify Firebase project ID matches: **adg-columbia-13d72**
3. Ensure Firebase Auth is properly configured
4. Check that user email is verified
5. Review the troubleshooting section above

---

**Last Updated:** 2025-11-21  
**Project:** adg-columbia-13d72  
**Status:** Ready to Deploy ✅
