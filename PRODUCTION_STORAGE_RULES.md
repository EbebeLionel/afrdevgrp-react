# 🔒 Firebase Storage Rules - Production Ready

## Production-Grade Security Rules for Your App

These rules provide **enterprise-level security** while maintaining your app's functionality.

---

## 🚀 PRODUCTION RULES (Apply These)

Copy and paste these rules into Firebase Console → Storage → Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    // Check if user is authenticated with Firebase Auth
    function isAuthenticated() {
      return request.auth != null && request.auth.uid != null;
    }

    // Check if authenticated user owns this resource path
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Validate image file type and size
    function isValidImage() {
      return request.resource != null
          && request.resource.size > 0
          && request.resource.size < 10 * 1024 * 1024 // 10MB max
          && request.resource.contentType.matches('image/.*');
    }

    // Validate video file type and size
    function isValidVideo() {
      return request.resource != null
          && request.resource.size > 0
          && request.resource.size < 50 * 1024 * 1024 // 50MB max
          && request.resource.contentType.matches('video/.*');
    }

    // Validate any media file (image or video)
    function isValidMedia() {
      return isValidImage() || isValidVideo();
    }

    // Check if file name is safe (no path traversal attacks)
    function isSafeFileName(fileName) {
      return fileName.matches('[a-zA-Z0-9_\\-\\.]+');
    }

    // ============================================
    // DEFAULT RULE: DENY ALL
    // ============================================
    match /{allPaths=**} {
      allow read, write: if false;
    }

    // ============================================
    // USER PROFILE IMAGES
    // Path: /users/{userId}/profile/{imageName}
    // ============================================
    match /users/{userId}/profile/{imageName} {
      // Public read: Anyone can view profile pictures
      allow read: if true;

      // Authenticated users can upload their own profile image
      allow create, update: if isOwner(userId)
                            && isValidImage()
                            && isSafeFileName(imageName);

      // Only the owner can delete their profile image
      allow delete: if isOwner(userId);
    }

    // ============================================
    // EVENT PHOTOS
    // Path: /events/{userId}/{eventId}/{photoName}
    // ============================================
    match /events/{userId}/{eventId}/{photoName} {
      // Public read: Anyone can view event photos
      allow read: if true;

      // Only the event creator can upload photos to their event
      allow create: if isOwner(userId)
                    && isValidImage()
                    && isSafeFileName(photoName)
                    && eventId.matches('[a-zA-Z0-9_\\-]+'); // Validate eventId format

      // Only the event creator can update or delete photos
      allow update, delete: if isOwner(userId);
    }

    // ============================================
    // REEL MEDIA (Photos and Videos)
    // Path: /reels/{userId}/{reelId}/media/{mediaId}
    // ============================================
    match /reels/{userId}/{reelId}/media/{mediaId} {
      // Public read: Anyone can view reel media
      allow read: if true;

      // Only the reel creator can upload media to their reel
      // Accepts both photos and videos
      allow create: if isOwner(userId)
                    && isValidMedia()
                    && isSafeFileName(mediaId)
                    && reelId.matches('[a-zA-Z0-9_\\-]+'); // Validate reelId format

      // Only the reel creator can update or delete media
      allow update, delete: if isOwner(userId);
    }

    // ============================================
    // ADDITIONAL SECURITY: Prevent other paths
    // ============================================
    // Any other path not explicitly allowed above will be denied
    // This prevents users from uploading to arbitrary locations
  }
}
```

---

## 🔐 Security Features Included

### ✅ **Authentication & Authorization**

- ✅ Requires Firebase Authentication for all uploads
- ✅ Users can only upload to their own folders (`userId` must match `auth.uid`)
- ✅ Public read access for community content (events, reels, profiles)
- ✅ Owner-only write/delete permissions

### ✅ **File Validation**

- ✅ Image files: Max 10MB, must be valid image/\* MIME type
- ✅ Video files: Max 50MB, must be valid video/\* MIME type
- ✅ Reels accept both images AND videos
- ✅ Events accept images only
- ✅ Profile pictures accept images only

### ✅ **Security Best Practices**

- ✅ File name validation (prevents path traversal attacks)
- ✅ ID validation (eventId, reelId must be alphanumeric)
- ✅ Size validation (prevents storage abuse)
- ✅ Type validation (prevents malicious file uploads)
- ✅ Default deny all (explicit allow required)

### ✅ **Attack Prevention**

- ✅ Path traversal protection (`../../../etc/passwd` attacks blocked)
- ✅ Arbitrary file upload protection (only allowed paths work)
- ✅ Size limit enforcement (prevents storage quota abuse)
- ✅ Type enforcement (prevents executable uploads)

---

## 📋 How to Apply These Rules

### Step 1: Ensure Firebase Auth is Configured

**⚠️ CRITICAL**: These rules require **real Firebase Authentication**. They will NOT work with hardcoded `userId: 'admin-user-001'`.

**Before applying these rules, verify:**

1. Your app uses Firebase Auth (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, etc.)
2. Users have valid Firebase Auth tokens when uploading
3. `request.auth.uid` is populated during uploads

**If you're still using hardcoded authentication, these rules will block all uploads!**

### Step 2: Apply the Rules

1. **Firebase Console** → [console.firebase.google.com](https://console.firebase.google.com)
2. Select project: **adg-columbia-13d72**
3. Click **Storage** in left sidebar
4. Click **Rules** tab
5. **Delete all existing rules**
6. **Copy the entire rules code** from above (lines 11-115)
7. Paste into the editor
8. Click **Publish**
9. Wait for "Rules published successfully" message

### Step 3: Test Thoroughly

**Test these scenarios:**

1. ✅ **Upload as authenticated user** → Should succeed
2. ✅ **Upload to your own folder** → Should succeed
3. ❌ **Upload to someone else's folder** → Should fail
4. ❌ **Upload oversized file (>10MB image, >50MB video)** → Should fail
5. ❌ **Upload invalid file type** → Should fail
6. ✅ **Read any public content** → Should succeed
7. ❌ **Upload without authentication** → Should fail

---

## 🔄 Migration Path from Development to Production

If you're currently using **test mode rules** (allow all), follow this migration:

### Current State: Test Mode

```javascript
match /{allPaths=**} {
  allow read, write: if true; // ⚠️ Insecure!
}
```

### Step 1: Implement Firebase Auth in Your App

Update [`Events.tsx`](afrdevgrp-react/src/components/EventsPage/Events.tsx) and [`Reels.tsx`](afrdevgrp-react/src/components/ReelsPage/Reels.tsx):

```typescript
// ❌ OLD: Hardcoded authentication
const userId = "admin-user-001";

