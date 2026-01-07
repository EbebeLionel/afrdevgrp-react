# Firebase Firestore Security Rules for ADG Application

## Overview

This document contains the complete Firebase Firestore Security Rules for the African Development Group (ADG) application. These rules ensure that user data is protected and only accessible by authorized users.

## How to Apply These Rules

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **adg-columbia-13d72**
3. Navigate to **Firestore Database** in the left sidebar
4. Click on the **Rules** tab
5. Replace the existing rules with the code below
6. Click **Publish** to apply the changes

## Firestore Security Rules

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
    // REELS COLLECTION
    // ==========================================
    // All authenticated users can read reels
    // Users can create reels and manage their own reels
    match /reels/{reelId} {
      // Any authenticated user can read reels
      allow read: if request.auth != null;

      // Any authenticated user can create a reel
      // Ensure the creatorId matches the authenticated user
      allow create: if request.auth != null
                    && request.resource.data.creatorId == request.auth.uid
                    && request.resource.data.keys().hasAll(['creatorId', 'creatorName', 'caption', 'videoUrl', 'createdAt']);

      // Users can only update or delete their own reels
      allow update, delete: if request.auth != null
                            && resource.data.creatorId == request.auth.uid;
    }

    // ==========================================
    // REEL LIKES SUBCOLLECTION
    // ==========================================
    // Track likes on reels
    match /reels/{reelId}/likes/{userId} {
      // Users can read all likes
      allow read: if request.auth != null;

      // Users can only create/delete their own likes
      allow create, delete: if request.auth != null && request.auth.uid == userId;

      // Prevent updates to likes (they should be created or deleted only)
      allow update: if false;
    }

    // ==========================================
    // REEL COMMENTS SUBCOLLECTION
    // ==========================================
    // Track comments on reels
    match /reels/{reelId}/comments/{commentId} {
      // Users can read all comments
      allow read: if request.auth != null;

      // Users can create comments
      allow create: if request.auth != null
                    && request.resource.data.userId == request.auth.uid
                    && request.resource.data.keys().hasAll(['userId', 'username', 'text', 'createdAt']);

      // Users can only delete their own comments
      allow delete: if request.auth != null
                    && resource.data.userId == request.auth.uid;

      // Comments cannot be updated (delete and recreate instead)
      allow update: if false;
    }
  }
}
```

## Rule Explanations

### Users Collection

- **Read**: Users can only read their own profile data
- **Create**: Users can create their profile during sign-up (document ID must match their Auth UID)
- **Update**: Users can update their own profile (cannot change UID or email)
- **Delete**: Users cannot delete their profiles (must be done by admin through console)

### Events Collection

- **Read**: Any authenticated user can view events
- **Write**: Only users with `isAdmin: true` in their user document can create/update/delete events

### Reels Collection

- **Read**: Any authenticated user can view reels
- **Create**: Any authenticated user can create reels
- **Update/Delete**: Users can only modify or delete their own reels

### Likes Subcollection

- **Read**: Any authenticated user can see likes
- **Create/Delete**: Users can only like/unlike reels with their own UID

### Comments Subcollection

- **Read**: Any authenticated user can read comments
- **Create**: Any authenticated user can comment
- **Delete**: Users can only delete their own comments

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

### Reel Document (`reels/{reelId}`)

Required fields:

- `creatorId`: string (UID of creator)
- `creatorName`: string
- `caption`: string
- `videoUrl`: string
- `createdAt`: timestamp
- `likeCount`: number
- `commentCount`: number

## Making Users Admins

To make a user an admin:

1. Go to Firebase Console → Firestore Database
2. Navigate to the `users` collection
3. Find the user's document (by their UID)
4. Add a field: `isAdmin` (boolean) = `true`
5. Save the changes

Admin users will then be able to create, edit, and delete events.

## Testing the Rules

You can test these rules in the Firebase Console:

1. Go to Firestore Database → Rules
2. Click on the **Rules Playground** tab
3. Test different scenarios:
   - Authenticated vs unauthenticated requests
   - Reading own vs other users' data
   - Admin vs non-admin operations

## Important Notes

1. **Authentication Required**: All operations require users to be authenticated
2. **Email Verification**: These rules don't check for email verification. Add if needed:
   ```javascript
   request.auth.token.email_verified == true;
   ```
3. **Admin Management**: Admins must be manually set in Firestore (no self-promotion)
4. **Security Best Practices**: Never expose sensitive data in client-side code

## Support

If you encounter any issues with these rules, check:

1. User is properly authenticated
2. Document IDs match expected format
3. Required fields are present in the data
4. Admin flag is properly set for admin operations

---

**Last Updated**: November 2025  
**Project**: ADG Columbia Application  
**Firebase Project**: adg-columbia-13d72
