import React, { useState, useEffect } from 'react';
import {
  Activity, Globe, Smartphone, Monitor, Search,
  Eye, TrendingUp, Sparkles, RefreshCw, Users, ShieldAlert,
  ArrowUpRight, Clock, MapPin, Zap
} from 'lucide-react';
import { analyticsTracker } from '../../services/analyticsTracker';

export default function AnalyticsTrafficManager() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchStats = async () => {
    setLoading(true);
    const data = await analyticsTracker.getStats();
    if (data) {
      setStats(data);
      setLastRefreshed(new Date());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchStats();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Top Header Card */}
      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
              Surveillance du Trafic en Temps Réel
            </span>
          </div>
          <h2 className="text-xl font-black text-white font-roboto">
            Trafic Réel, Mots-clés & Comportement Utilisateur
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Données de fréquentation globale, géolocalisation des IP, équipements les plus consultés et analyse des recherches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#FF6600] rounded"
            />
            <span>Auto-actualiser (15s)</span>
          </label>

          <button
            type="button"
            onClick={fetchStats}
            disabled={loading}
            className="px-3.5 py-1.5 bg-[#003366] hover:bg-[#004488] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-blue-500/30 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Visiteurs en Direct</span>
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {stats?.liveVisitorsCount ?? 1}
          </div>
          <span className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
            ● Actifs sur le site durant les 5 dernières minutes
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Visites Aujourd'hui</span>
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {stats?.totalVisitsToday ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {stats?.uniqueVisitorsCount ?? 0} sessions uniques enregistrées
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Trafic 7 Jours</span>
            <div className="p-2 bg-orange-500/20 text-orange-400 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {stats?.totalVisitsWeek ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Total 30j : {stats?.totalVisitsMonth ?? 0} visites
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Cumulé</span>
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {stats?.totalVisitsAllTime ?? 0}
          </div>
          <span className="text-[10px] text-purple-300 mt-1 block">
            Trafic global depuis lancement
          </span>
        </div>
      </div>

      {/* Smart Intelligence & Growth Suggestions */}
      {stats?.smartSuggestions && stats.smartSuggestions.length > 0 && (
        <div className="bg-gradient-to-br from-slate-900 via-[#002244] to-slate-950 p-6 rounded-2xl border border-blue-500/30 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-[#FF6600]">
            <Sparkles className="w-5 h-5" />
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Suggestions Intelligentes d'Amélioration & Stratégie Produits
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {stats.smartSuggestions.map((sug: string, i: number) => (
              <div key={i} className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-200 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#FF6600]/20 text-[#FF6600] font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  {i + 1}
                </span>
                <p className="leading-relaxed">{sug}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Geographic & Devices Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Countries Breakdown */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" /> Répartition Géographique des Visites
            </h3>
            <span className="text-xs text-slate-400 font-mono">Top Pays</span>
          </div>

          <div className="space-y-2.5">
            {stats?.topCountries && stats.topCountries.length > 0 ? (
              stats.topCountries.map((c: any, idx: number) => {
                const total = stats.totalVisitsAllTime || 1;
                const pct = Math.min(100, Math.round((c.count / total) * 100));
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-200">{c.country}</span>
                      <span className="text-slate-400 font-mono font-bold">{c.count} visites ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.max(5, pct)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-slate-500 py-4 text-center">Aucune donnée géographique enregistrée.</div>
            )}
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-orange-400" /> Appareils & Terminaux Utilisés
            </h3>
            <span className="text-xs text-slate-400 font-mono">Mobiles vs Ordinateurs</span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {stats?.topDevices?.map((dev: any, idx: number) => (
              <div key={idx} className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-center space-y-2">
                <div className="mx-auto w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-slate-300">
                  {dev.device === 'Mobile' ? <Smartphone className="w-4 h-4 text-[#FF6600]" /> : dev.device === 'Desktop' ? <Monitor className="w-4 h-4 text-blue-400" /> : <Monitor className="w-4 h-4 text-purple-400" />}
                </div>
                <div className="text-xs font-bold text-white">{dev.device}</div>
                <div className="text-xl font-black font-mono text-[#FF6600]">{dev.percent || 0}%</div>
                <div className="text-[10px] text-slate-500 font-mono">{dev.count} visites</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Keywords & Top Products Viewed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Keywords */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Search className="w-4 h-4 text-emerald-400" /> Mots-clés de la Barre de Recherche
            </h3>
            <span className="text-xs text-slate-400 font-mono">Fréquence</span>
          </div>

          {stats?.topSearchKeywords && stats.topSearchKeywords.length > 0 ? (
            <div className="divide-y divide-slate-800 text-xs">
              {stats.topSearchKeywords.map((k: any, idx: number) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[10px] text-slate-500">#{idx + 1}</span>
                    <span className="font-bold text-white truncate">« {k.query} »</span>
                    {k.hadResults === false && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 shrink-0">
                        0 Résultat
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0 font-mono">
                    <span className="text-emerald-400 font-bold">{k.count} recherche{k.count > 1 ? 's' : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-6 text-center">
              Les recherches tapées dans la barre de recherche apparaîtront ici automatiquement.
            </div>
          )}
        </div>

        {/* Top Viewed Products */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#FF6600]" /> Équipements les Plus Consultés
            </h3>
            <span className="text-xs text-slate-400 font-mono">Vues réelles</span>
          </div>

          {stats?.topViewedProducts && stats.topViewedProducts.length > 0 ? (
            <div className="divide-y divide-slate-800 text-xs">
              {stats.topViewedProducts.map((p: any, idx: number) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[10px] text-slate-500">#{idx + 1}</span>
                    <div className="truncate">
                      <span className="font-bold text-white block truncate">{p.name}</span>
                      {p.category && <span className="text-[10px] text-slate-400">{p.category}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 font-mono">
                    <span className="text-orange-400 font-bold">{p.views} vue{p.views > 1 ? 's' : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-6 text-center">
              Les fiches produits ouvertes par les clients apparaîtront ici en temps réel.
            </div>
          )}
        </div>
      </div>

      {/* Recent Visits Real-Time Feed */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" /> Journal Récent des Visites (IP & Pages)
          </h3>
          <span className="text-xs text-slate-400 font-mono">Dernières 50 sessions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 px-3 font-semibold">Date & Heure</th>
                <th className="py-2 px-3 font-semibold">IP Anonymisée</th>
                <th className="py-2 px-3 font-semibold">Pays / Marché</th>
                <th className="py-2 px-3 font-semibold">Appareil</th>
                <th className="py-2 px-3 font-semibold">Page Consultée</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {stats?.recentVisits && stats.recentVisits.length > 0 ? (
                stats.recentVisits.slice(0, 25).map((v: any) => (
                  <tr key={v.id} className="hover:bg-slate-950/50 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 font-sans">
                      {new Date(v.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-bold">{v.ip}</td>
                    <td className="py-2.5 px-3 text-white font-sans">{v.country}</td>
                    <td className="py-2.5 px-3 text-slate-300 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        v.device === 'Mobile' ? 'bg-orange-500/20 text-orange-300' : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {v.device}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 truncate max-w-[200px]" title={v.path}>
                      {v.path}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                    En attente de nouvelles visites...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
