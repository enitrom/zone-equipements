import { useState, FormEvent } from 'react';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, Copy, Check, ExternalLink } from 'lucide-react';
import { ADMIN_EMAILS } from '../AuthContext';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [copiedDomain, setCopiedDomain] = useState(false);
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
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      checkAdminAndRedirect(result.user.email);
    } catch (err: any) {
      setError(err?.code === 'auth/unauthorized-domain' ? 'unauthorized-domain' : err.message);
    }
  };

  const handleCopyHost = () => {
    if (currentHost) {
      navigator.clipboard.writeText(currentHost);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 3000);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      let loggedEmail = email;
      if (isLogin) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        loggedEmail = cred.user.email || email;
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        loggedEmail = cred.user.email || email;
      }
      checkAdminAndRedirect(loggedEmail);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#003366] font-roboto">
            {isLogin ? 'Connexion' : 'Créer un compte'}
          </h1>
          <p className="text-gray-500 mt-2">Accédez à votre espace Zone Équipements Sénégal</p>
        </div>

        {error === 'unauthorized-domain' ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl text-sm mb-6 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold text-amber-800">Domaine non autorisé dans Firebase Auth</strong>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  Firebase bloque Google Sign-in car ce nouveau domaine d'aperçu n'est pas encore ajouté à votre console Firebase.
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
              Pour activer Google Sign-in : ouvrez la{' '}
              <a
                href="https://console.firebase.google.com/project/gen-lang-client-0056069024/authentication/settings"
                target="_blank"
                rel="noreferrer"
                className="underline font-bold inline-flex items-center gap-0.5 text-amber-900 hover:text-amber-950"
              >
                Console Firebase <ExternalLink className="w-3 h-3 inline" />
              </a>{' '}
              &gt; Authentication &gt; Paramètres &gt; <strong>Domaines autorisés</strong> &gt; Ajouter ce domaine.
            </p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6600] focus:border-transparent outline-none"
                placeholder="votre@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6600] focus:border-transparent outline-none"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#003366] hover:bg-[#002244] text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            {isLogin ? 'Se connecter' : "S'inscrire"}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500 uppercase text-xs font-semibold">Ou continuer avec</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Google
        </button>

        <p className="text-center mt-6 text-sm text-gray-600">
          {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="ml-1 text-[#FF6600] font-bold hover:underline"
          >
            {isLogin ? "S'inscrire" : "Se connecter"}
          </button>
        </p>
      </div>
    </div>
  );
}
