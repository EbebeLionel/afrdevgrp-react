# Temporary Firebase Storage Rules (For Testing Only)

## ⚠️ WARNING: These rules are NOT secure and should only be used for development/testing

If you're using hardcoded authentication instead of Firebase Auth, you'll need to temporarily use open Storage rules. **These rules allow anyone to read and write, so deploy more secure rules before going to production.**

## Temporary Storage Rules

Go to Firebase Console → Storage → Rules and paste:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // TEMPORARY: Allow all reads and writes
    // TODO: Replace with secure rules once Firebase Auth is implemented
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

## After Deployment

Once you have Firebase Authentication properly set up:

1. Go back to Firebase Console → Storage → Rules
2. Replace with the secure rules from [`FIREBASE_STORAGE_SECURITY_RULES.md`](FIREBASE_STORAGE_SECURITY_RULES.md)
3. Click **Publish**

## Why This Happened

The original storage rules require Firebase Authentication because they check:

- `request.auth.uid` - The authenticated user's ID
- `request.auth != null` - If user is authenticated

Your current hardcoded authentication (`admin-user-001`) doesn't create a real Firebase Auth session, so Storage sees the request as unauthenticated and blocks it.

## Recommended Long-Term Solution

Implement proper Firebase Authentication:

1. Users sign in with Firebase Auth (email/password, Google, etc.)
2. Firebase creates a real authentication token
3. Storage rules can then verify the user's identity
4. Secure rules from `FIREBASE_STORAGE_SECURITY_RULES.md` will work properly

For now, use the temporary rules above to test your upload functionality.
