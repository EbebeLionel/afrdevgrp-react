# 🔥 Firebase Storage Rules - Final Version for Your App

## Your App's Storage Paths

Based on your code, you're using these storage paths:

- **Events**: `/events/{userId}/{eventId}/photo.jpg`
- **Reels**: `/reels/{userId}/{reelId}/media/{mediaId}`
- **User Profiles**: `/users/{userId}/profile/{filename}`

---

## 🚀 WORKING RULES (Apply These Now)

### For Development with Hardcoded Authentication

Since your app uses hardcoded `userId: 'admin-user-001'` instead of real Firebase Auth, use these rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Helper function to check if a user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Default: Deny all unless explicitly allowed below
    match /{allPaths=**} {
      allow read, write: if false;
    }

    // Rules for user profile images
    // Path: /users/{userId}/profile/{imageName}
    match /users/{userId}/profile/{imageName} {
      allow read: if true; // Anyone can view profile pictures
      // For development: Allow all authenticated users to upload
      // For production: Change to request.auth.uid == userId
      allow write: if true; // TEMPORARY - allows hardcoded auth to work
    }

    // Rules for event photos
    // Path: /events/{userId}/{eventId}/{photoName}
    match /events/{userId}/{eventId}/{photoName} {
      allow read: if true; // Events are public content
      // For development: Allow any upload (works with hardcoded auth)
      // For production: Change to request.auth.uid == userId
      allow write: if true; // TEMPORARY - allows hardcoded auth to work
    }

    // Rules for reel media (videos and photos)
    // Path: /reels/{userId}/{reelId}/media/{mediaId}
    match /reels/{userId}/{reelId}/media/{mediaId} {
      allow read: if true; // Reels are public content
      // For development: Allow any upload (works with hardcoded auth)
      // For production: Change to request.auth.uid == userId
      allow write: if true; // TEMPORARY - allows hardcoded auth to work
    }
  }
}
```

**⚠️ IMPORTANT**: These rules allow ANYONE to upload. Only use for development!

---

## 🔒 PRODUCTION RULES (Use After Implementing Real Firebase Auth)

Once you implement proper Firebase Authentication (not hardcoded), use these secure rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Helper function to check if a user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper function to check if user owns the resource
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Helper to validate image files
    function isValidImage() {
      return request.resource.size < 10 * 1024 * 1024 // 10MB max
          && request.resource.contentType.matches('image/.*');
    }

    // Helper to validate video files
    function isValidVideo() {
      return request.resource.size < 50 * 1024 * 1024 // 50MB max
          && request.resource.contentType.matches('video/.*');
    }

    // Helper to validate any media file
    function isValidMedia() {
      return isValidImage() || isValidVideo();
    }

    // Default: Deny all unless explicitly allowed below
    match /{allPaths=**} {
      allow read, write: if false;
    }

    // Rules for user profile images
    // Path: /users/{userId}/profile/{imageName}
    match /users/{userId}/profile/{imageName} {
      allow read: if true; // Anyone can view profile pictures
      // Only the user can upload/update their own profile image
      allow create, update: if isOwner(userId) && isValidImage();
      allow delete: if isOwner(userId);
    }

    // Rules for event photos
    // Path: /events/{userId}/{eventId}/{photoName}
    match /events/{userId}/{eventId}/{photoName} {
      allow read: if true; // Events are public content
      // Only the event creator can upload to their events folder
      allow create: if isOwner(userId) && isValidImage();
      allow update, delete: if isOwner(userId);
    }

    // Rules for reel media (videos and photos)
    // Path: /reels/{userId}/{reelId}/media/{mediaId}
    match /reels/{userId}/{reelId}/media/{mediaId} {
      allow read: if true; // Reels are public content
      // Only the reel creator can upload to their reels folder
      allow create: if isOwner(userId) && isValidMedia();
      allow update, delete: if isOwner(userId);
    }
  }
}
```

