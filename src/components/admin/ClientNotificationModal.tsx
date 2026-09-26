import React, { useState } from 'react';
import { X, Send, Mail, Copy, Check, MessageSquare } from 'lucide-react';
import { Order, catalogService } from '../../services/catalogService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  newStatus?: Order['status'];
}

export const ClientNotificationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  order,
  newStatus
}) => {
  const [copied, setCopied] = useState(false);
  const [customNotes, setCustomNotes] = useState('');

  if (!isOpen || !order) return null;

  const statusToUse = newStatus || order.status;
  const notifData = catalogService.generateClientStatusNotification(order, statusToUse);

  const finalMessage = customNotes 
    ? `${notifData.body}\n\n*Précision de notre service logistique :*\n${customNotes}`
    : notifData.body;

  const handleCopy = () => {
    navigator.clipboard.writeText(finalMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const cleanPhone = (order.customerPhone || '').replace(/[^0-9]/g, '');
  const whatsappUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(finalMessage)}`
    : `https://wa.me/221766538384?text=${encodeURIComponent(finalMessage)}`;

  const emailUrl = order.customerEmail 
    ? `mailto:${order.customerEmail}?subject=${encodeURIComponent(`[Zone Équipements] ${notifData.title} - ${order.orderNumber}`)}&body=${encodeURIComponent(finalMessage)}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              Notification de Suivi Client
            </h3>
            <p className="text-xs text-slate-400">
              Commande : <strong className="text-slate-200">{order.orderNumber}</strong> | Client : <strong className="text-slate-200">{order.customerName}</strong>
            </p>
          </div>
        </div>

        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 mb-4 flex items-center justify-between">
          <span className="text-xs text-slate-400">Statut de la notification :</span>
          <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-md border border-orange-500/20">
            {statusToUse}
          </span>
        </div>

        {/* Channels */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Message pré-rempli pour le client (WhatsApp & Email) :
            </label>
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto">
              {finalMessage}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Ajouter une précision / instruction au client (optionnel) :
            </label>
            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Ex: Vos colis sont disponibles à notre entrepôt au Km 4, Boulevard du Centenaire..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#FF6600]"
            />
          </div>

          {/* Quick Action buttons */}
          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Message Copié' : 'Copier le texte'}</span>
            </button>

            <div className="flex items-center gap-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                WhatsApp Client ({cleanPhone || 'Sénégal'})
              </a>

              {emailUrl && (
                <a
                  href={emailUrl}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email Client
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
