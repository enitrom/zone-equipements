import { useState, FormEvent } from 'react';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Lock, LogIn, UserPlus, AlertCircle, Copy, Check,
  ExternalLink, KeyRound, RefreshCw, ArrowLeft, ShieldCheck, User
} from 'lucide-react';
import { ADMIN_EMAILS } from '../AuthContext';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Email OTP verification state for registration
  const [step, setStep] = useState<'form' | 'verify_otp'>('form');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const navigate = useNavigate();
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

  const checkAdminAndRedirect = (userEmail?: string | null) => {
    if (!userEmail) {
      navigate('/account');
      return;
    }
    const cleanEmail = userEmail.toLowerCase().trim();
    if (ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === cleanEmail)) {
      navigate('/admin');
    } else {
      navigate('/account');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
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

  const sendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Veuillez renseigner une adresse email valide.');
      return false;
    }

    try {
      setIsLoading(true);
      setError('');
      const resp = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, purpose: 'registration' })
      });
      const data = await resp.json();
      if (data.success) {
        setOtpSent(true);
        setStep('verify_otp');
        setSuccessMsg(`Un code de vérification à 6 chiffres a été envoyé à ${cleanEmail}.`);
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (isLogin) {
      // Direct Login
      try {
        setIsLoading(true);
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        checkAdminAndRedirect(cred.user.email);
      } catch (err: any) {
        setError(err.message === 'Firebase: Error (auth/invalid-credential).' ? 'Identifiants incorrects (email ou mot de passe invalide).' : err.message);
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

      // Trigger Email OTP step
      await sendOtp();
    }
  };

  const handleVerifyOtpAndRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!otpCode || otpCode.trim().length < 6) {
      setError('Veuillez saisir le code à 6 chiffres reçu par email.');
      return;
    }

    try {
      setIsLoading(true);
      const verifyResp = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: otpCode.trim() })
      });
      const verifyData = await verifyResp.json();

      if (!verifyData.success) {
        setError(verifyData.error || 'Code de vérification invalide.');
        setIsLoading(false);
        return;
      }

      // Code is valid - Create user account in Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      
      if (displayName.trim()) {
        await updateProfile(cred.user, { displayName: displayName.trim() }).catch(() => {});
      }

      // Create user profile in Firestore
      if (cred.user.uid) {
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: displayName.trim() || cred.user.displayName || '',
          emailVerified: true,
          createdAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      }

      checkAdminAndRedirect(cred.user.email);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la création du compte.');
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
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs mb-6 font-semibold flex items-center gap-2 border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
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
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Nom Complet ou Société</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FF6600] focus:border-transparent outline-none text-xs"
                    placeholder="Ex: Babacar Sarr / Sahel BTP"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Adresse Email *</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FF6600] focus:border-transparent outline-none text-xs"
                  placeholder="contact@entreprise.sn"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Mot de passe *</label>
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
                Saisissez le code de validation à 6 chiffres envoyé à <strong>{email}</strong>
              </p>
            </div>

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