---

## 📋 How to Apply These Rules

### Step 1: Copy the Development Rules

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **adg-columbia-13d72**
3. Click **Storage** in the left sidebar
4. Click the **Rules** tab
5. **Delete all existing rules**
6. **Copy the DEVELOPMENT rules** from the "WORKING RULES" section above
7. Paste into the editor
8. Click **Publish**

### Step 2: Wait and Test

1. Wait 30-60 seconds for rules to propagate
2. Hard refresh your app (Ctrl+Shift+R)
3. Try uploading an event photo
4. Should work now! ✅

---

## 🔄 When to Switch to Production Rules

**Switch to Production Rules when you:**

1. ✅ Implement real Firebase Authentication
2. ✅ Replace hardcoded `userId: 'admin-user-001'` with `auth.currentUser.uid`
3. ✅ Test authentication flow thoroughly
4. ✅ Ready to deploy to production

**Before switching:**

- Make sure users can sign in properly
- Verify `request.auth.uid` is populated
- Test uploads with authenticated users
- Never deploy production rules while using hardcoded auth

---

## 🎯 Key Differences Between Development and Production Rules

| Feature             | Development Rules           | Production Rules              |
| ------------------- | --------------------------- | ----------------------------- |
| **Authentication**  | Not required                | Required                      |
| **Ownership Check** | Not enforced                | Strict: only owner can upload |
| **File Validation** | Not enforced                | File type and size validated  |
| **Security Level**  | ⚠️ Low (anyone can upload)  | 🔒 High (owner-only uploads)  |
| **Use Case**        | Testing with hardcoded auth | Live production website       |

---

## 🆘 Troubleshooting

### Still getting `storage/unauthorized`?

1. **Verify rules published successfully**

   - Check timestamp in Firebase Console → Storage → Rules
   - Should be recent (within last few minutes)

2. **Verify Storage is initialized**

   - If you see "Get Started" button in Storage section, click it
   - Choose "Start in test mode"
   - Wait for initialization

3. **Check your exact storage path**

   - Error shows: `/events/admin-user-001/ghhQINfibZXzOsJPxPDo/photo.jpg`
   - Rules expect: `/events/{userId}/{eventId}/{photoName}`
   - These match ✅

4. **Clear cache and retry**

   - Hard refresh: Ctrl+Shift+R
   - Clear browser cache
   - Wait 60 seconds after publishing rules

5. **Try the diagnostic test**

   ```javascript
   // In browser console:
   import { ref, uploadBytes } from "firebase/storage";
   import { storage } from "./firebase";

   const testRef = ref(storage, "test/test.txt");
   const blob = new Blob(["test"], { type: "text/plain" });
   uploadBytes(testRef, blob)
     .then(() => console.log("✅ Upload works!"))
     .catch((err) => console.error("❌ Error:", err));
   ```

### Rules published but still not working?

**Most likely causes:**

1. Storage not initialized (click "Get Started" first)
2. Wrong Firebase project selected
3. Browser cache needs clearing
4. Need to wait longer (can take 2-3 minutes)

**Check browser console for exact error:**

- Press F12
- Go to Console tab
- Try upload
- Look for `FirebaseError` messages
- Share the exact error message

---

## ✅ Quick Verification Checklist

Before asking for help, verify:

- [ ] Firebase Storage is initialized (no "Get Started" button)
- [ ] Rules are published (check timestamp)
- [ ] Used DEVELOPMENT rules (not production)
- [ ] Waited at least 60 seconds
- [ ] Hard refreshed browser (Ctrl+Shift+R)
- [ ] Checked browser console for errors
- [ ] Storage bucket name matches: `adg-columbia-13d72.firebasestorage.app`

---

**Last Updated**: 2025-11-10  
**Your Project**: adg-columbia-13d72  
**Status**: Development Rules Ready ✅  
**Next Step**: Apply Development Rules → Test Upload → Should Work!
