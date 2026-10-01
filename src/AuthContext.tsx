import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { siteSettingsService } from './services/siteSettingsService';

// Seul l'administrateur propriétaire principal est irrévocable.
// Tous les autres administrateurs sont gérés dynamiquement dans Paramètres > Sécurité.
export const ADMIN_EMAILS = [
  'enitrom@gmail.com',
];

export const isUserAdmin = (email?: string | null, _role?: string | null): boolean => {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  if (ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === normalized)) {
    return true;
  }
  const settings = siteSettingsService.getSettings();
  const deletedAdmins = (settings?.deletedAdminEmails || []).map(e => e.toLowerCase().trim());
  if (deletedAdmins.includes(normalized)) {
    return false;
  }
  const dynamicAdmins = settings?.adminEmails || [];
  return dynamicAdmins.some(adminEmail => adminEmail.toLowerCase().trim() === normalized);
};

function silentRedirectFromAdminIfRevoked() {
  if (typeof window === 'undefined') return;
  if (window.location.pathname.startsWith('/admin')) {
    window.history.replaceState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
  isAuthReady?: boolean;
  refreshProfile?: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isAuthReady: false,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminList, setAdminList] = useState<string[]>(() => siteSettingsService.getSettings()?.adminEmails || ADMIN_EMAILS);

  // Synchroniser en temps réel la liste des administrateurs depuis les paramètres du site
  useEffect(() => {
    const syncAdmins = () => {
      const currentSettings = siteSettingsService.getSettings();
      if (currentSettings && Array.isArray(currentSettings.adminEmails)) {
        setAdminList(currentSettings.adminEmails);
      }
      // Si l'utilisateur connecté n'est plus autorisé comme admin, rétrograder immédiatement et rediriger silencieusement
      if (auth.currentUser?.email) {
        const stillAdmin = isUserAdmin(auth.currentUser.email);
        if (!stillAdmin) {
          setProfile((prev: any) => (prev && prev.role === 'admin' ? { ...prev, role: 'client' } : prev));
          silentRedirectFromAdminIfRevoked();
        }
      }
    };

    const unsub = siteSettingsService.subscribe(syncAdmins);
    window.addEventListener('ze_settings_updated', syncAdmins);
    return () => {
      unsub();
      window.removeEventListener('ze_settings_updated', syncAdmins);
    };
  }, []);

  // Nettoyer les anciens artefacts de verrou temporaire en local
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

  const refreshProfile = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        const shouldBeAdmin = isUserAdmin(currentUser.email);
        const effectiveRole = shouldBeAdmin ? 'admin' : 'client';
        setProfile({ ...data, role: effectiveRole });
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }

      setUser(firebaseUser);
      if (firebaseUser) {
        const userEmail = firebaseUser.email?.toLowerCase().trim() || '';
        const shouldBeAdmin = isUserAdmin(userEmail);
        const effectiveRole = shouldBeAdmin ? 'admin' : 'client';

        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            const data = userDoc.data();
            // Synchroniser strictement le rôle dans Firestore (promotion OU révocation d'un ancien admin supprimé)
            if (data.role !== effectiveRole || data.emailLower !== userEmail) {
              await updateDoc(userRef, {
                role: effectiveRole,
                email: userEmail || data.email,
                emailLower: userEmail
              }).catch(() => {});
            }
            setProfile({ ...data, role: effectiveRole, email: userEmail || data.email });
          } else {
            const newProfile = {
              uid: firebaseUser.uid,
              email: userEmail,
              emailLower: userEmail,
              displayName: firebaseUser.displayName || '',
              role: effectiveRole,
              createdAt: new Date().toISOString(),
            };
            await setDoc(userRef, newProfile).catch(() => {});
            setProfile(newProfile);
          }

          // Écoute temps réel sur le document utilisateur pour détecter toute révocation instantanée
          unsubUserDoc = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
              const liveData = snap.data();
              const liveAllowed = isUserAdmin(firebaseUser.email || liveData.email);
              const liveRole = liveAllowed ? 'admin' : 'client';
              setProfile({ ...liveData, role: liveRole });
              if (!liveAllowed) {
                silentRedirectFromAdminIfRevoked();
              }
            }
          }, () => {});
        } catch (err) {
          console.warn("Profil Firestore indisponible, utilisation du profil direct de session.");
          setProfile({
            uid: firebaseUser.uid,
            email: userEmail,
            displayName: firebaseUser.displayName || '',
            role: effectiveRole,
            createdAt: new Date().toISOString(),
          });
        }

        if (!shouldBeAdmin) {
          silentRedirectFromAdminIfRevoked();
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, [adminList]);

  // Détection stricte et réactive du statut administrateur (ne se fie jamais à un ancien role='admin' si l'email a été supprimé)
  const userEmail = user?.email?.toLowerCase().trim() || '';
  const isAdmin = Boolean(user && userEmail && isUserAdmin(userEmail));

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, isAuthReady: !loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

