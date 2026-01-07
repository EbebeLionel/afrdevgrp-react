import { auth, db } from '../firebase';
import { User } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

export interface UserData {
  uid: string;
  email: string;
  name: string;
  birthday: string;
  school: string;
  createdAt: Timestamp;
  isAdmin?: boolean;
}

/**
 * Get the current authenticated user
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Get user's email
 */
export async function getEmail(): Promise<string | null> {
  const user = getCurrentUser();
  return user ? user.email : null;
}

/**
 * Get user's display name
 */
export async function getName(): Promise<string | null> {
  const user = getCurrentUser();
  if (!user) return null;
  
  // Try to get from Firestore first
  const userData = await getUserData();
  return userData?.name || user.displayName;
}

/**
 * Get user's birthday from Firestore
 */
export async function getBirthday(): Promise<string | null> {
  return await getUserCustomData('birthday');
}

/**
 * Get user's school from Firestore
 */
export async function getSchool(): Promise<string | null> {
  return await getUserCustomData('school');
}

/**
 * Get custom user data from Firestore
 */
export async function getUserCustomData(field: 'birthday' | 'school'): Promise<string | null> {
  const user = getCurrentUser();
  if (!user) {
    console.warn('No user is currently signed in.');
    return null;
  }

  const userDocRef = doc(db, 'users', user.uid);
  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data()?.[field] || null;
    } else {
      console.log('No custom user data found for this user.');
      return null;
    }
  } catch (error) {
    console.error('Error fetching custom user data:', error);
    return null;
  }
}

/**
 * Get complete user data from Firestore
 */
export async function getUserData(): Promise<UserData | null> {
  const user = getCurrentUser();
  if (!user) {
    console.warn('No user is currently signed in.');
    return null;
  }

  const userDocRef = doc(db, 'users', user.uid);
  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserData;
    } else {
      console.log('No user data found in Firestore.');
      return null;
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
}

/**
 * Create user profile in Firestore
 */
export async function createUserProfile(
  uid: string,
  email: string,
  name: string,
  birthday: string,
  school: string
): Promise<void> {
  const userDocRef = doc(db, 'users', uid);
  
  const userData: UserData = {
    uid,
    email,
    name,
    birthday,
    school,
    createdAt: Timestamp.now(),
    isAdmin: false
  };

  try {
    await setDoc(userDocRef, userData);
    console.log('User profile created successfully');
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
}

/**
 * Check if user is admin
 */
export async function isUserAdmin(): Promise<boolean> {
  const userData = await getUserData();
  return userData?.isAdmin || false;
}