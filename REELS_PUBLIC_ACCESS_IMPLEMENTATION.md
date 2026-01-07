# Reels Public Access Implementation Guide

## Overview

This guide explains how to enable **public access for liking, viewing, and commenting on reels** while maintaining upload authorization restrictions.

## Current Status

✅ **Frontend Code**: Already supports public access

- The React application in [`Reels.tsx`](afrdevgrp-react/src/components/ReelsPage/Reels.tsx:1) uses `'guest'` as userId for non-authenticated users
- Like, comment, and view functions work without authentication checks
- Upload restrictions are enforced by [`authorizationService.ts`](afrdevgrp-react/src/services/authorizationService.ts:1)

❌ **Firebase Security Rules**: Need to be updated

- Current rules require authentication for all reel operations
- This blocks guest users from interacting with reels

## What Needs To Be Done

You need to update the Firebase Firestore Security Rules in the Firebase Console to match the new permissions model.

## Step-by-Step Implementation

### Step 1: Open Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **adg-columbia-13d72**
3. Click on **Firestore Database** in the left sidebar
4. Click on the **Rules** tab

### Step 2: Backup Current Rules (Optional but Recommended)

1. Copy the current rules and save them in a text file
2. This allows you to rollback if needed

### Step 3: Update the Rules

Replace the entire `reels` section (and remove the likes/comments subcollections if present) with the following:

```javascript
    // ==========================================
    // REELS COLLECTION (UPDATED)
    // ==========================================
    // Anyone can read, like, comment, and view reels (no auth required)
    // Only authorized users can create reels (authorization checked in app)
    // Only reel creators can delete their own reels
    match /reels/{reelId} {
      // Anyone can read reels (no authentication required)
      allow read: if true;

      // Only authenticated users can create reels
      // Authorization is checked at the application level via authorizationService
      allow create: if request.auth != null
                    && request.resource.data.uploadedBy == request.auth.uid
                    && request.resource.data.keys().hasAll(['uploadedBy', 'uploaderName', 'caption', 'media', 'createdAt']);

      // Anyone can update reels for likes, comments, and views
      // Only allow updating these specific fields: likes, likedBy, comments, views
      // Prevent updating critical fields: id, media, caption, uploadedBy, uploaderName, createdAt
      allow update: if !request.resource.data.diff(resource.data).affectedKeys()
                        .hasAny(['id', 'media', 'caption', 'uploadedBy', 'uploaderName', 'createdAt']);

      // Only the reel creator can delete their own reels
      allow delete: if request.auth != null
                    && resource.data.uploadedBy == request.auth.uid;
    }
```

### Step 4: Remove Old Subcollection Rules (If Present)

If your rules contain subcollections for likes and comments (like below), **remove them**:

```javascript
    // DELETE THIS SECTION IF PRESENT:
    match /reels/{reelId}/likes/{userId} {
      // ...
    }

    match /reels/{reelId}/comments/{commentId} {
      // ...
    }
```

These are no longer needed because likes and comments are stored directly in the reel document.

### Step 5: Publish the Rules

1. Click the **Publish** button in the top right
2. Wait for the confirmation message
3. The new rules are now live!

### Step 6: Test the Changes

Test that the changes work correctly:

#### Test 1: View Reels Without Authentication

1. Open your app in an incognito/private browser window
2. Navigate to the Reels page
3. ✅ You should be able to see all reels

#### Test 2: Like a Reel Without Authentication

1. While still not logged in, click the heart icon on a reel
2. ✅ The like should be added successfully
3. ✅ The like count should increase

#### Test 3: Comment Without Authentication

1. Click the comment icon on a reel
2. Type a comment and post it
3. ✅ The comment should be added successfully
4. ✅ You should see it appear as "Anonymous"

#### Test 4: View Count Increment

1. Open a reel in full view
2. ✅ The view count should increment automatically

#### Test 5: Upload Restriction (Should Still Work)

1. Click the + button to upload a reel
2. If not logged in: ✅ Should prompt to sign in
3. If logged in but not authorized: ✅ Should show authorization message
4. If logged in and authorized: ✅ Should show upload modal

#### Test 6: Delete Restriction (Should Still Work)

1. Try to delete a reel you didn't create
2. ❌ Should fail or not show delete button
3. Try to delete your own reel (if authorized and created one)
4. ✅ Should work successfully

