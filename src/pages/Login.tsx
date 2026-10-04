import { useState, FormEvent } from 'react';
import { auth, db } from '../firebase';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  fetchSignInMethodsForEmail,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Lock, LogIn, AlertCircle, Copy, Check,
  KeyRound, RefreshCw, ArrowLeft, ShieldCheck, User, Info, Globe, Building2
} from 'lucide-react';
import { isUserAdmin } from '../AuthContext';
import { siteSettingsService } from '../services/siteSettingsService';
import { WORLD_COUNTRIES, DEFAULT_SUPPORTED_DELIVERY_COUNTRIES, resolveCanonicalCountryName } from '../utils/countries';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [clientType, setClientType] = useState<'b2c' | 'b2b'>('b2c');
  const [companyName, setCompanyName] = useState('');
  const [ninea, setNinea] = useState('');
  const [rccm, setRccm] = useState('');
  const [defaultCountry, setDefaultCountry] = useState<string>(
    () => siteSettingsService.getSettings()?.defaultClientCountry || 'Sénégal'
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [emailAlreadyUsed, setEmailAlreadyUsed] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Email OTP verification state for registration
  const [step, setStep] = useState<'form' | 'verify_otp'>('form');
  const [otpCode, setOtpCode] = useState('');
  const [generatedFallbackCode, setGeneratedFallbackCode] = useState('');
  const [isSimulatedEmail, setIsSimulatedEmail] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const navigate = useNavigate();
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

  const checkAdminAndRedirect = (userEmail?: string | null) => {
    if (!userEmail) {
      navigate('/account');
      return;
    }
    if (isUserAdmin(userEmail)) {
      navigate('/admin');
    } else {
      navigate('/account');
    }
  };

  // Vérifie si une adresse email est déjà utilisée dans Firebase Auth ou dans la base Firestore (users / admins)
  const checkIfEmailExists = async (rawEmail: string): Promise<boolean> => {
    const cleanEmail = rawEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) return false;

    try {
      // 1. Vérification dans la liste des administrateurs connus
      const adminEmails = (siteSettingsService.getSettings().adminEmails || []).map(e => e.toLowerCase().trim());
      if (adminEmails.includes(cleanEmail) || cleanEmail === 'enitrom@gmail.com') {
        return true;
      }

      // 2. Vérification via Firebase Auth fetchSignInMethodsForEmail
      try {
        const methods = await fetchSignInMethodsForEmail(auth, cleanEmail);
        if (Array.isArray(methods) && methods.length > 0) {
          return true;
        }
      } catch {
        // Ignore Enumeration Protection fallback
      }

      // 3. Vérification dans la collection Firestore 'users' et 'registered_emails'
      const usersSnap = await getDocs(collection(db, 'users'));
      let foundInUsers = false;
      usersSnap.forEach((docSnap) => {
        const d = docSnap.data();
        const docEmail = String(d?.email || d?.emailLower || '').toLowerCase().trim();
        if (docEmail === cleanEmail) {
          foundInUsers = true;
        }
      });
      if (foundInUsers) return true;
    } catch (e) {
      console.warn('Email existence check notice:', e);
    }
    return false;
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setEmailAlreadyUsed(false);
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      checkAdminAndRedirect(result.user.email);
    } catch (err: any) {
      setError(err?.code === 'auth/unauthorized-domain' ? 'unauthorized-domain' : err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyHost = () => {
    if (currentHost) {
      navigator.clipboard.writeText(currentHost);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 3000);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Veuillez saisir votre adresse email ci-dessus pour recevoir le lien de réinitialisation.');
      return;
    }
    try {
      setIsLoading(true);
      setError('');
      await sendPasswordResetEmail(auth, cleanEmail);
      setSuccessMsg(`Un lien de réinitialisation du mot de passe a été envoyé à ${cleanEmail}. Vérifiez votre boîte de réception (et vos spams).`);
    } catch (err: any) {
      setError(parseFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Veuillez renseigner une adresse email valide.');
      return false;
    }

    try {
      setIsLoading(true);
      setError('');
      const resp = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, purpose: 'registration' })
      });
      const data = await resp.json();
      if (data.success) {
        setStep('verify_otp');
        const directCode = data.fallbackCode || data.debugCode || '';
        if (directCode) {
          setGeneratedFallbackCode(directCode);
          setOtpCode(directCode);
          setIsSimulatedEmail(Boolean(data.simulated));
          setSuccessMsg(`Code de confirmation généré avec succès pour ${cleanEmail}.`);
        } else {
          setGeneratedFallbackCode('');
          setIsSimulatedEmail(false);
          setSuccessMsg(`Un code de vérification à 6 chiffres a été envoyé par email à ${cleanEmail}.`);
        }
        setResendCountdown(60);
        const timer = setInterval(() => {
          setResendCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        return true;
      } else {
        setError(data.error || 'Erreur lors de l\'envoi du code.');
        return false;
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur réseau lors de la vérification.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const parseFirebaseError = (err: any): string => {
    const code = err?.code || '';
    const msg = err?.message || '';
    if (code === 'auth/operation-not-allowed' || msg.includes('auth/operation-not-allowed')) {
      return "L'authentification par email/mot de passe n'est pas encore activée dans la console Firebase. Veuillez utiliser le bouton 'Continuer avec Google' ci-dessous.";
    }
    if (code === 'auth/email-already-in-use' || msg.includes('auth/email-already-in-use')) {
      setEmailAlreadyUsed(true);
      setStep('form');
      return "Cette adresse email est déjà utilisée par un compte existant. Veuillez vous connecter ou réinitialiser votre mot de passe.";
    }
    if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password' || msg.includes('auth/invalid-credential')) {
      return "Identifiants incorrects (email ou mot de passe invalide). Si vous n'avez pas de compte, cliquez sur 'Créer un compte'.";
    }
    if (code === 'auth/weak-password' || msg.includes('auth/weak-password')) {
      return "Le mot de passe est trop court (au moins 6 caractères requis).";
    }
    return msg || "Une erreur est survenue lors de l'authentification.";
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setEmailAlreadyUsed(false);

    const cleanEmail = email.trim().toLowerCase();

    if (isLogin) {
      // Direct Login
      try {
        setIsLoading(true);
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        checkAdminAndRedirect(cred.user.email);
      } catch (err: any) {
        setError(parseFirebaseError(err));
      } finally {
        setIsLoading(false);
      }
    } else {
      // Registration validation
      if (password.length < 6) {
        setError('Le mot de passe doit comporter au moins 6 caractères.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Les deux mots de passe saisis ne sont pas identiques. Veuillez vérifier.');
        return;
      }

      // Vérification immédiate si l'adresse email est déjà enregistrée AVANT d'envoyer le code OTP
      setIsLoading(true);
      const alreadyExists = await checkIfEmailExists(cleanEmail);
      if (alreadyExists) {
        setIsLoading(false);
        setEmailAlreadyUsed(true);
        setError(`L'adresse email "${cleanEmail}" est déjà utilisée par un compte existant.`);
        return;
      }

      // Trigger Email OTP step
      await sendOtp();
    }
  };

  const handleVerifyOtpAndRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!otpCode || otpCode.trim().length < 6) {
      setError('Veuillez saisir le code à 6 chiffres.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    try {
      setIsLoading(true);
      const verifyResp = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code: otpCode.trim() })
      });
      const verifyData = await verifyResp.json();

      if (!verifyData.success) {
        setError(verifyData.error || 'Code de vérification invalide.');
        setIsLoading(false);
        return;
      }

      // Code is valid - Create user account in Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);

      if (displayName.trim()) {
        await updateProfile(cred.user, { displayName: displayName.trim() }).catch(() => {});
      }

      const role = isUserAdmin(cleanEmail) ? 'admin' : 'client';
      const resolvedCountry = resolveCanonicalCountryName(defaultCountry) || 'Sénégal';
      let localLikedIds: number[] = [];
      try {
        const rawLiked = localStorage.getItem('ze_liked_products_v1');
        const parsed = rawLiked ? JSON.parse(rawLiked) : [];
        if (Array.isArray(parsed)) localLikedIds = parsed.map((n: any) => Number(n)).filter(Boolean);
      } catch {}

      // Create user profile in Firestore with normalized email and default country
      if (cred.user.uid) {
        const newProfile = {
          uid: cred.user.uid,
          email: cleanEmail,
          emailLower: cleanEmail,
          displayName: displayName.trim() || cred.user.displayName || cleanEmail.split('@')[0],
          clientType: clientType || 'b2c',
          company: clientType === 'b2b' ? companyName.trim() : '',
          ninea: clientType === 'b2b' ? ninea.trim() : '',
          rccm: clientType === 'b2b' ? rccm.trim() : '',
          country: resolvedCountry,
          city: resolvedCountry === 'Sénégal' ? 'Dakar' : '',
          likedProductIds: localLikedIds,
          role,
          emailVerified: true,
          emailVerifiedCustom: true,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', cred.user.uid), newProfile, { merge: true }).catch(() => {});
        try {
          localStorage.setItem('ze_user_profile_v1', JSON.stringify(newProfile));
        } catch {}
      }

      checkAdminAndRedirect(cred.user.email);
    } catch (err: any) {
      setError(parseFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-[#003366] font-roboto">
            {isLogin ? 'Connexion Sécurisée' : step === 'verify_otp' ? 'Vérification Email' : 'Créer un Compte'}
          </h1>
          <p className="text-gray-500 mt-2 text-xs">
            {isLogin 
              ? 'Accédez à votre espace B2B Zone Équipements Sénégal'
              : step === 'verify_otp'
              ? `Entrez le code reçu pour valider votre compte`
              : 'Inscription avec vérification de messagerie & conformité'}
          </p>
        </div>

        {error === 'unauthorized-domain' ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl text-sm mb-6 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold text-amber-800">Domaine non autorisé dans Firebase Auth</strong>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  Firebase bloque Google Sign-in car ce domaine d'aperçu n'est pas encore ajouté à votre console Firebase.
                </p>
              </div>
            </div>

            <div className="bg-white/80 border border-amber-300/60 p-2.5 rounded-lg flex items-center justify-between gap-2">
              <code className="text-xs font-mono text-gray-800 break-all select-all font-semibold">
                {currentHost}
              </code>
              <button
                type="button"
                onClick={handleCopyHost}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded flex items-center gap-1 shrink-0 transition"
              >
                {copiedDomain ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedDomain ? 'Copié' : 'Copier'}
              </button>
            </div>

            <p className="text-[11px] text-amber-700 leading-tight">
              Pour activer Google Sign-in : ouvrez la Console Firebase &gt; Authentication &gt; Paramètres &gt; Domaines autorisés.
            </p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl text-xs mb-6 font-semibold space-y-2.5 border border-red-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
            {emailAlreadyUsed && (
              <div className="pt-2 border-t border-red-200/80 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setStep('form');
                    setError('');
                    setEmailAlreadyUsed(false);
                  }}
                  className="px-3 py-1.5 bg-[#003366] hover:bg-[#002244] text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Se connecter avec cet email</span>
                </button>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="px-3 py-1.5 bg-white hover:bg-red-100 text-red-700 border border-red-300 rounded-lg font-bold text-[11px] cursor-pointer transition-colors"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            )}
          </div>
        ) : null}

        {successMsg && (
          <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-xs mb-6 font-semibold flex items-center gap-2 border border-emerald-200">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: FORM (Login or Register) */}
        {step === 'form' ? (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {!isLogin && (
              <>
                {/* Type de Client : Particulier ou Entreprise */}
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1.5">Vous êtes : *</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setClientType('b2c')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        clientType === 'b2c'
                          ? 'bg-[#003366] text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Particulier</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientType('b2b')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        clientType === 'b2b'
                          ? 'bg-[#003366] text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Entreprise (B2B)</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">
                    {clientType === 'b2b' ? 'Nom du Représentant / Acheteur *' : 'Nom & Prénom *'}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FF6600] focus:border-transparent outline-none text-xs"
                      placeholder={clientType === 'b2b' ? 'Ex: Babacar Sarr (Responsable Achats)' : 'Ex: Babacar Sarr'}
                    />
                  </div>
                </div>

                {clientType === 'b2b' && (
                  <div className="space-y-3 p-3 bg-blue-50/70 border border-blue-200 rounded-xl animate-fadeIn">
                    <div>
                      <label className="block font-bold text-[#003366] uppercase mb-1">Raison Sociale / Société *</label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          required
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-[#003366] outline-none text-xs text-gray-900 font-semibold"
                          placeholder="Ex: Sahel BTP Industries SA"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-gray-700 text-[10px] uppercase mb-1">NINEA (Fiscal)</label>
                        <input
                          type="text"
                          value={ninea}
                          onChange={(e) => setNinea(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-gray-300 bg-white rounded-lg font-mono text-xs text-gray-900 focus:outline-none focus:border-[#003366]"
                          placeholder="008921822"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 text-[10px] uppercase mb-1">RCCM (Commerce)</label>
                        <input
                          type="text"
                          value={rccm}
                          onChange={(e) => setRccm(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-gray-300 bg-white rounded-lg font-mono text-xs text-gray-900 focus:outline-none focus:border-[#003366]"
                          placeholder="SN-DKR-2024-B-14892"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Pays par défaut (Livraison) *</label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      value={defaultCountry}
                      onChange={(e) => setDefaultCountry(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FF6600] focus:border-transparent outline-none text-xs bg-white font-semibold"
                    >
                      <optgroup label="Pays pris en charge pour la livraison directe">
                        {(siteSettingsService.getSettings()?.supportedDeliveryCountries || DEFAULT_SUPPORTED_DELIVERY_COUNTRIES).map(c => (
                          <option key={`sup-${c}`} value={c}>{c} (Livraison prise en charge)</option>
                        ))}
                      </optgroup>
                      <optgroup label="Tous les pays">
                        {WORLD_COUNTRIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Ce pays sera utilisé automatiquement lors de vos commandes si vous n'en renseignez pas un nouveau.
                  </p>
                </div>
              </>
            )}

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Adresse Email *</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailAlreadyUsed) setEmailAlreadyUsed(false);
                  }}
                  onBlur={async () => {
                    if (!isLogin && email.trim().includes('@')) {
                      const used = await checkIfEmailExists(email);
                      if (used) {
                        setEmailAlreadyUsed(true);
                        setError(`L'adresse email "${email.trim().toLowerCase()}" est déjà associée à un compte existant.`);
                      }
                    }
                  }}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#FF6600] focus:border-transparent outline-none text-xs ${
                    emailAlreadyUsed ? 'border-red-400 bg-red-50/30' : 'border-gray-300'
                  }`}
                  placeholder="contact@entreprise.sn"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-gray-700 uppercase">Mot de passe *</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[11px] font-bold text-[#FF6600] hover:underline cursor-pointer"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FF6600] focus:border-transparent outline-none text-xs"
                  placeholder="••••••••"
                  required
                />
              </div>
              {!isLogin && (
                <p className="text-[10px] text-gray-400 mt-1">Au moins 6 caractères.</p>
              )}
            </div>

            {/* Repeat Password Field for Registration */}
            {!isLogin && (
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Confirmer le Mot de passe *</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#FF6600] focus:border-transparent outline-none text-xs ${
                      confirmPassword && password !== confirmPassword ? 'border-red-300 bg-red-50/30' : 'border-gray-300'
                    }`}
                    placeholder="•••••••• (Répétez le mot de passe)"
                    required
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-[10px] text-red-600 mt-1 font-semibold">Les mots de passe ne correspondent pas.</p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="text-[10px] text-emerald-600 mt-1 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Mots de passe identiques
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || (!isLogin && Boolean(confirmPassword && password !== confirmPassword))}
              className="w-full bg-[#003366] hover:bg-[#002244] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md text-xs uppercase tracking-wider"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : isLogin ? (
                <>
                  <LogIn className="w-4 h-4" /> Se Connecter
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" /> Continuer & Vérifier l'Email
                </>
              )}
            </button>
          </form>
        ) : (
          /* STEP 2: VERIFY OTP CODE */
          <form onSubmit={handleVerifyOtpAndRegister} className="space-y-4 text-xs animate-fadeIn">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-[#003366] mx-auto" />
              <p className="text-gray-700 text-xs">
                Saisissez le code de validation à 6 chiffres pour <strong>{email}</strong>
              </p>
            </div>

            {generatedFallbackCode && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    Code de validation directe :
                  </span>
                  <button
                    type="button"
                    onClick={() => setOtpCode(generatedFallbackCode)}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-mono font-black text-xs tracking-widest cursor-pointer"
                  >
                    {generatedFallbackCode} (Appliqué)
                  </button>
                </div>
                {isSimulatedEmail && (
                  <p className="text-[10px] text-amber-800 leading-relaxed flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Aucun service payant n'est requis (0 FCFA) :</strong> pour recevoir aussi ce code par email sur Gmail, configurez simplement un <em>Mot de passe d'application Google gratuit</em> dans <strong>Admin &gt; Sécurité</strong>.
                    </span>
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1 text-center">Code de Vérification Email</label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full py-3 px-4 text-center font-mono text-2xl font-black tracking-[0.3em] border-2 border-[#FF6600] rounded-xl focus:outline-none focus:ring-4 focus:ring-orange-500/20"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otpCode.length < 6}
              className="w-full bg-[#FF6600] hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-600/30 text-xs uppercase tracking-wider"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" /> Valider mon Compte
                </>
              )}
            </button>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 cursor-pointer font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Modifier mes infos
              </button>

              <button
                type="button"
                onClick={sendOtp}
                disabled={resendCountdown > 0 || isLoading}
                className="text-xs text-[#FF6600] hover:underline disabled:opacity-50 font-bold cursor-pointer"
              >
                {resendCountdown > 0 ? `Renvoyer le code (${resendCountdown}s)` : 'Renvoyer un code'}
              </button>
            </div>
          </form>
        )}

        {step === 'form' && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-gray-400 font-bold uppercase tracking-wider">Ou continuer avec</span>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
              <span>Continuer avec Google</span>
            </button>

            <p className="text-center mt-6 text-xs text-gray-600">
              {isLogin ? "Pas encore de compte ?" : "Vous avez déjà un compte ?"}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setSuccessMsg('');
                }}
                className="ml-1 text-[#FF6600] font-extrabold hover:underline cursor-pointer"
              >
                {isLogin ? "Créer un compte" : "Se connecter"}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
