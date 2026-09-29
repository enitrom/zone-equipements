import React, { useState, useEffect, useRef } from 'react';
import {
  Bell, ShoppingCart, Truck, FileText, AlertTriangle,
  Mail, Check, X, ExternalLink, Volume2, VolumeX, ArrowRight
} from 'lucide-react';
import { catalogService, Order, Supplier } from '../../services/catalogService';

export interface AdminNotification {
  id: string;
  type: 'order' | 'supplier_po' | 'quote' | 'stock' | 'contact';
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  actionTab?: string;
  targetId?: string;
  amount?: number;
}

interface AdminNotificationsBellProps {
  onNavigateTab: (tab: string, targetId?: string) => void;
  onOpenOrder?: (order: Order) => void;
}

export default function AdminNotificationsBell({ onNavigateTab, onOpenOrder }: AdminNotificationsBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const buildNotifications = () => {
    const orders = catalogService.getOrders();
    const suppliers = catalogService.getSuppliers();
    const auditLogs = catalogService.getAuditLogs();

    const notifs: AdminNotification[] = [];

    // 1. Pending & Recent Orders
    orders.forEach(ord => {
      if (ord.status === 'En attente' || ord.status === 'Reçue' || ord.paymentStatus === 'Acompte versé') {
        notifs.push({
          id: `notif-ord-${ord.id}`,
          type: 'order',
          title: `Nouvelle Commande : ${ord.orderNumber}`,
          description: `${ord.customerName} (${ord.customerCity || 'Dakar'}) • ${(ord.totalTTC || 0).toLocaleString('fr-FR')} FCFA (${ord.paymentMethod})`,
          timestamp: ord.createdAt,
          isRead: false,
          actionTab: 'orders',
          targetId: ord.id,
          amount: ord.totalTTC
        });
      }

      // Supplier payment link received
      if (ord.supplierPaymentLink && ord.supplierPoStatus === 'Lien paiement reçu') {
        notifs.push({
          id: `notif-po-${ord.id}`,
          type: 'supplier_po',
          title: `Lien Règlement Fournisseur Reçu : ${ord.orderNumber}`,
          description: `Fournisseur ${ord.supplierName || 'OEM'} a transmis son lien de paiement pour validation.`,
          timestamp: ord.updatedAt || ord.createdAt,
          isRead: false,
          actionTab: 'orders',
          targetId: ord.id
        });
      }
    });

    // 2. Recent Audit Logs & Contact submissions
    auditLogs.slice(0, 10).forEach((log, idx) => {
      if (log.action.toLowerCase().includes('contact') || log.action.toLowerCase().includes('message')) {
        notifs.push({
          id: `notif-contact-${idx}`,
          type: 'contact',
          title: `Message Contact Client : ${log.author || 'Visiteur'}`,
          description: log.details,
          timestamp: log.timestamp,
          isRead: false,
          actionTab: 'orders'
        });
      }
    });

    // Sort by newest first
    notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Merge read status from localStorage
    const readIds = new Set(JSON.parse(localStorage.getItem('ze_admin_read_notifs') || '[]'));
    const finalized = notifs.map(n => ({
      ...n,
      isRead: readIds.has(n.id)
    }));

    setNotifications(finalized);
  };

  useEffect(() => {
    buildNotifications();
    const interval = setInterval(buildNotifications, 10000);
    const unsub = catalogService.subscribe(buildNotifications);
    window.addEventListener('ze_orders_updated', buildNotifications);
    return () => {
      clearInterval(interval);
      unsub();
      window.removeEventListener('ze_orders_updated', buildNotifications);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    localStorage.setItem('ze_admin_read_notifs', JSON.stringify(allIds));
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const markAsRead = (id: string) => {
    const readIds = new Set(JSON.parse(localStorage.getItem('ze_admin_read_notifs') || '[]'));
    readIds.add(id);
    localStorage.setItem('ze_admin_read_notifs', JSON.stringify(Array.from(readIds)));
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleNotificationClick = (notif: AdminNotification) => {
    markAsRead(notif.id);
    setIsOpen(false);
    if (notif.actionTab) {
      onNavigateTab(notif.actionTab, notif.targetId);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-orange-500 text-slate-200 hover:text-white transition-all cursor-pointer shadow-sm"
        title="Centre de Notifications Administrateur"
      >
        <Bell className="w-5 h-5 text-slate-300 hover:text-[#FF6600]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow-md">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-950/50 z-[998] sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-x-3 top-20 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-3 w-auto sm:w-96 max-w-[calc(100vw-1.5rem)] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl z-[999] overflow-hidden text-slate-200">
            {/* Header */}
            <div className="p-3.5 sm:p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Bell className="w-4 h-4 text-[#FF6600] shrink-0" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white truncate">
                  Notifications ({unreadCount} non lue{unreadCount > 1 ? 's' : ''})
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-[11px] text-orange-400 hover:text-orange-300 font-bold hover:underline cursor-pointer"
                  >
                    Tout marquer lu
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="sm:hidden p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

          {/* List of Notifications */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/80">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-1">
                <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-slate-300">Toutes les notifications sont à jour</p>
                <p>Aucune action urgente en attente.</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.isRead;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 hover:bg-slate-900/80 transition-colors cursor-pointer flex items-start gap-3 ${
                      isUnread ? 'bg-slate-900/40 border-l-4 border-l-[#FF6600]' : 'opacity-80'
                    }`}
                  >
                    <div className="p-2 rounded-xl shrink-0 mt-0.5 bg-slate-800 text-slate-300">
                      {notif.type === 'order' ? (
                        <ShoppingCart className="w-4 h-4 text-[#FF6600]" />
                      ) : notif.type === 'supplier_po' ? (
                        <Truck className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Mail className="w-4 h-4 text-blue-400" />
                      )}
                    </div>

                    <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-xs truncate ${isUnread ? 'font-bold text-white' : 'font-semibold text-slate-300'}`}>
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono shrink-0">
                          {new Date(notif.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {notif.description}
                      </p>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-1" />
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <button
              type="button"
              onClick={() => {
                setSoundEnabled(!soundEnabled);
              }}
              className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
              <span>{soundEnabled ? 'Son activé' : 'Son désactivé'}</span>
            </button>
            <span className="font-mono">Zone Équipements v2.6</span>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