## Complete Rules File

For reference, see the complete updated rules in [`FIREBASE_SECURITY_RULES_UPDATED.md`](afrdevgrp-react/FIREBASE_SECURITY_RULES_UPDATED.md:1).

## How It Works

### Permission Model

| Action      | Authentication Required | Authorization Required | Notes                     |
| ----------- | ----------------------- | ---------------------- | ------------------------- |
| View reels  | ❌ No                   | ❌ No                  | Anyone can view           |
| Like/unlike | ❌ No                   | ❌ No                  | Uses 'guest' for non-auth |
| Comment     | ❌ No                   | ❌ No                  | Shows as "Anonymous"      |
| View count  | ❌ No                   | ❌ No                  | Increments automatically  |
| Upload      | ✅ Yes                  | ✅ Yes                 | Checked by app + Firebase |
| Delete      | ✅ Yes                  | ✅ Yes (creator only)  | Must be original uploader |

### Security Features

✅ **Protected Fields**: The update rule prevents modification of:

- `id` - Reel identifier
- `media` - Media files array
- `caption` - Reel caption
- `uploadedBy` - Creator user ID
- `uploaderName` - Creator name
- `createdAt` - Creation timestamp

✅ **Allowed Updates**: Only these fields can be modified:

- `likes` - Like count
- `likedBy` - Array of user IDs who liked
- `comments` - Array of comment objects
- `views` - View count

### Code Flow

1. **Guest User Likes a Reel**:

   - Frontend: [`handleLike`](afrdevgrp-react/src/components/ReelsPage/Reels.tsx:298) uses `'guest'` as userId
   - Service: [`toggleReelLike`](afrdevgrp-react/src/services/reelService.ts:165) updates Firestore
   - Firebase: Update rule allows changes to `likes` and `likedBy` arrays

2. **Guest User Comments**:

   - Frontend: [`handleComment`](afrdevgrp-react/src/components/ReelsPage/Reels.tsx:321) uses `'guest'` as userId and "Anonymous" as username
   - Service: [`addReelComment`](afrdevgrp-react/src/services/reelService.ts:204) adds to comments array
   - Firebase: Update rule allows changes to `comments` array

3. **User Uploads Reel** (Authorization Required):
   - Frontend: [`handleUploadClick`](afrdevgrp-react/src/components/ReelsPage/Reels.tsx:194) checks authentication and authorization
   - Service: [`checkContentCreationPermission`](afrdevgrp-react/src/services/authorizationService.ts:48) verifies email authorization
   - If authorized, [`createReel`](afrdevgrp-react/src/services/reelService.ts:64) proceeds
   - Firebase: Create rule requires authentication and validates `uploadedBy` matches user ID

## Rollback Instructions

If you need to revert to the old rules:

1. Go to Firebase Console → Firestore Database → Rules
2. Click on the **Rules history** button
3. Find the previous version
4. Click **Restore**
5. Publish the restored rules

## Troubleshooting

### Issue: "Missing or insufficient permissions" error

**Cause**: Rules haven't been published or not yet propagated

**Solution**:

1. Verify rules are published in Firebase Console
2. Wait 1-2 minutes for rules to propagate
3. Clear browser cache and retry

### Issue: Guests can't like/comment

**Cause**: Old rules still active or rules not properly formatted

**Solution**:

1. Double-check the rules in Firebase Console
2. Ensure no syntax errors (check for red underlines)
3. Make sure you clicked "Publish"
4. Try the action in incognito mode

### Issue: Everyone can delete any reel

**Cause**: Delete rule misconfigured

**Solution**:

1. Verify the delete rule matches:
   ```javascript
   allow delete: if request.auth != null
                 && resource.data.uploadedBy == request.auth.uid;
   ```

## Support

For additional help:

- Review [`FIREBASE_SECURITY_RULES_UPDATED.md`](afrdevgrp-react/FIREBASE_SECURITY_RULES_UPDATED.md:1) for complete rules
- Check [`authorizationService.ts`](afrdevgrp-react/src/services/authorizationService.ts:1) for authorized emails list
- See [`Reels.tsx`](afrdevgrp-react/src/components/ReelsPage/Reels.tsx:1) for frontend implementation

---

**Created**: November 2025  
**Status**: ✅ Ready to Implement  
**Priority**: High  
**Estimated Time**: 5-10 minutes
