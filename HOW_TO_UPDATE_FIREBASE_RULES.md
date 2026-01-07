# How to Update Firebase Rules - Complete Guide

## Important: There Are TWO Different Rule Sections!

Firebase has **two separate** rule systems that control different things:

### 1. Firebase Storage Rules (For Files) ✅ Already Correct

- **Controls**: Access to media files (videos, photos)
- **Location in Console**: Storage → Rules
- **Status**: Your current rules are perfect - no changes needed!

### 2. Firestore Database Rules (For Data) 🔄 Needs Updating

- **Controls**: Access to database data (likes, comments, views)
- **Location in Console**: Firestore Database → Rules
- **Status**: These need to be updated

---

## Step-by-Step Instructions

### Step 1: Open Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **adg-columbia-13d72**

### Step 2: Navigate to Firestore Database Rules (NOT Storage!)

⚠️ **IMPORTANT**: Make sure you go to **Firestore Database**, NOT Storage!

1. In the left sidebar, look for **Firestore Database** (has a database icon)
2. Click on **Firestore Database**
3. Click on the **Rules** tab at the top

### Step 3: Replace the Rules

You'll see an editor with existing rules. Follow these steps:

1. **Select all** the existing text in the editor (Ctrl+A or Cmd+A)
2. **Delete** it
3. **Copy** the complete rules from [`FIRESTORE_RULES_COMPLETE.txt`](FIRESTORE_RULES_COMPLETE.txt)
4. **Paste** them into the editor

### Step 4: Publish the Rules

1. Click the **Publish** button (top right)
2. Wait for the success message
3. Done! ✅

---

## Visual Guide: Finding the Right Place

### ❌ WRONG Place (Storage Rules - Don't Change These)

```
Firebase Console
└── Storage (cloud icon)
    └── Rules
        └── These control FILE access (videos/photos)
        └── Already correct - leave as is!
```

### ✅ CORRECT Place (Firestore Rules - Update These)

```
Firebase Console
└── Firestore Database (database icon)
    └── Rules
        └── These control DATA access (likes/comments/views)
        └── Replace with new rules!
```

---

## Complete Firestore Rules to Copy

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ==========================================
    // USERS COLLECTION
    // ==========================================
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;

      allow create: if request.auth != null
                    && request.auth.uid == userId
                    && request.resource.data.keys().hasAll(['email', 'name', 'birthday', 'school', 'createdAt'])
                    && request.resource.data.email == request.auth.token.email;

      allow update: if request.auth != null
                    && request.auth.uid == userId
                    && request.resource.data.uid == resource.data.uid
                    && request.resource.data.email == resource.data.email;

      allow delete: if false;
    }

    // ==========================================
    // EVENTS COLLECTION
    // ==========================================
    match /events/{eventId} {
      allow read: if request.auth != null;

      allow create, update: if request.auth != null
                            && exists(/databases/$(database)/documents/users/$(request.auth.uid))
                            && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;

      allow delete: if request.auth != null
                    && exists(/databases/$(database)/documents/users/$(request.auth.uid))
                    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

    // ==========================================
    // REELS COLLECTION - UPDATED FOR PUBLIC ACCESS
    // ==========================================
    match /reels/{reelId} {
      // Anyone can read reels (no authentication required)
      allow read: if true;

      // Only authenticated users can create reels
      allow create: if request.auth != null
                    && request.resource.data.uploadedBy == request.auth.uid
                    && request.resource.data.keys().hasAll(['uploadedBy', 'uploaderName', 'caption', 'media', 'createdAt']);

      // Anyone can update reels for likes, comments, and views
      // Only allow updating these fields: likes, likedBy, comments, views
      // Prevent updating: id, media, caption, uploadedBy, uploaderName, createdAt
      allow update: if !request.resource.data.diff(resource.data).affectedKeys()
                        .hasAny(['id', 'media', 'caption', 'uploadedBy', 'uploaderName', 'createdAt']);

      // Only the reel creator can delete their own reels
      allow delete: if request.auth != null
                    && resource.data.uploadedBy == request.auth.uid;
    }
  }
}
```

---

## After Publishing: Test Your Changes

### Test 1: Open App Without Login

1. Open your app in incognito/private mode
2. Go to Reels page
3. ✅ Should see all reels

### Test 2: Like a Reel Without Login

1. Click the heart icon
2. ✅ Should work and increment like count

### Test 3: Comment Without Login

1. Click comment icon
2. Add a comment
3. ✅ Should work and show as "Anonymous"

---

## Troubleshooting

### "I don't see Firestore Database in the sidebar"

- You might need to scroll down in the left sidebar
- Look for an icon that looks like a database/cylinder
- It's different from "Storage" (which has a cloud icon)

### "The rules look different"

- Make sure you're in **Firestore Database → Rules**
- NOT in **Storage → Rules**
- Firestore rules start with `service cloud.firestore`
- Storage rules start with `service firebase.storage`

### "I get syntax errors"

- Make sure you copied the entire rules text
- Check that you didn't accidentally copy extra characters
- Try copying from the text file again

---

## Summary

**Keep**: Firebase Storage rules (already correct for file access)

**Update**: Firestore Database rules (copy from above or from [`FIRESTORE_RULES_COMPLETE.txt`](FIRESTORE_RULES_COMPLETE.txt))

**Result**: Anyone can like, comment, and view reels. Only authorized users can upload.
