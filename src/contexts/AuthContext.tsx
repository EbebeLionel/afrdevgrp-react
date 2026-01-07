import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase';
import { UserData, getUserData, createUserProfile } from '../services/userService';

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  signup: (email: string, password: string, name: string, birthday: string, school: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Sign up a new user
   */
  async function signup(
    email: string,
    password: string,
    name: string,
    birthday: string,
    school: string
  ): Promise<void> {
    try {
      // Create authentication account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name in Firebase Auth
      await updateProfile(user, {
        displayName: name
      });

      // Create user profile in Firestore
      await createUserProfile(user.uid, email, name, birthday, school);

      // Fetch and set user data
      const data = await getUserData();
      setUserData(data);
    } catch (error) {
      console.error('Error during signup:', error);
      throw error;
    }
  }

  /**
   * Log in an existing user
   */
  async function login(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // User data will be fetched in the onAuthStateChanged listener
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  }

  /**
   * Log out the current user
   */
  async function logout(): Promise<void> {
    try {
      await signOut(auth);
      setUserData(null);
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  }

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Fetch user data from Firestore
        try {
          const data = await getUserData();
          setUserData(data);
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    userData,
    loading,
    signup,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}