// ✅ NEW: Real Firebase Auth
import { useAuth } from "../../contexts/AuthContext";

function Events() {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;

  if (!userId) {
    return <p>Please sign in to upload events</p>;
  }
  // ... rest of component
}
```

### Step 2: Update Event/Reel Services

Update [`eventService.ts`](afrdevgrp-react/src/services/eventService.ts):

```typescript
// ❌ OLD: Hardcoded userId
userId: "admin-user-001";

// ✅ NEW: Use authenticated user's ID
userId: auth.currentUser?.uid || "";
```

### Step 3: Test with Firebase Auth

1. Sign in to your app with Firebase Auth
2. Try uploading an event photo
3. Verify upload succeeds
4. Check Firebase Storage console - file should be at `/events/{yourAuthUid}/...`

### Step 4: Apply Production Rules

Once Firebase Auth is working:

1. Apply the production rules above
2. Test all upload/delete functionality
3. Verify users can only modify their own content

---

## 🆘 Troubleshooting

### Error: `storage/unauthorized` after applying rules

**Cause**: You're still using hardcoded authentication instead of Firebase Auth.

**Solution**: Implement Firebase Authentication first (see Migration Path above).

### Error: `storage/invalid-argument`

**Cause**: File doesn't meet validation criteria (size, type, name).

**Solution**:

- Check file size (max 10MB images, 50MB videos)
- Verify file type is image/_ or video/_
- Ensure filename is alphanumeric with safe characters

### Error: `storage/unauthenticated`

**Cause**: User not signed in with Firebase Auth.

**Solution**: Ensure user is authenticated before attempting upload:

```typescript
import { getAuth } from "firebase/auth";

