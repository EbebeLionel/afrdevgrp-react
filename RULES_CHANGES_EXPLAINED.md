# Firestore Rules Changes Explained

## What Changed and Why

### Problem Identified

Your current Firestore rules have **subcollections** for comments and likes:

```javascript
match /reels/{reelId}/comments/{commentId} { ... }
match /reels/{reelId}/likes/{likeId} { ... }
```

But your application code stores comments and likes **directly in the reel document** as arrays, NOT as subcollections. See:

- [`Reels.tsx` line 305-315](afrdevgrp-react/src/components/ReelsPage/Reels.tsx:305) - likes stored in reel document
- [`Reels.tsx` line 321-334](afrdevgrp-react/src/components/ReelsPage/Reels.tsx:321) - comments stored in reel document
- [`reelService.ts` line 165-194](afrdevgrp-react/src/services/reelService.ts:165) - toggleReelLike updates reel document
- [`reelService.ts` line 204-230](afrdevgrp-react/src/services/reelService.ts:204) - addReelComment updates reel document

### The Mismatch

**Current Rules Say**: "Comments and likes are in subcollections"
**Your Code Does**: "Comments and likes are arrays in the reel document"

**Result**: The rules don't match your code structure!

## Changes Made

### 1. Removed Subcollections (Not Used)

```diff
- match /reels/{reelId}/comments/{commentId} { ... }
- match /reels/{reelId}/likes/{likeId} { ... }
```

These aren't needed since your code doesn't use subcollections.

### 2. Updated Reel Update Rule

**OLD** (Only creator can update):

```javascript
allow update: if isAuthenticated()
              && resource.data.uploadedBy == request.auth.uid;
```

**NEW** (Anyone can update, but only specific fields):

```javascript
allow update: if !request.resource.data.diff(resource.data).affectedKeys()
                  .hasAny(['id', 'media', 'caption', 'uploadedBy', 'uploaderName', 'createdAt']);
```

This means:

- ✅ Anyone can update `likes`, `likedBy`, `comments`, `views`
- ❌ No one can update `id`, `media`, `caption`, `uploadedBy`, `uploaderName`, `createdAt`

### 3. Enhanced Create Rule

**OLD**:

```javascript
allow create: if isAuthenticated();
```

**NEW**:

```javascript
allow create: if isAuthenticated()
              && request.resource.data.uploadedBy == request.auth.uid;
```

This ensures the creator ID matches the authenticated user.

## Complete Updated Rules

Copy and paste these into Firebase Console → Firestore Database → Rules:

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
    // REELS COLLECTION - UPDATED FOR PUBLIC ACCESS
    // ============================================
    match /reels/{reelId} {
      // Anyone can read reels (public content)
      allow read: if true;

      // Only authenticated users can create reels
      allow create: if isAuthenticated()
                    && request.resource.data.uploadedBy == request.auth.uid;

      // Anyone can update reels for likes, comments, and views
      // But protect critical fields from modification
      allow update: if !request.resource.data.diff(resource.data).affectedKeys()
                        .hasAny(['id', 'media', 'caption', 'uploadedBy', 'uploaderName', 'createdAt']);

      // Only the reel creator can delete their reel
      allow delete: if isAuthenticated()
                    && resource.data.uploadedBy == request.auth.uid;
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

## How This Synchronizes with Storage Rules

### Storage Rules (Your Current - Keep These)

```javascript
// Anyone can view reel media files
allow read: if true;

// Only the reel creator can upload media
allow create: if isOwner(userId) && isValidMedia();
```

### Firestore Rules (Updated - Use These)

```javascript
// Anyone can view reel data
allow read: if true;

// Anyone can update likes/comments/views
allow update: if !request.resource.data.diff(resource.data).affectedKeys()
                  .hasAny(['id', 'media', 'caption', 'uploadedBy', 'uploaderName', 'createdAt']);
```

**Result**: Both systems now allow public viewing and interaction!

## Permission Matrix

| Action          | Storage Rule  | Firestore Rule   | Result             |
| --------------- | ------------- | ---------------- | ------------------ |
| View reel media | ✅ Public     | ✅ Public        | Anyone can view    |
| View reel data  | N/A           | ✅ Public        | Anyone can view    |
| Like reel       | N/A           | ✅ Public        | Anyone can like    |
| Comment         | N/A           | ✅ Public        | Anyone can comment |
| View count      | N/A           | ✅ Public        | Auto-increments    |
| Upload media    | 🔒 Owner only | N/A              | Auth required      |
| Create reel     | N/A           | 🔒 Auth required | Auth required      |
| Delete media    | 🔒 Owner only | N/A              | Owner only         |
| Delete reel     | N/A           | 🔒 Owner only    | Owner only         |

## Testing After Update

1. **Test without login** (incognito mode):

   - ✅ View reels
   - ✅ Like reels (uses 'guest' userId)
   - ✅ Add comments (shows as "Anonymous")
   - ✅ View count increments

2. **Test with login** (but not authorized):

   - ✅ All above actions work
   - ❌ Cannot upload reels (authorization check in app)

3. **Test with authorized account**:
   - ✅ Can upload reels
   - ✅ Can delete own reels
   - ❌ Cannot delete others' reels

## Next Steps

1. Copy the rules from [`FIRESTORE_RULES_FINAL.txt`](FIRESTORE_RULES_FINAL.txt)
2. Paste into Firebase Console → Firestore Database → Rules
3. Click **Publish**
4. Test the changes using the checklist above

---

**Key Benefit**: Rules now match your code structure and allow public interaction! 🎉
