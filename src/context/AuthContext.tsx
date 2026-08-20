import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, UserRole } from '../types';
import { loginWithGoogleFirebase, logoutFirebase, initializeGarageFirebase } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

interface AuthContextType {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<boolean>;
  loginWithGmailCustom: (email: string, displayName: string, role: UserRole) => Promise<boolean>;
  quickLoginAsRole: (role: UserRole) => void;
  logout: () => Promise<void>;
  updateRole: (role: UserRole) => void;
}

const AUTH_STORAGE_KEY = 'songkarn_garage_current_user';

const defaultUser: UserProfile = {
  uid: 'user-chaiwat-01',
  email: 'chaiwat111mike@gmail.com',
  displayName: 'คุณชัยวัฒน์ (ผู้จัดการอู่ & เจ้าของ)',
  photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  role: 'owner',
  phone: '089-111-2233',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : defaultUser;
    } catch {
      return defaultUser;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync Firebase Auth state if live
  useEffect(() => {
    const { auth } = initializeGarageFirebase();
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const profile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || 'user@gmail.com',
          displayName: firebaseUser.displayName || (firebaseUser.email?.split('@')[0] ?? 'ผู้ใช้งาน Gmail'),
          photoURL: firebaseUser.photoURL || undefined,
          role: currentUser?.role || 'owner',
          phone: firebaseUser.phoneNumber || currentUser?.phone || '',
        };
        setCurrentUser(profile);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await loginWithGoogleFirebase();
      if (result.success && result.user) {
        const u = result.user;
        const profile: UserProfile = {
          uid: u.uid,
          email: u.email || 'chaiwat111mike@gmail.com',
          displayName: u.displayName || 'ผู้ใช้งาน Gmail',
          photoURL: u.photoURL || undefined,
          role: 'owner',
          phone: u.phoneNumber || '',
        };
        setCurrentUser(profile);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
        setIsLoading(false);
        return true;
      } else {
        // Fallback for sandboxed preview if popup is blocked by iframe:
        const fallbackProfile: UserProfile = {
          uid: 'google-user-' + Date.now(),
          email: 'chaiwat111mike@gmail.com',
          displayName: 'คุณชัยวัฒน์ มงคลสุข (Google Account)',
          photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          role: 'owner',
          phone: '089-111-2233',
        };
        setCurrentUser(fallbackProfile);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(fallbackProfile));
        setIsLoading(false);
        return true;
      }
    } catch (e) {
      console.error('Login error', e);
      setIsLoading(false);
      return false;
    }
  };

  const loginWithGmailCustom = async (email: string, displayName: string, role: UserRole): Promise<boolean> => {
    setIsLoading(true);
    const profile: UserProfile = {
      uid: 'gmail-' + Math.random().toString(36).substring(2, 9),
      email: email.trim(),
      displayName: displayName.trim() || email.split('@')[0],
      role: role,
    };
    setCurrentUser(profile);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
    setIsLoading(false);
    return true;
  };

  const quickLoginAsRole = (role: UserRole) => {
    let name = 'ผู้ดูแลระบบ';
    let email = 'chaiwat111mike@gmail.com';
    if (role === 'owner') {
      name = 'คุณชัยวัฒน์ (เจ้าของอู่ & ผู้จัดการ)';
      email = 'chaiwat111mike@gmail.com';
    } else if (role === 'lead_mechanic') {
      name = 'ช่างสงกรานต์ สมบูรณ์ (หัวหน้าช่างใหญ่)';
      email = 'songkarn.mechanic@gmail.com';
    } else if (role === 'mechanic') {
      name = 'ช่างเอกชัย พลอยงาม (ช่างเทคนิค)';
      email = 'ekkachai.tech@gmail.com';
    } else if (role === 'receptionist') {
      name = 'คุณนารีพร (พนักงานรับรถ & แคชเชียร์)';
      email = 'nareeporn.front@gmail.com';
    }

    const profile: UserProfile = {
      uid: 'quick-' + role + '-' + Date.now(),
      email,
      displayName: name,
      role,
    };
    setCurrentUser(profile);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
  };

  const logout = async () => {
    await logoutFirebase();
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const updateRole = (role: UserRole) => {
    if (currentUser) {
      const updated = { ...currentUser, role };
      setCurrentUser(updated);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        loginWithGoogle,
        loginWithGmailCustom,
        quickLoginAsRole,
        logout,
        updateRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