const auth = getAuth();
if (!auth.currentUser) {
  alert("Please sign in first");
  return;
}
```

### Uploads work in test mode but fail in production mode

**This is expected!** Production rules require:

1. ✅ Valid Firebase Auth token
2. ✅ Matching userId in path and auth.uid
3. ✅ Valid file type and size
4. ✅ Safe filename

Test mode allows anything; production mode enforces security.

---

## 📊 File Size & Type Limits

### Images

- **Max Size**: 10 MB (10,485,760 bytes)
- **Allowed Types**: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, etc.
- **Used For**: Events, User Profiles, Reels

### Videos

- **Max Size**: 50 MB (52,428,800 bytes)
- **Allowed Types**: `video/mp4`, `video/quicktime`, `video/webm`, etc.
- **Used For**: Reels only

### Adjust Limits

To change size limits, edit these lines:

```javascript
// For images:
&& request.resource.size < 10 * 1024 * 1024 // Change 10 to desired MB

// For videos:
&& request.resource.size < 50 * 1024 * 1024 // Change 50 to desired MB
```

---

## 🔍 Testing Your Rules

### Test in Firebase Console

1. Firebase Console → Storage
2. Try uploading a file manually
3. Should succeed if you're authenticated
4. Try uploading to different user's folder
5. Should fail with permission error

### Test in Your App

```typescript
// Create a test upload function
async function testUpload() {
  const auth = getAuth();
  console.log("Current user:", auth.currentUser?.uid);

  if (!auth.currentUser) {
    console.error("Not authenticated!");
    return;
  }

  const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
  const path = `events/${auth.currentUser.uid}/test-event/test.jpg`;

  try {
    const url = await uploadFile(file, path);
    console.log("✅ Upload successful:", url);
  } catch (error) {
    console.error("❌ Upload failed:", error);
  }
}
```

---

## ✅ Production Checklist

Before going live with these rules:

- [ ] Firebase Authentication is implemented and working
- [ ] Users can successfully sign in/sign up
- [ ] `auth.currentUser.uid` is used instead of hardcoded IDs
- [ ] Tested upload as authenticated user (should work)
- [ ] Tested upload without authentication (should fail)
- [ ] Tested upload to own folder (should work)
- [ ] Tested upload to other user's folder (should fail)
- [ ] Tested oversized file upload (should fail)
- [ ] Tested invalid file type upload (should fail)
- [ ] All existing uploads still accessible (read works)
- [ ] Production rules published in Firebase Console

---

## 🚀 Benefits of These Production Rules

| Feature               | Test Mode                   | Production Mode              |
| --------------------- | --------------------------- | ---------------------------- |
| **Security**          | ❌ None (anyone can upload) | ✅ Auth + ownership required |
| **File Validation**   | ❌ None                     | ✅ Type, size, name checked  |
| **Attack Prevention** | ❌ Vulnerable               | ✅ Protected                 |
| **Storage Abuse**     | ❌ Possible                 | ✅ Prevented                 |
| **Production Ready**  | ❌ No                       | ✅ Yes                       |
| **Audit Trail**       | ❌ Anonymous                | ✅ User tracked              |

---

**Last Updated**: 2025-11-10  
**Project**: adg-columbia-13d72  
**Status**: Production Ready ✅  
**Security Level**: High 🔒  
**Requires**: Firebase Authentication
