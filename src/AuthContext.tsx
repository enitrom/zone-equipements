import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';

export const ADMIN_EMAILS = [
  'enitrom@gmail.com',
  'tinemor89@gmail.com',
];

export const isUserAdmin = (email?: string | null, role?: string | null): boolean => {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  if (ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === normalized)) {
    return true;
  }
  return role === 'admin' || role === 'superadmin';
};

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Nettoyer les anciens artefacts de clé ou de verrou temporaire en local
  useEffect(() => {
    try {
      localStorage.removeItem('ze_admin_auth_token');
      localStorage.removeItem('ze_admin_custom_key');
      localStorage.removeItem('ze_admin_key_enabled');
      localStorage.removeItem('ze_admin_auth');
      sessionStorage.removeItem('ze_admin_temp_lock');
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userEmail = firebaseUser.email?.toLowerCase().trim() || '';
        const shouldBeAdmin = ADMIN_EMAILS.some(e => e.toLowerCase() === userEmail);

        try {
          // Get profile
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            // Si le compte est un compte admin autorisé mais que son rôle était resté 'client', on le met à niveau
            if (shouldBeAdmin && data.role !== 'admin') {
              await updateDoc(userRef, { role: 'admin' }).catch(() => {});
              setProfile({ ...data, role: 'admin' });
            } else {
              setProfile(data);
            }
          } else {
            const newProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || '',
              role: shouldBeAdmin ? 'admin' : 'client',
              createdAt: new Date().toISOString(),
            };
            await setDoc(userRef, newProfile).catch(() => {});
            setProfile(newProfile);
          }
        } catch (err) {
          console.warn("Profil Firestore indisponible, utilisation du profil direct de session.");
          setProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            role: shouldBeAdmin ? 'admin' : 'client',
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Détection stricte et directe du statut administrateur
  const isAdmin = isUserAdmin(user?.email, profile?.role);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
