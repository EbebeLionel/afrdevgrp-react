# Firebase Firestore Security Rules for ADG Application (Updated)

## Overview

This document contains the **updated** Firebase Firestore Security Rules for the African Development Group (ADG) application. These rules have been modified to allow **anyone to like, view, and comment on reels** regardless of authentication or upload authorization, while maintaining security for other operations.

## Key Changes

- **Reels viewing**: Anyone can view reels (no authentication required)
- **Reels interactions**: Anyone can like, comment, and increment views on reels
- **Reels creation**: Only authenticated users with authorization can upload reels (checked at application level)
- **Reels deletion**: Only the reel creator can delete their own reels

## How to Apply These Rules

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **adg-columbia-13d72**
3. Navigate to **Firestore Database** in the left sidebar
4. Click on the **Rules** tab
5. Replace the existing rules with the code below
6. Click **Publish** to apply the changes

## Updated Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ==========================================
    // USERS COLLECTION
    // ==========================================
    // Users can only read and write their own user document
    // User documents are created during sign-up with their auth UID
    match /users/{userId} {
      // Allow users to read their own profile
      allow read: if request.auth != null && request.auth.uid == userId;

      // Allow users to create their profile during sign-up
      // Ensure the document ID matches their auth UID
      allow create: if request.auth != null
                    && request.auth.uid == userId
                    && request.resource.data.keys().hasAll(['email', 'name', 'birthday', 'school', 'createdAt'])
                    && request.resource.data.email == request.auth.token.email;

      // Allow users to update their own profile
      // Prevent changing critical fields like uid and email
      allow update: if request.auth != null
                    && request.auth.uid == userId
                    && request.resource.data.uid == resource.data.uid
                    && request.resource.data.email == resource.data.email;

      // Prevent users from deleting their profile
      // (Delete through Firebase Console if needed)
      allow delete: if false;
    }

    // ==========================================
    // EVENTS COLLECTION
    // ==========================================
    // All authenticated users can read events
    // Only admin users can create, update, or delete events
    match /events/{eventId} {
      // Any authenticated user can read events
      allow read: if request.auth != null;

      // Only admin users can write events
      // Admin status is stored in the user's document
      allow create, update: if request.auth != null
                            && exists(/databases/$(database)/documents/users/$(request.auth.uid))
                            && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;

      // Only admin users can delete events
      allow delete: if request.auth != null
                    && exists(/databases/$(database)/documents/users/$(request.auth.uid))
                    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

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
  }
}
```

## Rule Explanations

### Users Collection (No Changes)

- **Read**: Users can only read their own profile data
- **Create**: Users can create their profile during sign-up (document ID must match their Auth UID)
- **Update**: Users can update their own profile (cannot change UID or email)
- **Delete**: Users cannot delete their profiles (must be done by admin through console)

### Events Collection (No Changes)

- **Read**: Any authenticated user can view events
- **Write**: Only users with `isAdmin: true` in their user document can create/update/delete events

### Reels Collection (UPDATED)

- **Read**: **Anyone can read reels** - no authentication required
- **Create**: Only authenticated users can create reels (authorization checked at application level by [`authorizationService.ts`](afrdevgrp-react/src/services/authorizationService.ts:1))
- **Update**: **Anyone can update reels** for likes, comments, and views - but only these specific fields can be changed
- **Delete**: Only the reel creator can delete their own reels

### Removed Subcollections

The previous subcollections for likes and comments have been removed because the current implementation stores likes and comments directly in the reel document as arrays. This simplifies the security rules and improves performance.

## Data Structure Requirements

### User Document (`users/{userId}`)

Required fields:

- `uid`: string (Firebase Auth UID)
- `email`: string (user's email)
- `name`: string (full name)
- `birthday`: string (date in YYYY-MM-DD format)
- `school`: string (school name)
- `createdAt`: timestamp

Optional fields:

- `isAdmin`: boolean (defaults to false)

### Event Document (`events/{eventId}`)

Required fields:

- `name`: string
- `description`: string
- `date`: string
- `time`: string
- `imageUrl`: string
- `status`: string ('ongoing', 'upcoming', or 'past')
- `isMajor`: boolean
- `link`: string (optional)

### Reel Document (`reels/{reelId}`) - UPDATED

Required fields:

- `id`: string (reel ID)
- `media`: array of objects (each with `id`, `type`, `url`, `order`)
- `caption`: string
- `uploadedBy`: string (UID of creator)
- `uploaderName`: string
- `likes`: number
- `likedBy`: array of strings (user IDs or 'guest')
- `comments`: array of objects (each with `id`, `userId`, `username`, `text`, `createdAt`)
- `views`: number
- `createdAt`: timestamp

## Authorization Flow

### For Viewing/Liking/Commenting

1. No authentication required
2. Users (including guests) can:
   - View all reels
   - Like/unlike reels (using userId or 'guest')
   - Add comments
   - Increment view counts

### For Uploading Reels

1. User must be authenticated (Firebase Auth)
2. Application checks authorization via [`authorizationService.ts`](afrdevgrp-react/src/services/authorizationService.ts:1)
3. Only emails in the authorized list can upload
4. Firebase rules verify the user is authenticated and matches the `uploadedBy` field

### For Deleting Reels

1. User must be authenticated
2. User must be the original uploader (checked via `uploadedBy` field)
3. Authorization level is also checked in the application

## Testing the Rules

You can test these rules in the Firebase Console:

1. Go to Firestore Database → Rules
2. Click on the **Rules Playground** tab
3. Test different scenarios:
   - Unauthenticated users reading reels ✅
   - Unauthenticated users liking reels ✅
   - Unauthenticated users commenting on reels ✅
   - Authenticated users creating reels ✅
   - Users deleting others' reels ❌

## Important Notes

1. **Public Access**: Reels are now publicly viewable and interactive
2. **Authorization at App Level**: Upload authorization is enforced in [`authorizationService.ts`](afrdevgrp-react/src/services/authorizationService.ts:1)
3. **Guest Interactions**: Guests can like and comment using 'guest' as their userId
4. **Security**: Critical reel fields (media, caption, creator info) cannot be modified after creation

## Making Users Admins

To make a user an admin:

1. Go to Firebase Console → Firestore Database
2. Navigate to the `users` collection
3. Find the user's document (by their UID)
4. Add a field: `isAdmin` (boolean) = `true`
5. Save the changes

## Support

If you encounter any issues with these rules, check:

1. Rules are properly published in Firebase Console
2. Application code matches the expected data structure
3. Authorized emails are properly configured in [`authorizationService.ts`](afrdevgrp-react/src/services/authorizationService.ts:9)

---

**Last Updated**: November 2025  
**Project**: ADG Columbia Application  
**Firebase Project**: adg-columbia-13d72  
**Status**: ✅ Updated for Public Reel Interactions
