import React, { useState, useEffect, useMemo } from 'react';
import { 
  Mail, Users, Tag, Send, Copy, Check, Download, Trash2, Search, 
  Filter, Plus, RefreshCw, MessageSquare, ShieldCheck, Sparkles, 
  ExternalLink, FileSpreadsheet, ArrowRight, CheckCircle2, AlertCircle
} from 'lucide-react';
import { 
  siteSettingsService, NewsletterSubscriber, PromoCode 
} from '../../services/siteSettingsService';
import { catalogService, Order } from '../../services/catalogService';

interface EmailContact {
  email: string;
  name: string;
  phone?: string;
  company?: string;
  source: 'commande' | 'devis' | 'newsletter' | 'sourcing' | 'direct';
  totalSpent: number;
  orderCount: number;
  lastActive: string;
  tags: string[];
}

export const EmailMarketingManager: React.FC = () => {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>(() => siteSettingsService.getNewsletterSubscribers());
  const [orders, setOrders] = useState<Order[]>(() => catalogService.getOrders());
  const [settings, setSettings] = useState(() => siteSettingsService.getSettings());

  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'clients' | 'newsletter'>('all');
  const [copiedAll, setCopiedAll] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick Promo Campaign Composer State
  const [selectedPromoCode, setSelectedPromoCode] = useState<string>('');
  const [campaignSubject, setCampaignSubject] = useState('Offre Spéciale Équipements Industriels & MRO Sénégal');
  const [campaignBody, setCampaignBody] = useState(
    "Bonjour,\n\nProfitez d'une remise exclusive sur notre catalogue d'équipements industriels et outillage certifié. Sourcing direct usine et livraison sécurisée à Dakar."
  );
  const [isSendingCampaign, setIsSendingCampaign] = useState(false);
  const [campaignSuccess, setCampaignSuccess] = useState<string | null>(null);

  // Manual Email Collector Input
  const [manualEmail, setManualEmail] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualCompany, setManualCompany] = useState('');

  const refresh = () => {
    setSubscribers(siteSettingsService.getNewsletterSubscribers());
    setOrders(catalogService.getOrders());
    setSettings(siteSettingsService.getSettings());
  };

  useEffect(() => {
    refresh();
    const unsub = siteSettingsService.subscribe(refresh);
    window.addEventListener('ze_subscribers_updated', refresh);
    window.addEventListener('ze_orders_updated', refresh);
    return () => {
      unsub();
      window.removeEventListener('ze_subscribers_updated', refresh);
      window.removeEventListener('ze_orders_updated', refresh);
    };
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Merge emails from Orders + Newsletter Subscribers into a unified contacts database
  const contacts = useMemo<EmailContact[]>(() => {
    const map = new Map<string, EmailContact>();

    // 1. From Orders
    orders.forEach(o => {
      const email = (o.customerEmail || '').trim().toLowerCase();
      if (!email || !email.includes('@') || email.includes('@example.com')) return;

      const existing = map.get(email);
      const isPaid = o.paymentStatus === 'Payé' || o.status === 'Livré' || o.status === 'Expédié';
      const orderAmount = isPaid ? (o.totalTTC || 0) : 0;

      if (existing) {
        existing.orderCount += 1;
        existing.totalSpent += orderAmount;
        if (o.createdAt && new Date(o.createdAt) > new Date(existing.lastActive)) {
          existing.lastActive = o.createdAt;
        }
        if (o.customerCompany && !existing.company) existing.company = o.customerCompany;
        if (o.customerPhone && !existing.phone) existing.phone = o.customerPhone;
      } else {
        map.set(email, {
          email,
          name: o.customerName || email.split('@')[0],
          phone: o.customerPhone,
          company: o.customerCompany,
          source: o.paymentMethod === 'Devis Proforma' ? 'devis' : 'commande',
          totalSpent: orderAmount,
          orderCount: 1,
          lastActive: o.createdAt || new Date().toISOString(),
          tags: ['client_acheteur']
        });
      }
    });

    // 2. From Newsletter / Web Prospect form
    subscribers.forEach(s => {
      const email = (s.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) return;

      const existing = map.get(email);
      if (existing) {
        if (!existing.tags.includes('newsletter')) existing.tags.push('newsletter');
        if (s.company && !existing.company) existing.company = s.company;
        if (s.name && !existing.name) existing.name = s.name;
        if (s.phone && !existing.phone) existing.phone = s.phone;
      } else {
        map.set(email, {
          email,
          name: s.name || email.split('@')[0],
          phone: s.phone,
          company: s.company,
          source: (s.source as any) || 'newsletter',
          totalSpent: 0,
          orderCount: 0,
          lastActive: s.subscribedAt || new Date().toISOString(),
          tags: ['newsletter', 'prospect']
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
    });
  }, [orders, subscribers]);

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchSearch = 
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.phone && c.phone.includes(searchTerm));

      if (!matchSearch) return false;

      if (filterSource === 'clients') return c.orderCount > 0;
      if (filterSource === 'newsletter') return c.tags.includes('newsletter');
      return true;
    });
  }, [contacts, searchTerm, filterSource]);

  // Copy all emails
  const handleCopyAllEmails = () => {
    const list = filteredContacts.map(c => c.email).join(', ');
    navigator.clipboard.writeText(list);
    setCopiedAll(true);
    triggerToast(`${filteredContacts.length} adresse(s) email copiée(s) dans le presse-papier.`);
    setTimeout(() => setCopiedAll(false), 3000);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Email', 'Nom', 'Entreprise', 'Telephone', 'Source', 'Total_Achats_FCFA', 'Nombre_Commandes', 'Derniere_Activite'];
    const rows = filteredContacts.map(c => [
      c.email,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${(c.company || '').replace(/"/g, '""')}"`,
      `"${c.phone || ''}"`,
      c.source,
      c.totalSpent,
      c.orderCount,
      c.lastActive
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `clients_emails_zone_equipements_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("Export CSV généré et téléchargé avec succès.");
  };

  const handleAddManualEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmail.trim()) return;
    const res = siteSettingsService.addNewsletterSubscriber(
      manualEmail.trim(),
      manualName.trim(),
      undefined,
      manualCompany.trim(),
      'admin_ajout_manuel'
    );
    if (res.success) {
      setManualEmail('');
      setManualName('');
      setManualCompany('');
      triggerToast(res.message);
      refresh();
    } else {
      triggerToast(res.message);
    }
  };

  const handleDeleteSubscriber = (email: string) => {
    siteSettingsService.deleteNewsletterSubscriber(email);
    triggerToast(`Email ${email} retiré de la liste.`);
    refresh();
  };

  const handleSendCampaign = () => {
    if (!campaignSubject.trim() || !campaignBody.trim()) {
      triggerToast("Veuillez renseigner l'objet et le texte du message de la campagne.");
      return;
    }

    setIsSendingCampaign(true);
    setTimeout(() => {
      setIsSendingCampaign(false);
      const recipientCount = filteredContacts.length;
      setCampaignSuccess(`Campagne promotionnelle prête : ${recipientCount} contact(s) ciblés.`);
      triggerToast(`Campagne enregistrée ! ${recipientCount} email(s) ciblés.`);
    }, 1000);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Contacts Collectés</span>
              <h3 className="text-2xl font-black text-white mt-1">{contacts.length}</h3>
            </div>
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-[#FF6600] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Base clients unifiée (Commandes & Newsletter)</p>
        </div>

        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Clients Acheteurs</span>
              <h3 className="text-2xl font-black text-emerald-400 mt-1">
                {contacts.filter(c => c.orderCount > 0).length}
              </h3>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Ayant déjà validé au moins une commande</p>
        </div>

        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Abonnés Newsletter / Web</span>
              <h3 className="text-2xl font-black text-blue-400 mt-1">{subscribers.length}</h3>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Prospects inscrits pour les alertes promo</p>
        </div>

        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Codes Promos Actifs</span>
              <h3 className="text-2xl font-black text-purple-400 mt-1">
                {(settings.promoCodes || []).filter(p => p.active).length}
              </h3>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Disponibles pour diffusion ciblée</p>
        </div>
      </div>

      {/* Main Container: Split List & Campaign Composer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Email Database Table (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-orange-400" />
                <span>Base d'Emails Clients & Prospects</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Collecte automatique via le panier, devis proforma, commandes comptoir et formulaires promo.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyAllEmails}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Copier tous les emails (séparés par des virgules pour envoi groupé)"
              >
                {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-orange-400" />}
                <span>{copiedAll ? 'Copié !' : 'Copier emails'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-xl bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-orange-400" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par email, nom, société ou téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setFilterSource('all')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterSource === 'all' ? 'bg-[#FF6600] text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Tous ({contacts.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterSource('clients')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterSource === 'clients' ? 'bg-[#FF6600] text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Acheteurs
              </button>
              <button
                type="button"
                onClick={() => setFilterSource('newsletter')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterSource === 'newsletter' ? 'bg-[#FF6600] text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Newsletter
              </button>
            </div>
          </div>

          {/* Quick Manual Add Form */}
          <form onSubmit={handleAddManualEmail} className="p-3 bg-slate-900 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs items-center">
            <div className="sm:col-span-4">
              <input
                type="email"
                required
                placeholder="Ajouter email client..."
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500"
              />
            </div>
            <div className="sm:col-span-3">
              <input
                type="text"
                placeholder="Nom du contact"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500"
              />
            </div>
            <div className="sm:col-span-3">
              <input
                type="text"
                placeholder="Société / Usine"
                value={manualCompany}
                onChange={(e) => setManualCompany(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full bg-[#003366] hover:bg-[#002244] text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter</span>
              </button>
            </div>
          </form>

          {/* Table */}
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-3">Contact / Email</th>
                  <th className="py-2.5 px-3">Société & Téléphone</th>
                  <th className="py-2.5 px-3 text-center">Commandes</th>
                  <th className="py-2.5 px-3 text-right">Total Dépensé</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredContacts.map((contact) => (
                  <tr key={contact.email} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <strong className="block text-white truncate">{contact.name}</strong>
                          <span className="text-[11px] text-orange-400 font-mono select-all">{contact.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="block text-slate-300 font-medium">{contact.company || 'Particulier / Chantier'}</span>
                      <span className="text-[10px] text-slate-500">{contact.phone || 'Non renseigné'}</span>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${contact.orderCount > 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                        {contact.orderCount} cmd
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                      {contact.totalSpent > 0 ? `${contact.totalSpent.toLocaleString('fr-FR')} F` : '0 F'}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteSubscriber(contact.email)}
                        className="text-slate-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredContacts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                      Aucun email trouvé correspondant à vos critères de recherche.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Targeted Email Promo Campaign Composer (5 cols) */}
        <div className="lg:col-span-5 bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-5">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FF6600]" />
              <span>Campagne Promotionnelle Ciblée</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Rédigez et diffusez vos offres spéciales ou codes promos à vos {filteredContacts.length} contacts sélectionnés.
            </p>
          </div>

          {/* Promo Code Selector */}
          <div className="space-y-1.5 text-xs">
            <label className="block font-bold text-slate-300">
              Associer un Code Promo Existant :
            </label>
            <select
              value={selectedPromoCode}
              onChange={(e) => {
                const code = e.target.value;
                setSelectedPromoCode(code);
                if (code) {
                  const p = (settings.promoCodes || []).find(it => it.code === code);
                  if (p) {
                    setCampaignSubject(`Offre Spéciale : -${p.discountPercent || p.discountValue}% avec le code ${p.code}`);
                    setCampaignBody(
                      `Bonjour,\n\nProfitez dès aujourd'hui d'une remise exclusive de ${p.discountPercent || p.discountValue}% sur vos commandes d'équipements industriels avec le code promo ${p.code}.\n\nCommandez directement sur notre catalogue : https://zoneequipements.ai.studio\n\nL'équipe Zone Équipements.`
                    );
                  }
                }
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
            >
              <option value="">-- Aucun code sélectionné (Message libre) --</option>
              {(settings.promoCodes || []).map(p => (
                <option key={p.code} value={p.code}>
                  {p.code} (-{p.discountPercent || p.discountValue}%) • {p.description || 'Remise'}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Input */}
          <div className="space-y-1.5 text-xs">
            <label className="block font-bold text-slate-300">
              Objet de l'Email Promo *
            </label>
            <input
              type="text"
              value={campaignSubject}
              onChange={(e) => setCampaignSubject(e.target.value)}
              placeholder="Ex: Arrivage Outillage & Équipements de Chantier Dakar"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Body Textarea */}
          <div className="space-y-1.5 text-xs">
            <label className="block font-bold text-slate-300">
              Contenu du Message Promo *
            </label>
            <textarea
              rows={6}
              value={campaignBody}
              onChange={(e) => setCampaignBody(e.target.value)}
              placeholder="Rédigez le texte de l'annonce ou de la promotion..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-orange-500 leading-relaxed font-sans"
            />
          </div>

          {/* Audience Summary Box */}
          <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs space-y-2">
            <div className="flex justify-between items-center text-slate-300">
              <span>Audience ciblée :</span>
              <span className="font-bold text-orange-400 font-mono">{filteredContacts.length} destinataire(s)</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>Émetteur officiel :</span>
              <span className="text-slate-200">{settings.companyName || 'ZONE ÉQUIPEMENTS'}</span>
            </div>
          </div>

          {campaignSuccess && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{campaignSuccess}</span>
            </div>
          )}

          {/* Campaign Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              disabled={isSendingCampaign || filteredContacts.length === 0}
              onClick={handleSendCampaign}
              className="w-full bg-[#FF6600] hover:bg-orange-600 disabled:opacity-50 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSendingCampaign ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Diffuser la Campagne ({filteredContacts.length} contacts)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyAllEmails}
              className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-800"
            >
              <Copy className="w-3.5 h-3.5 text-orange-400" />
              <span>Copier les {filteredContacts.length} adresses pour envoi Gmail / Outlook</span>
            </button>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#003366] text-white px-5 py-3 rounded-2xl shadow-2xl border border-blue-400 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
export default EmailMarketingManager;
