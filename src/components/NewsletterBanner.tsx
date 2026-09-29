import React, { useState } from 'react';
import { Mail, CheckCircle2, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { siteSettingsService } from '../services/siteSettingsService';

export const NewsletterBanner: React.FC = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setStatus('error');
      setMessage('Veuillez saisir une adresse email valide.');
      return;
    }

    const res = siteSettingsService.addNewsletterSubscriber(email.trim(), name.trim(), undefined, undefined, 'newsletter_banner');
    if (res.success) {
      setStatus('success');
      setMessage(res.message);
      setEmail('');
      setName('');
    } else {
      setStatus('error');
      setMessage(res.message);
    }
  };

  return (
    <section className="relative bg-gradient-to-br from-[#002244] via-[#003366] to-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8 overflow-hidden my-12 rounded-3xl mx-4 sm:mx-8 shadow-2xl border border-blue-900">
      {/* Decorative background grid pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>

      <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span>Alerte Arrivages & Promos Ciblées B2B</span>
        </div>

        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black font-roboto tracking-tight">
          Recevez nos offres exclusives & codes promo industriels
        </h2>

        <p className="text-xs sm:text-sm text-blue-100 max-w-2xl mx-auto leading-relaxed">
          Inscrivez-vous pour recevoir en avant-première nos arrivages d'équipements MRO, nos mandats d'importation direct usine et des remises exceptionnelles réservées à nos partenaires au Sénégal.
        </p>

        {status === 'success' ? (
          <div className="max-w-md mx-auto p-4 bg-emerald-500/20 border-2 border-emerald-400/60 rounded-2xl text-emerald-200 text-xs font-bold flex items-center justify-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{message}</span>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="max-w-xl mx-auto space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Votre nom (optionnel)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="sm:w-1/3 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-xs text-white placeholder-blue-200/60 focus:outline-none focus:border-orange-400"
              />
              <input
                type="email"
                required
                placeholder="Votre adresse email professionnelle *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-xs text-white placeholder-blue-200/60 focus:outline-none focus:border-orange-400"
              />
              <button
                type="submit"
                className="bg-[#FF6600] hover:bg-orange-600 text-white font-black py-3 px-6 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <span>S'inscrire</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {status === 'error' && (
              <p className="text-red-300 text-xs font-medium flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{message}</span>
              </p>
            )}
            
            <p className="text-[10px] text-blue-200/70">
              🔒 Vos données restent strictement confidentielles et ne seront jamais cédées. Désabonnement à tout moment.
            </p>
          </form>
        )}
      </div>
    </section>
  );
};
export default NewsletterBanner;
