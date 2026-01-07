# Firebase Storage Security Rules for ADG Application

## Overview

This document contains the complete Firebase Storage Security Rules for the African Development Group (ADG) application. These rules ensure that uploaded media files (photos and videos) are protected and only accessible by authorized users.

## ⚠️ Important: Authentication Requirement

**The secure rules below require Firebase Authentication to be properly configured.** If you're using hardcoded authentication (like the current implementation), you'll get permission errors. See the [Temporary Rules for Testing](#temporary-rules-for-testing) section below.

## How to Apply These Rules

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **adg-columbia-13d72**
3. Navigate to **Storage** in the left sidebar
4. Click on the **Rules** tab

## Temporary Rules for Testing

**If you're getting "storage/unauthorized" errors**, it's because you're using hardcoded authentication instead of real Firebase Auth. Use these temporary rules for testing:

### Temporary Open Rules (Testing Only)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // WARNING: These rules allow ALL access - use only for testing
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

**To apply these temporary rules:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **adg-columbia-13d72**
3. Navigate to **Storage** → **Rules**
4. Replace with the rules above
5. Click **Publish**

**⚠️ Security Warning**: These rules allow anyone to upload/download files. Only use for development/testing. Replace with secure rules below once Firebase Authentication is properly implemented.

5. Replace the existing rules with the code below
6. Click **Publish** to apply the changes

## Firebase Storage Security Rules

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {

    // ==========================================
    // HELPER FUNCTIONS
    // ==========================================

    // Check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Check if user owns the resource
    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // Check if user is an admin (requires Firestore lookup)
    function isAdmin() {
      return isAuthenticated()
        && firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

    // Check if file is an image
    function isImage() {
      return request.resource.contentType.matches('image/.*');
    }

    // Check if file is a video
    function isVideo() {
      return request.resource.contentType.matches('video/.*');
    }

    // Check if file is either image or video
    function isImageOrVideo() {
      return isImage() || isVideo();
    }

    // Validate file size (max 10MB for images, 50MB for videos)
    function isValidSize() {
      return (isVideo() && request.resource.size <= 50 * 1024 * 1024)
          || (isImage() && request.resource.size <= 10 * 1024 * 1024);
    }

    // ==========================================
    // EVENTS STORAGE RULES
    // ==========================================
    // Path: /events/{userId}/{eventId}/{fileName}
    // Only admin users can upload event photos
    // All authenticated users can read event photos

    match /events/{userId}/{eventId}/{fileName} {
      // Allow all authenticated users to read event photos
      allow read: if isAuthenticated();

      // Only admins who own the resource can write
      allow create, update: if isAdmin()
        && isOwner(userId)
        && isImage()
        && isValidSize();

      // Only admins who own the resource can delete
      allow delete: if isAdmin() && isOwner(userId);
    }

    // ==========================================
    // REELS STORAGE RULES
    // ==========================================
    // Path: /reels/{userId}/{reelId}/media/{mediaFile}
    // Any authenticated user can upload reel media
    // All authenticated users can read reel media

    match /reels/{userId}/{reelId}/media/{mediaFile} {
      // Allow all authenticated users to read reel media
      allow read: if isAuthenticated();

      // Authenticated users can upload their own media
      allow create, update: if isAuthenticated()
        && isOwner(userId)
        && isImageOrVideo()
        && isValidSize();

      // Users can delete their own media, or admins can delete any
      allow delete: if isOwner(userId) || isAdmin();
    }

    // ==========================================
    // REEL THUMBNAILS (Optional for video thumbnails)
    // ==========================================
    // Path: /reels/{userId}/{reelId}/media/thumbnails/{thumbFile}

    match /reels/{userId}/{reelId}/media/thumbnails/{thumbFile} {
      // Allow all authenticated users to read thumbnails
      allow read: if isAuthenticated();

      // Users can upload thumbnails for their own reels
      allow create, update: if isOwner(userId) && isImage();

      // Users can delete their own thumbnails, or admins can delete any
      allow delete: if isOwner(userId) || isAdmin();
    }

    // ==========================================
    // DENY ALL OTHER PATHS
    // ==========================================
    // Any other path is explicitly denied
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## Updated Firestore Security Rules

These rules should be used in conjunction with the Storage rules above. Update your Firestore rules:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // ==========================================
    // HELPER FUNCTIONS
    // ==========================================

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isAdmin() {
      return isAuthenticated()
        && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

    // ==========================================
    // USERS COLLECTION
    // ==========================================

    match /users/{userId} {
      allow read: if isOwner(userId);
      allow create: if isOwner(userId)
        && request.resource.data.keys().hasAll(['email', 'name', 'birthday', 'school', 'createdAt']);
      allow update: if isOwner(userId)
        && request.resource.data.uid == resource.data.uid
        && request.resource.data.email == resource.data.email;
      allow delete: if false;
    }

    // ==========================================
    // EVENTS COLLECTION
    // ==========================================

    match /events/{eventId} {
      // All authenticated users can read events
      allow read: if isAuthenticated();

      // Only admins can create events
      allow create: if isAdmin()
        && request.resource.data.keys().hasAll([
          'name', 'type', 'date', 'startTime', 'endTime',
          'description', 'photoUrl', 'uploadedBy', 'uploadedAt'
        ])
        && request.resource.data.uploadedBy == request.auth.uid
        && request.resource.data.type in ['g-body', 'major'];

      // Only admins can update events
      allow update: if isAdmin();

      // Only admins can delete events
      allow delete: if isAdmin();
    }

    // ==========================================
    // REELS COLLECTION
    // ==========================================

    match /reels/{reelId} {
      // All authenticated users can read reels
      allow read: if isAuthenticated();

      // Authenticated users can create reels
      allow create: if isAuthenticated()
        && request.resource.data.uploadedBy == request.auth.uid
        && request.resource.data.keys().hasAll([
          'media', 'caption', 'uploadedBy', 'uploaderName',
          'likes', 'likedBy', 'comments', 'views', 'createdAt'
        ])
        && request.resource.data.media is list
        && request.resource.data.media.size() > 0;

      // Users can update their own reels (for likes, comments, views)
      // Admins can update any reel
      allow update: if isOwner(resource.data.uploadedBy) || isAdmin();

      // Users can delete their own reels
      // Admins can delete any reel
      allow delete: if isOwner(resource.data.uploadedBy) || isAdmin();
    }
  }
}
```

## Temporary Firestore Rules for Testing

If you're using hardcoded authentication, you'll also need to update your Firestore rules. Replace the rules in **Firestore Database** → **Rules** with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // WARNING: These rules allow ALL authenticated and unauthenticated access
    // Use only for testing with hardcoded authentication

    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**To apply:**

1. Go to Firebase Console → **Firestore Database** → **Rules**
2. Replace with the rules above
3. Click **Publish**

**Note**: Once you implement proper Firebase Authentication, replace these with the secure rules from the main documentation.

## Rule Explanations

### Storage Rules

#### Events Storage (`/events/{userId}/{eventId}/`)

- **Read**: Any authenticated user can view event photos
- **Write**: Only admin users can upload event photos (max 10MB)
- **Delete**: Only admin users who own the resource can delete
- **File Types**: Images only (jpg, png, gif, webp, etc.)
- **Size Limit**: 10MB maximum

#### Reels Storage (`/reels/{userId}/{reelId}/media/`)

- **Read**: Any authenticated user can view reel media
- **Write**: Any authenticated user can upload their own reel media
- **Delete**: Users can delete their own media, admins can delete any
- **File Types**: Images and videos
- **Size Limits**: 10MB for images, 50MB for videos

### Firestore Rules

#### Events Collection

- **Read**: Any authenticated user
- **Create**: Admin only, must include all required fields
- **Update**: Admin only
- **Delete**: Admin only

#### Reels Collection

- **Read**: Any authenticated user
- **Create**: Any authenticated user (for their own reels)
- **Update**: Owner or admin (for likes, comments, views)
- **Delete**: Owner or admin

## File Size Limits

| File Type | Maximum Size | Usage                     |
| --------- | ------------ | ------------------------- |
| Images    | 10 MB        | Event photos, Reel photos |
| Videos    | 50 MB        | Reel videos               |

## Supported File Types

### Images

- JPEG/JPG (image/jpeg)
- PNG (image/png)
- GIF (image/gif)
- WebP (image/webp)
- Other image/\* MIME types

### Videos

- MP4 (video/mp4)
- MOV (video/quicktime)
- WebM (video/webm)
- Other video/\* MIME types

## Storage Structure

```

storage/
├── events/
│ └── {userId}/ # User ID of admin who created event
│ └── {eventId}/ # Unique event ID
│ └── photo.{ext} # Event photo
│
└── reels/
└── {userId}/ # User ID of reel creator
└── {reelId}/ # Unique reel ID
└── media/ # Media folder
├── 0.{ext} # First media file
├── 1.{ext} # Second media file
├── 2.{ext} # Third media file
└── ...

```

## Security Best Practices

1. **Authentication Required**: All operations require user authentication
2. **File Validation**: Files are validated for type and size before upload
3. **Ownership Checks**: Users can only modify their own content (except admins)
4. **Admin Verification**: Admin status is verified through Firestore lookup
5. **Explicit Denials**: Any path not explicitly allowed is denied

## Testing the Rules

### Using Firebase Console Rules Playground

1. Go to Storage → Rules
2. Click on **Rules Playground** tab
3. Test scenarios:
   - Upload event photo as admin
   - Upload event photo as regular user (should fail)
   - Upload reel media as regular user
   - Upload oversized file (should fail)
   - Upload invalid file type (should fail)

### Using Firebase Emulator

```bash
# In your project directory
firebase emulators:start --only storage,firestore

# Run tests against emulator
npm test
```

## Making Users Admins

To make a user an admin (required for event uploads):

1. Go to Firebase Console → Firestore Database
2. Navigate to the `users` collection
3. Find the user's document (by their UID)
4. Add or edit the field: `isAdmin` (boolean) = `true`
5. Save the changes

## Common Issues and Solutions

### Issue: "Permission denied" when uploading event photo

**Solution**: Ensure the user has `isAdmin: true` in their Firestore user document

### Issue: "File too large" error

**Solution**:

- Images must be ≤ 10MB
- Videos must be ≤ 50MB
- Compress files before uploading if needed

### Issue: "Invalid file type" error

**Solution**: Ensure file is a valid image (for events) or image/video (for reels)

### Issue: Cannot delete old event photo

**Solution**: Old photos may have different extensions. The delete function tries common extensions automatically.

## Monitoring and Logs

To monitor storage access:

1. Go to Firebase Console → Storage
2. Click on **Usage** tab to see storage metrics
3. Check **Logs** in Cloud Console for detailed access logs
4. Set up alerts for unusual activity

## Cost Optimization

- **Storage**: ~$0.026/GB per month
- **Downloads**: ~$0.12/GB
- **Uploads**: Free
- **Operations**: ~$0.05 per 10,000 operations

Tips to reduce costs:

1. Implement image compression before upload
2. Use appropriate image formats (WebP recommended)
3. Delete old/unused media regularly
4. Monitor usage through Firebase Console

---

**Last Updated**: November 2025  
**Project**: ADG Columbia Application  
**Firebase Project**: adg-columbia-13d72  
**Storage Bucket**: adg-columbia-13d72.firebasestorage.app
