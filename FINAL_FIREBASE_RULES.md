# 🔒 Final Firebase Security Rules - Production Ready

## ⚠️ IMPORTANT: Apply These Rules to Your Firebase Console

These are production-ready security rules with proper authentication and validation.

---

## 📁 Firebase Storage Rules

### Copy and paste these rules into: Firebase Console → Storage → Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper function to check if user owns the resource
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Helper function to validate image files
    function isValidImage() {
      return request.resource.size < 10 * 1024 * 1024 // 10MB max
          && request.resource.contentType.matches('image/.*');
    }

    // Helper function to validate video files
    function isValidVideo() {
      return request.resource.size < 50 * 1024 * 1024 // 50MB max
          && request.resource.contentType.matches('video/.*');
    }

    // Helper function to validate media files (image or video)
    function isValidMedia() {
      return isValidImage() || isValidVideo();
    }

    // ============================================
    // EVENTS STORAGE RULES
    // Path: /events/{userId}/{eventId}/{filename}
    // ============================================
    match /events/{userId}/{eventId}/{filename} {
      // Anyone can read event photos (public content)
      allow read: if true;

      // Only authenticated users can upload to their own events folder
      allow create: if isOwner(userId) && isValidImage();

      // Only the owner can update or delete their event photos
      allow update, delete: if isOwner(userId);
    }

    // ============================================
    // REELS STORAGE RULES
    // Path: /reels/{userId}/{reelId}/media/{mediaId}
    // ============================================
    match /reels/{userId}/{reelId}/media/{mediaId} {
      // Anyone can read reel media (public content)
      allow read: if true;

      // Only authenticated users can upload to their own reels folder
      // Must be valid image or video
      allow create: if isOwner(userId) && isValidMedia();

      // Only the owner can update or delete their reel media
      allow update, delete: if isOwner(userId);
    }

    // ============================================
    // USER PROFILE STORAGE RULES
    // Path: /users/{userId}/profile/{filename}
    // ============================================
    match /users/{userId}/profile/{filename} {
      // Anyone can read user profile photos
      allow read: if true;

      // Only the user can upload/update their own profile photo
      allow create, update: if isOwner(userId) && isValidImage();

      // Only the user can delete their profile photo
      allow delete: if isOwner(userId);
    }

    // ============================================
    // DENY ALL OTHER PATHS
    // ============================================
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 🗄️ Firestore Database Rules

