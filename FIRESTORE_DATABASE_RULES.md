# 🔥 Firestore Database Rules - APPLY THESE NOW

## ⚠️ Critical: You Need TWO Sets of Rules

Your app uses:

1. **Firebase Storage** (for photos/videos) ← You may have applied these
2. **Firestore Database** (for event/reel data) ← YOU NEED TO APPLY THESE NOW

The error `Missing or insufficient permissions` means your **Firestore Database Rules** are blocking writes.

---

## 🚀 APPLY THESE FIRESTORE RULES NOW

### Step 1: Open Firestore Rules

1. **Firebase Console** → [console.firebase.google.com](https://console.firebase.google.com)
2. Select project: **adg-columbia-13d72**
3. Click **Firestore Database** (NOT Storage!) in left sidebar
4. Click the **Rules** tab
5. **Delete all existing rules**

### Step 2: Copy & Paste These Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper function to check if user owns the document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // ============================================
    // USERS COLLECTION
    // ============================================
    match /users/{userId} {
      // Anyone can read user profiles
      allow read: if true;

      // Users can create and update their own profile
      allow create, update: if isOwner(userId);

      // Users can delete their own profile
      allow delete: if isOwner(userId);
    }

    // ============================================
    // EVENTS COLLECTION
    // ============================================
    match /events/{eventId} {
      // Anyone can read events (public content)
      allow read: if true;

      // Only authenticated users can create events
      allow create: if isAuthenticated();

      // Only the event creator can update their event
      allow update: if isAuthenticated()
                    && resource.data.uploadedBy == request.auth.uid;

      // Only the event creator can delete their event
      allow delete: if isAuthenticated()
                    && resource.data.uploadedBy == request.auth.uid;
    }

    // ============================================
    // REELS COLLECTION
    // ============================================
    match /reels/{reelId} {
      // Anyone can read reels (public content)
      allow read: if true;

      // Only authenticated users can create reels
      allow create: if isAuthenticated();

      // Only the reel creator can update their reel
      allow update: if isAuthenticated()
                    && resource.data.uploadedBy == request.auth.uid;

      // Only the reel creator can delete their reel
      allow delete: if isAuthenticated()
                    && resource.data.uploadedBy == request.auth.uid;

      // ============================================
      // COMMENTS SUBCOLLECTION
      // ============================================
      match /comments/{commentId} {
        // Anyone can read comments
        allow read: if true;

        // Only authenticated users can create comments
        allow create: if isAuthenticated();

        // Only comment author can update/delete
        allow update, delete: if isAuthenticated()
                              && resource.data.userId == request.auth.uid;
      }

      // ============================================
      // LIKES SUBCOLLECTION
      // ============================================
      match /likes/{likeId} {
        // Anyone can read likes
        allow read: if true;

        // Authenticated users can create likes
        allow create: if isAuthenticated();

        // Users can delete their own likes
        allow delete: if isAuthenticated();
      }
    }

    // ============================================
    // DENY ALL OTHER COLLECTIONS
    // ============================================
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Step 3: Publish the Rules

1. Click **Publish** button
2. Wait for "Rules published successfully" message
3. Wait 30-60 seconds for propagation

---

## ✅ What These Rules Do

### Events Collection:

- ✅ Anyone can **read** events (public access)
- ✅ Authenticated users can **create** events
- ✅ Only event creator can **update/delete** their events
- ✅ Validates ownership using `uploadedBy` field

### Reels Collection:

- ✅ Anyone can **read** reels (public access)
- ✅ Authenticated users can **create** reels
- ✅ Only reel creator can **update/delete** their reels
- ✅ Comments and likes properly secured

### Users Collection:

- ✅ Anyone can **read** user profiles
- ✅ Users can only modify their **own** profile
- ✅ Ownership validated by user ID

---

## 🔄 Complete Setup Checklist

You need to apply rules to **BOTH** services:

### ✅ Firestore Database Rules (DO THIS FIRST)

- [ ] Firebase Console → **Firestore Database** → Rules
- [ ] Copy rules from above
- [ ] Click Publish
- [ ] Wait 60 seconds

### ✅ Firebase Storage Rules (DO THIS SECOND)

- [ ] Firebase Console → **Storage** → Rules
- [ ] Copy rules from [`FIREBASE_STORAGE_RULES_EMAIL_AUTH.md`](FIREBASE_STORAGE_RULES_EMAIL_AUTH.md)
- [ ] Click Publish
- [ ] Wait 60 seconds

---

## 🧪 Test After Applying

1. **Sign in** with adg.columbia@gmail.com
2. **Try to upload an event**
   - Should work ✅
   - Check browser console - no errors
3. **Check Firebase Console**
   - Firestore Database → events collection → see new event
   - Storage → events folder → see uploaded photo

---

## 🆘 If Still Getting Errors

### Error: "Missing or insufficient permissions"

**After applying Firestore rules:**

1. Wait full 60 seconds
2. Hard refresh browser (Ctrl+Shift+R)
3. Clear browser cache
4. Try again

**Check these:**

- [ ] Rules applied to **Firestore Database** (not Storage)
- [ ] Rules have `allow create: if isAuthenticated()`
- [ ] User is signed in with Firebase Auth
- [ ] Waited 60 seconds after publishing

### Error: "storage/unauthorized"

This is a **different error** - means Storage Rules not applied.

**Solution:**

- Apply Storage Rules from [`FIREBASE_STORAGE_RULES_EMAIL_AUTH.md`](FIREBASE_STORAGE_RULES_EMAIL_AUTH.md)

---

## 📊 Rules Summary

| Service                | Location                   | Purpose         | Status        |
| ---------------------- | -------------------------- | --------------- | ------------- |
| **Firestore Database** | Firestore Database → Rules | Event/Reel data | ⚠️ Apply now  |
| **Firebase Storage**   | Storage → Rules            | Photos/Videos   | ⚠️ Apply next |

---

## 🎯 Quick Fix Summary

**Your current error:**

```
FirebaseError: Missing or insufficient permissions
```

**Root cause:**
Firestore Database Rules not applied

**Solution:**

1. Go to Firebase Console
2. Click **Firestore Database** (left sidebar)
3. Click **Rules** tab
4. Paste the rules from above
5. Click **Publish**
6. Wait 60 seconds
7. Try uploading again

**Expected result:**
✅ Upload succeeds without errors

---

**Created**: 2025-11-10  
**Priority**: 🔴 CRITICAL - Apply immediately  
**Fixes Error**: "Missing or insufficient permissions"
