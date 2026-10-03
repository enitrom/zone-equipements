import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircle, ChevronDown, ChevronUp, Search, MessageSquare,
  Phone, Mail, FileText, ArrowRight, ShieldCheck, Truck, CreditCard,
  Package, Clock, CheckCircle2
} from 'lucide-react';
import { siteSettingsService } from '../services/siteSettingsService';
import { useLanguage } from '../LanguageContext';

export default function FaqPage() {
  const { t } = useLanguage();
  const settings = siteSettingsService.getSettings();
  const [faqs] = useState(siteSettingsService.getFaqs());
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'Toutes les questions', icon: HelpCircle },
    { id: 'order', label: 'Commandes & Devis', icon: FileText },
    { id: 'delivery', label: 'Livraison & Fret', icon: Truck },
    { id: 'payment', label: 'Paiement & TVA', icon: CreditCard },
    { id: 'stock', label: 'Stock & Sourcing', icon: Package }
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch =
      !searchQuery.trim() ||
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Top Banner */}
      <section className="bg-[#003366] text-white py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-orange-400 text-xs font-bold uppercase tracking-wider mb-4 border border-white/10">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Centre d'Aide & Support Client</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black font-roboto tracking-tight mb-3">
            Questions Fréquentes & Support Client
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto mb-8">
            Retrouvez toutes les réponses concernant nos équipements industriels MRO, la livraison au Sénégal et dans la sous-région, la facturation et les garanties.
          </p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto relative">
            <input
              type="text"
              placeholder="Rechercher une question, un délai, un mode de paiement..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-slate-900 rounded-2xl py-3.5 pl-11 pr-4 text-xs sm:text-sm shadow-xl focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {categories.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-[#003366] text-white shadow-md'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={faq.id || idx}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-orange-100 text-[#FF6600] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        Q
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                        {faq.q}
                      </h3>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 border-t border-slate-100 bg-slate-50/50 leading-relaxed">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-[#003366] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          R
                        </span>
                        <p className="flex-1 whitespace-pre-line">{faq.a}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
              <HelpCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-600 font-bold text-sm">Aucune question ne correspond à votre recherche.</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 text-xs text-[#FF6600] font-bold underline cursor-pointer"
              >
                Réinitialiser la recherche
              </button>
            </div>
          )}
        </div>

        {/* Contact Support Direct Card */}
        <div className="mt-12 bg-gradient-to-br from-[#003366] to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-orange-400 text-xs font-bold uppercase tracking-wider">
              Besoin d'une assistance immédiate ?
            </span>
            <h3 className="text-lg sm:text-xl font-black">
              Notre équipe d'ingénieurs et techniciens vous répond
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm max-w-md">
              Pour toute demande spécifique de cotation, sourcing sur-mesure d'usines ou suivi de commande en cours.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href={`https://wa.me/${(settings.companyPhone || '221766538384').replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Direct</span>
            </a>

            <Link
              to="/contact"
              className="px-4 py-2.5 rounded-xl bg-[#FF6600] hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
            >
              <Mail className="w-4 h-4" />
              <span>Formulaire de Contact</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