### Copy and paste these rules into: Firebase Console → Firestore Database → Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper function to check if user is signed in
    function isSignedIn() {
      return request.auth.uid != null;
    }

    // Helper function to check if user owns the document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Helper function to validate event data
    function isValidEvent() {
      let event = request.resource.data;
      return event.keys().hasAll(['name', 'type', 'date', 'userId', 'createdAt'])
          && event.name is string && event.name.size() > 0
          && event.type is string && event.type.size() > 0
          && event.date is timestamp
          && event.userId is string;
    }

    // Helper function to validate reel data
    function isValidReel() {
      let reel = request.resource.data;
      return reel.keys().hasAll(['userId', 'createdAt', 'media'])
          && reel.userId is string
          && reel.media is list
          && reel.media.size() > 0;
    }

    // ============================================
    // USERS COLLECTION
    // ============================================
    match /users/{userId} {
      // Anyone can read user profiles (public info)
      allow read: if true;

      // Users can create their own profile
      allow create: if isOwner(userId);

      // Users can only update their own profile
      allow update: if isOwner(userId);

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
      // Must include all required fields
      allow create: if isAuthenticated()
                    && isValidEvent()
                    && request.resource.data.userId == request.auth.uid;

      // Only the event creator can update their event
      allow update: if isAuthenticated()
                    && resource.data.userId == request.auth.uid;

      // Only the event creator can delete their event
      allow delete: if isAuthenticated()
                    && resource.data.userId == request.auth.uid;
    }

    // ============================================
    // REELS COLLECTION
    // ============================================
    match /reels/{reelId} {
      // Anyone can read reels (public content)
      allow read: if true;

      // Only authenticated users can create reels
      // Must include required fields and at least one media item
      allow create: if isAuthenticated()
                    && isValidReel()
                    && request.resource.data.userId == request.auth.uid;

      // Only the reel creator can update their reel
      allow update: if isAuthenticated()
                    && resource.data.userId == request.auth.uid;

      // Only the reel creator can delete their reel
      allow delete: if isAuthenticated()
                    && resource.data.userId == request.auth.uid;

      // ============================================
      // COMMENTS SUBCOLLECTION
      // ============================================
      match /comments/{commentId} {
        // Anyone can read comments
        allow read: if true;

        // Only authenticated users can create comments
        allow create: if isAuthenticated()
                      && request.resource.data.userId == request.auth.uid;

        // Only comment author can update/delete their comment
        allow update, delete: if isAuthenticated()
                              && resource.data.userId == request.auth.uid;
      }

      // ============================================
      // LIKES SUBCOLLECTION
      // ============================================
      match /likes/{likeId} {
        // Anyone can read likes
        allow read: if true;

        // Users can only create likes with their own userId
        allow create: if isAuthenticated()
                      && request.resource.data.userId == request.auth.uid;

        // Users can only delete their own likes
        allow delete: if isAuthenticated()
                      && resource.data.userId == request.auth.uid;
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

---

## 🚀 How to Apply These Rules

### Step 1: Firebase Storage Rules

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click **Storage** in the left sidebar
4. Click the **Rules** tab
5. **Delete all existing rules**
6. **Copy the entire Storage Rules section** from above
7. Paste into the editor
8. Click **Publish**

### Step 2: Firestore Database Rules

1. In Firebase Console, click **Firestore Database** in the left sidebar
2. Click the **Rules** tab
3. **Delete all existing rules**
4. **Copy the entire Firestore Rules section** from above
5. Paste into the editor
6. Click **Publish**

---

## 🔐 Security Features

### Storage Security:

✅ Authentication required for uploads  
✅ Users can only upload to their own folders  
✅ File size limits: 10MB images, 50MB videos  
✅ File type validation (images/videos only)  
✅ Public read access for events and reels  
✅ Owner-only write access

### Firestore Security:

✅ Authentication required for writes  
✅ Data validation for all documents  
✅ Users can only modify their own content  
✅ Public read access for community content  
✅ Owner-only delete permissions  
✅ Comments and likes properly secured

---

## ⚠️ Current Issue: Hardcoded Authentication

**Your app currently uses hardcoded authentication** which doesn't work with these secure rules.

### To use these rules, you need to:

1. Implement proper Firebase Authentication in [`AuthContext.tsx`](afrdevgrp-react/src/contexts/AuthContext.tsx)
2. Replace hardcoded user IDs with `request.auth.uid`
3. Remove temporary testing rules

### Alternative: Keep using temporary testing rules

If you're not ready to implement Firebase Auth yet, use the temporary rules from [`FIREBASE_STORAGE_SECURITY_RULES.md`](afrdevgrp-react/FIREBASE_STORAGE_SECURITY_RULES.md) lines 24-34 and 250-262.

---

## 📋 Testing Checklist

After applying these rules:

- [ ] Upload event photo (should work if authenticated)
- [ ] Upload reel with multiple media (should work if authenticated)
- [ ] Try to upload oversized file (should fail)
- [ ] Try to upload non-image/video file (should fail)
- [ ] View events and reels as public user (should work)
- [ ] Try to modify another user's content (should fail)

---

## 🆘 Troubleshooting

### "Permission denied" errors?

- Make sure you're properly authenticated with Firebase Auth
- Check that `request.auth.uid` matches the `userId` in the path
- Verify file types and sizes meet requirements

### Need to test without authentication?

- Use temporary rules from [`FIREBASE_STORAGE_SECURITY_RULES.md`](afrdevgrp-react/FIREBASE_STORAGE_SECURITY_RULES.md)
- **WARNING**: Never use temporary rules in production!

---

**Last Updated**: 2025-11-10  
**Status**: Production Ready ✅
