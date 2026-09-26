import { useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Package, Settings, Shield } from 'lucide-react';

export default function Account() {
  const { user, profile, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) return <div className="p-20 text-center">Chargement...</div>;
  if (!user) return null;

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar */}
        <aside className="md:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-[#003366] mb-4">
                <User className="w-10 h-10" />
              </div>
              <h2 className="font-bold text-lg">{profile?.displayName || 'Utilisateur'}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>

            <nav className="space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg bg-blue-50 text-[#003366] font-bold">
                <User className="w-5 h-5" /> Profil
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
                <Package className="w-5 h-5" /> Mes Commandes
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
                <Settings className="w-5 h-5" /> Paramètres
              </button>

              {isAdmin && (
                <button 
                  onClick={() => navigate('/admin')}
                  className="w-full flex items-center gap-3 px-4 py-2 rounded-lg bg-orange-50 text-[#FF6600] font-bold hover:bg-orange-100 transition-colors"
                >
                  <Shield className="w-5 h-5 text-[#FF6600]" /> Gestion & Sourcing
                </button>
              )}

              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-5 h-5" /> Déconnexion
              </button>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="md:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h1 className="text-2xl font-bold text-[#003366] mb-8 font-roboto">Tableau de bord</h1>
            
            {isAdmin && (
              <div className="mb-8 p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-500 shrink-0">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white">Console Privée d'Administration</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Gestion du catalogue, import de produits, commandes clients et devises</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/admin')}
                    className="px-5 py-2.5 bg-[#FF6600] hover:bg-orange-600 text-white text-xs font-bold rounded-xl uppercase tracking-wider transition-all self-start sm:self-auto cursor-pointer"
                  >
                    Ouvrir le Back-Office &rarr;
                  </button>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-6 border border-gray-100 rounded-xl bg-gray-50">
                <h3 className="font-bold text-gray-500 text-sm uppercase mb-2">Commandes en cours</h3>
                <p className="text-3xl font-black text-[#003366]">0</p>
              </div>
              <div className="p-6 border border-gray-100 rounded-xl bg-gray-50">
                <h3 className="font-bold text-gray-500 text-sm uppercase mb-2">Points Fidélité</h3>
                <p className="text-3xl font-black text-[#FF6600]">150</p>
              </div>
            </div>

            <div className="mt-12">
              <h2 className="text-xl font-bold text-[#003366] mb-6">Dernières activités</h2>
              <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                Aucune activité récente.
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
