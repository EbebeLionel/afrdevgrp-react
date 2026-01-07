# 🔐 Firebase Storage Rules - Email-Based Authorization

## Updated Rules for Your App

These rules work with Firebase Authentication and your app's email-based authorization system.

---

## 📋 Apply These Storage Rules

Copy and paste into **Firebase Console → Storage → Rules**:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    function isAuthenticated() {
      return request.auth != null;
    }

    // Default: Deny all unless explicitly allowed below
    match /{allPaths=**} {
      allow read, write: if false;
    }

    // User profile images
    // Path: /user_profiles/{userId}/{imageName}
    match /user_profiles/{userId}/{imageName} {
      allow read: if true;
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }

    // Event photos (UPDATED FOR YOUR APP)
    // Path: /events/{userId}/{eventId}/{fileName}
    match /events/{userId}/{eventId}/{fileName} {
      allow read: if true; // Public read for event photos
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }

    // Event media (alternative path structure - kept for compatibility)
    // Path: /event_media/{eventId}/{photoName}
    match /event_media/{eventId}/{photoName} {
      allow read: if true;
      allow write: if isAuthenticated();
    }

    // Reel media
    // Path: /reel_media/{reelId}/{mediaName}
    match /reel_media/{reelId}/{mediaName} {
      allow read: if true;
      allow write: if isAuthenticated();
    }

    // Reel media (alternative path structure for your app)
    // Path: /reels/{userId}/{reelId}/media/{mediaId}
    match /reels/{userId}/{reelId}/media/{mediaId} {
      allow read: if true;
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }

    // User profiles (alternative path for your app)
    // Path: /users/{userId}/profile/{imageName}
    match /users/{userId}/profile/{imageName} {
      allow read: if true;
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }
  }
}
```

---

## 🎯 How to Apply

1. **Firebase Console** → [console.firebase.google.com](https://console.firebase.google.com)
2. Select project: **adg-columbia-13d72**
3. Click **Storage** → **Rules** tab
4. Delete all existing rules
5. Copy the rules above
6. Paste into editor
7. Click **Publish**
8. Wait 30-60 seconds for propagation

---

## ✅ What These Rules Do

### Authentication Required

- ✅ All uploads require Firebase Authentication
- ✅ Users must be signed in to upload
- ✅ `request.auth` must exist

### Ownership Verification

- ✅ Users can only upload to their own folders
- ✅ `request.auth.uid` must match `userId` in path
- ✅ Prevents users from uploading to others' folders

### Public Read Access

- ✅ Anyone can view events, reels, profiles
- ✅ No authentication required for reading
- ✅ Community content is publicly accessible

---

## 🔄 How It Works with Your Email Authorization

### Your App's Flow:

1. **User Signs In** (Firebase Auth with email)

   ```
   User → Firebase Auth → Gets uid + email
   ```

2. **Email Authorization Check** (Your App)

   ```
   if (user.email in authorizedEmails) {
     ✅ Allow access to upload forms
   } else {
     ❌ Show "Not Authorized" message
   }
   ```

3. **Upload Attempt** (Firebase Storage)
   ```
   if (isAuthenticated() && request.auth.uid == userId) {
     ✅ Upload allowed
   } else {
     ❌ Upload rejected
   }
   ```

### Two-Layer Security:

**Layer 1: Your App (Client-Side)**

- Checks if email is in authorized list
- Shows/hides upload forms
- User-friendly authorization messages

**Layer 2: Firebase Storage Rules (Server-Side)**

- Verifies Firebase Auth token
- Checks ownership (uid matches path)
- Ultimate security enforcement

---

## 📝 Authorized Emails List

Your app maintains this list in code:

```typescript
// src/services/authorizationService.ts
const AUTHORIZED_EMAILS = [
  "adg.columbia@gmail.com",
  // Add more authorized emails here
];
```

**Only these emails can:**

- ✅ Access upload forms for Events
- ✅ Access upload forms for Reels
- ✅ Create and manage content

**All other users can:**

- ✅ View events and reels (read-only)
- ❌ Cannot access upload forms
- ❌ See "Not Authorized" message

---

## 🔐 Security Comparison

| Feature                 | Without Auth  | With Email Auth           |
| ----------------------- | ------------- | ------------------------- |
| **Upload Forms Access** | Everyone      | Authorized emails only    |
| **Storage Uploads**     | Not protected | Firebase Auth + ownership |
| **User Experience**     | Open to all   | Role-based access         |
| **Security Level**      | Low           | High                      |
| **Admin Control**       | None          | Email whitelist           |

---

## 🆘 Troubleshooting

### Error: `storage/unauthorized`

**Possible Causes:**

1. User not authenticated with Firebase Auth
2. User's uid doesn't match userId in upload path
3. Rules not published correctly

**Solutions:**

1. Verify user is signed in: `auth.currentUser !== null`
2. Check upload path uses correct uid: `/events/${auth.currentUser.uid}/...`
3. Republish rules and wait 60 seconds

### Authorized email but can't upload

**Check:**

1. User signed in with Firebase Auth? (not just email check)
2. Upload path uses user's uid?
3. Firebase Storage rules published?
4. Waited 60 seconds after publishing rules?

### Unauthorized email sees upload forms

**Issue:** Client-side authorization not working

**Check:**

1. Authorization service implemented correctly?
2. Events.tsx checks authorization before showing forms?
3. Email exactly matches authorized list (case-sensitive)?

---

## 📚 Related Files

- Authorization logic: `src/services/authorizationService.ts` (to be created)
- Events component: `src/components/EventsPage/Events.tsx`
- Reels component: `src/components/ReelsPage/Reels.tsx`
- Auth context: `src/contexts/AuthContext.tsx`

---

**Last Updated**: 2025-11-10  
**Project**: adg-columbia-13d72  
**Authorization Method**: Email whitelist  
**Security**: Two-layer (client + server)
