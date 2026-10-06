import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, LogOut, Package, Settings, Shield, ShoppingCart,
  Clock, CheckCircle2, AlertCircle, FileText, ArrowRight,
  Phone, Building2, MapPin, ExternalLink, RefreshCw, Save,
  Check, Eye, Download, Globe, CreditCard, Trash2, Edit,
  ShieldCheck, KeyRound, X, AlertTriangle, Send, Heart
} from 'lucide-react';
import {
  catalogService, Order, ExtendedProduct, getClientWarehouseCode,
  getEffectiveProductBasePrice, isProductSourcing, parseWeightToKg,
  getCleanProvenanceDisplay
} from '../services/catalogService';
import { siteSettingsService } from '../services/siteSettingsService';
import { useLanguage, Language } from '../LanguageContext';
import { useCart } from '../CartContext';
import { printHtmlDocument, downloadOrderPdf } from '../utils/printDocument';
import { ConfirmModal } from '../components/admin/ConfirmModal';
import { getProductImageUrl, handleImageError } from '../constants';
import {
  WORLD_COUNTRIES,
  DEFAULT_SUPPORTED_DELIVERY_COUNTRIES,
  resolveCanonicalCountryName,
  isDeliveryCountrySupported
} from '../utils/countries';

type TabType = 'overview' | 'orders' | 'liked' | 'profile' | 'settings';

export default function Account() {
  const { user, profile, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { clearCart, addItem } = useCart();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'transit' | 'delivered'>('all');

  // Profile edit state
  const [displayName, setDisplayName] = useState('');
  const [clientType, setClientType] = useState<'b2c' | 'b2b'>('b2c');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [ninea, setNinea] = useState('');
  const [rccm, setRccm] = useState('');
  const [taxExemptionNumber, setTaxExemptionNumber] = useState('');
  const [defaultCountry, setDefaultCountry] = useState<string>(
    () => catalogService.getEffectiveClientCountry(profile)
  );
  const [city, setCity] = useState('Dakar');
  const [address, setAddress] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Liked products (Favoris) state
  const [likedProducts, setLikedProducts] = useState<ExtendedProduct[]>(() => catalogService.getLikedProducts());
  const [siteSettings, setSiteSettings] = useState(() => siteSettingsService.getSettings());
  const [generatedFallbackOtp, setGeneratedFallbackOtp] = useState('');

  // Email OTP verification state for sensitive profile edit
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // PayDunya instant pay state
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  // Order deletion modal
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  // Settings preferences
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || user?.displayName || '');
      setClientType(profile.clientType || (profile.company || profile.ninea ? 'b2b' : 'b2c'));
      setPhoneNumber(profile.phone || '');
      setCompanyName(profile.company || '');
      setNinea(profile.ninea || '');
      setRccm(profile.rccm || '');
      setTaxExemptionNumber(profile.taxExemptionNumber || '');
      setDefaultCountry(resolveCanonicalCountryName(profile.country || siteSettings.defaultClientCountry || 'Sénégal'));
      setCity(profile.city || 'Dakar');
      setAddress(profile.address || '');
    }
  }, [profile, user, siteSettings.defaultClientCountry]);

  useEffect(() => {
    const syncLikedAndSettings = () => {
      setLikedProducts(catalogService.getLikedProducts());
      setSiteSettings(siteSettingsService.getSettings());
    };
    const unsubCat = catalogService.subscribe(syncLikedAndSettings);
    const unsubSet = siteSettingsService.subscribe(syncLikedAndSettings);
    window.addEventListener('ze_liked_products_updated', syncLikedAndSettings);
    return () => {
      unsubCat();
      unsubSet();
      window.removeEventListener('ze_liked_products_updated', syncLikedAndSettings);
    };
  }, []);

  const loadUserOrders = () => {
    if (!user) return;
    const allOrders = catalogService.getOrders();
    const userEmail = (user.email || '').toLowerCase().trim();
    const userPhone = (phoneNumber || profile?.phone || '').trim();

    // Match orders belonging to this user
    const userSpecificOrders = allOrders.filter(ord => {
      const ordEmail = (ord.customerEmail || '').toLowerCase().trim();
      const ordPhone = (ord.customerPhone || '').trim();
      return (
        (userEmail && ordEmail === userEmail) ||
        (userPhone && ordPhone && ordPhone === userPhone) ||
        ord.userId === user.uid
      );
    });

    setOrders(userSpecificOrders);
  };

  useEffect(() => {
    loadUserOrders();
    const unsub = catalogService.subscribe(loadUserOrders);
    window.addEventListener('ze_orders_updated', loadUserOrders);
    return () => {
      unsub();
      window.removeEventListener('ze_orders_updated', loadUserOrders);
    };
  }, [user, phoneNumber, profile]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 font-sans">
        <RefreshCw className="w-8 h-8 text-[#003366] animate-spin" />
        <span className="text-sm font-bold text-gray-600">Chargement de votre compte...</span>
      </div>
    );
  }

  if (!user) return null;

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  // Trigger Profile Edit OTP
  const handleInitiateProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.email) return;

    // Send OTP verification code to registered email
    setIsSendingOtp(true);
    setOtpError('');
    try {
      const resp = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, purpose: 'profile_update' })
      });
      const data = await resp.json();
      if (data.success) {
        const directCode = data.fallbackCode || data.debugCode || '';
        setGeneratedFallbackOtp(directCode);
        if (directCode) {
          setOtpCode(directCode);
        }
        setShowOtpModal(true);
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
      } else {
        setOtpError(data.error || 'Erreur lors de l\'envoi du code de vérification.');
      }
    } catch (err: any) {
      setOtpError(err?.message || 'Erreur de communication avec le serveur.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP and Commit Profile Updates to Firestore
  const handleVerifyOtpAndSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6 || !user?.uid) return;

    setIsVerifyingOtp(true);
    setOtpError('');

    try {
      const verifyResp = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, code: otpCode.trim() })
      });
      const verifyData = await verifyResp.json();

      if (!verifyData.success) {
        setOtpError(verifyData.error || 'Code de vérification invalide.');
        setIsVerifyingOtp(false);
        return;
      }

      const resolvedCountry = resolveCanonicalCountryName(defaultCountry) || 'Sénégal';
      const updatedFields = {
        displayName: displayName.trim(),
        clientType: clientType || 'b2c',
        phone: phoneNumber.trim(),
        company: clientType === 'b2b' ? companyName.trim() : '',
        ninea: clientType === 'b2b' ? ninea.trim() : '',
        rccm: clientType === 'b2b' ? rccm.trim() : '',
        taxExemptionNumber: clientType === 'b2b' ? taxExemptionNumber.trim() : '',
        country: resolvedCountry,
        city: city.trim(),
        address: address.trim(),
        updatedAt: new Date().toISOString()
      };

      // Code is valid - update profile in Firestore and localStorage
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, updatedFields).catch(() => {});
      try {
        const raw = localStorage.getItem('ze_user_profile_v1');
        const prev = raw ? JSON.parse(raw) : {};
        localStorage.setItem('ze_user_profile_v1', JSON.stringify({ ...prev, ...updatedFields }));
      } catch {}

      setShowOtpModal(false);
      setOtpCode('');
      setSaveSuccess(true);
      triggerToast(`Profil et pays par défaut (${resolvedCountry}) mis à jour avec succès.`);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setOtpError(err?.message || 'Erreur lors de l\'enregistrement du profil.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Pay unpaid / pending order with PayDunya
  const handlePayOrderWithPaydunya = async (order: Order) => {
    setPayingOrderId(order.id);
    setPayError(null);

    try {
      // If order already has a valid paydunya URL, open it
      if (order.paydunyaInvoiceUrl) {
        window.open(order.paydunyaInvoiceUrl, '_blank');
        setPayingOrderId(null);
        return;
      }

      const settings = siteSettingsService.getSettings();
      const resp = await fetch('/api/paydunya/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: settings.paydunya,
          order: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            totalAmount: order.totalTTC,
            subtotalHT: order.subtotalHT,
            vatAmount: order.vatAmount,
            description: `Règlement Commande ${order.orderNumber} — ${settings.companyName || 'ZONE ÉQUIPEMENTS'}`,
            customerName: order.customerName,
            customerEmail: order.customerEmail || user?.email,
            customerPhone: order.customerPhone,
            paymentChoice: 'full',
            companyName: settings.companyName,
            companyPhone: settings.companyPhone,
            companyAddress: settings.companyAddress,
            originUrl: window.location.origin,
            returnUrl: `${window.location.origin}/account?paydunya_status=return&order=${encodeURIComponent(order.orderNumber)}`,
            cancelUrl: `${window.location.origin}/account?paydunya_status=cancelled&order=${encodeURIComponent(order.orderNumber)}`
          }
        })
      });

      const data = await resp.json();
      const resolvedUrl = data.invoiceUrl || data.redirectUrl;

      if (data.success && resolvedUrl) {
        if (data.token) {
          catalogService.attachPaydunyaInvoice(order.id, data.token, resolvedUrl);
        }
        window.open(resolvedUrl, '_blank');
        triggerToast(`Facture PayDunya ouverte pour ${order.orderNumber}`);
      } else {
        setPayError(data.error || 'Impossible de créer la facture PayDunya.');
      }
    } catch (err: any) {
      setPayError(err?.message || 'Erreur réseau lors de l\'appel PayDunya.');
    } finally {
      setPayingOrderId(null);
    }
  };

  // Resume / Edit order back into Cart
  const handleResumeOrderInCart = async (order: Order) => {
    try {
      await clearCart();
      for (const it of order.items) {
        await addItem({
          productId: Number(it.productId) || 1,
          name: it.name,
          price: it.price,
          quantity: it.quantity || 1,
          img: it.img || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80',
          brand: it.brand,
          shippingMethod: it.shippingMethod || 'air',
          freightCost: it.freightCost || 0,
          weightKg: (it as any).weightKg || 1
        });
      }
      triggerToast(`Les articles de la commande ${order.orderNumber} ont été chargés dans votre panier.`);
      navigate('/cart');
    } catch (err) {
      console.error(err);
    }
  };

  // Confirm delete / cancel order
  const handleConfirmDeleteOrder = () => {
    if (!orderToDelete) return;
    catalogService.deleteOrder(orderToDelete.id);
    loadUserOrders();
    triggerToast(`Commande ${orderToDelete.orderNumber} supprimée.`);
    setOrderToDelete(null);
  };

  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'pending') return o.status === 'En attente' || o.paymentStatus === 'Non payé';
    if (orderFilter === 'transit') return o.status === 'En transit' || o.status === 'Confirmée' || o.status === 'En préparation';
    if (orderFilter === 'delivered') return o.status === 'Livrée';
    return true;
  });

  const pendingOrdersCount = orders.filter(o => o.status === 'En attente' || o.paymentStatus === 'Non payé').length;
  const transitOrdersCount = orders.filter(o => o.status === 'En transit' || o.status === 'En préparation' || o.status === 'Confirmée').length;
  const deliveredOrdersCount = orders.filter(o => o.status === 'Livrée').length;
  const totalSpent = orders
    .filter(o => o.paymentStatus === 'Payé' || o.paymentStatus === 'Payé intégralement')
    .reduce((acc, o) => acc + (o.totalTTC || 0), 0);

  const printInvoice = (order: Order) => {
    const isProforma = Boolean(order.isQuote || order.paymentStatus === 'Non payé' || order.paymentStatus === 'En attente' || (order.paymentStatus !== 'Payé intégralement' && order.paymentStatus !== 'Payé'));
    const docTitle = isProforma ? `DEVIS PROFORMA - ${order.orderNumber}` : `FACTURE EN LIGNE - ${order.orderNumber}`;
    const isUnpaid = order.paymentStatus === 'Non payé' || order.paymentStatus === 'En attente' || isProforma;
    const paymentMethodDisplay = isUnpaid ? 'En attente de règlement' : (order.paymentMethod || 'Wave / PayDunya');

    const vatAmount = Number(order.vatAmount || 0);
    const subtotalHT = Number(order.subtotalHT || 0);
    const effectiveVatPercent = vatAmount > 0 && subtotalHT > 0 ? Math.round((vatAmount / subtotalHT) * 100) : (vatAmount > 0 ? 18 : 0);
    const vatLabel = vatAmount > 0 ? `TVA (${effectiveVatPercent}%) :` : 'TVA (0% / Exonéré) :';

    const itemsHtml = (order.items || []).map(it => {
      const rawPrice = Number(it.unitPriceHT ?? it.priceHT ?? it.price ?? 0);
      const qty = Math.max(1, Number(it.quantity) || 1);
      const uPriceHT = it.unitPriceHT ? Number(it.unitPriceHT) : (it.priceHT ? Number(it.priceHT) : Math.round(rawPrice / 1.18));
      const lineTotalHT = Number(it.totalHT ?? (uPriceHT * qty));
      return `
      <tr>
        <td>
          <div class="font-bold">${it.name}</div>
          <div style="font-size:10px;color:#64748b;">Marque : ${it.brand || 'Constructeur'} | Réf : ${it.productId || 'EQUIP'}</div>
        </td>
        <td class="text-center font-bold">${qty}</td>
        <td class="text-right font-mono">${uPriceHT.toLocaleString('fr-FR')} FCFA</td>
        <td class="text-right font-mono font-bold">${lineTotalHT.toLocaleString('fr-FR')} FCFA</td>
      </tr>
      `;
    }).join('');

    const bodyHtml = `
      <div class="header">
        <div>
          <div class="brand"><span class="brand-blue">ZONE</span> <span class="brand-orange">ÉQUIPEMENTS</span></div>
          <div style="font-size:10px;color:#64748b;">Fournitures Industrielles, Agricoles, Énergie & Électronique</div>
          <div style="font-size:10px;color:#64748b;">Dakar, Sénégal • Email: zoneequipements@gmail.com</div>
        </div>
        <div style="text-align:right;">
          <div class="badge">${isProforma ? 'DEVIS PROFORMA' : 'FACTURE EN LIGNE'}</div>
          <div style="font-size:13px;font-weight:900;margin-top:4px;" class="font-mono">${order.orderNumber}</div>
          <div style="font-size:10px;color:#64748b;">Date: ${new Date(order.createdAt).toLocaleDateString('fr-FR')}</div>
        </div>
      </div>

      <div class="card" style="display:flex;justify-content:space-between;gap:20px;">
        <div>
          <strong style="color:#003366;font-size:11px;text-transform:uppercase;">Destinataire / Client :</strong>
          <div style="font-size:12px;font-weight:bold;margin-top:2px;">${order.customerName}</div>
          ${order.customerCompany ? `<div>${order.customerCompany}</div>` : ''}
          <div>Tél : ${order.customerPhone}</div>
          ${order.customerEmail ? `<div>Email : ${order.customerEmail}</div>` : ''}
          <div>Livraison : ${order.customerAddress || 'Dakar'}, ${order.customerCity || 'Sénégal'}</div>
        </div>
        <div style="text-align:right;">
          <strong style="color:#003366;font-size:11px;text-transform:uppercase;">Modalités :</strong>
          <div>Paiement : <strong>${paymentMethodDisplay}</strong></div>
          <div>Statut Règlement : <strong style="color:${order.paymentStatus === 'Payé intégralement' || order.paymentStatus === 'Payé' ? '#059669' : '#ea580c'}">${order.paymentStatus}</strong></div>
          <div>Statut Logistique : <strong>${order.status}</strong></div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Désignation de l'Équipement</th>
            <th class="text-center">Qté</th>
            <th class="text-right">Prix Unitaire HT</th>
            <th class="text-right">Total HT</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-top:16px;">
        <div class="card" style="flex:1;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:12px;font-size:11px;line-height:1.5;">
          <strong style="color:#003366;font-size:11px;text-transform:uppercase;display:block;margin-bottom:6px;">Procédure & Instructions de Règlement :</strong>
          <div style="margin-bottom:4px;"><strong>1. Mobile Wave / OM :</strong> Transfert direct au <strong>+221 76 653 83 84</strong></div>
          <div style="margin-bottom:4px;"><strong>2. Virement Bancaire (RIB) :</strong> CBAO Attijariwafa Bank • Compte : <strong>SN012 01101 0361892001 45</strong> (SWIFT: CBAOSNDA)</div>
          <div style="margin-bottom:4px;"><strong>3. Titulaire :</strong> ZONE ÉQUIPEMENTS SÉNÉGAL SUARL</div>
          <div style="color:#ea580c;font-weight:bold;margin-top:6px;">* Mentionnez obligatoirement la référence N° ${order.orderNumber} lors de votre paiement.</div>
        </div>

        <div style="text-align:right;min-width:240px;font-size:12px;">
          <div>Sous-total HT : <strong>${(order.subtotalHT || 0).toLocaleString('fr-FR')} FCFA</strong></div>
          <div>Fret & Logistique : <strong>${((order as any).freightTotal || (order as any).shippingCost || 0).toLocaleString('fr-FR')} FCFA</strong></div>
          <div>${vatLabel} <strong>${vatAmount.toLocaleString('fr-FR')} FCFA</strong></div>
          <div style="font-size:15px;font-weight:bold;color:#FF6600;margin-top:6px;padding-top:6px;border-top:1px solid #cbd5e1;">${vatAmount > 0 ? 'Total TTC :' : 'Total Net à Payer :'} ${(order.totalTTC || 0).toLocaleString('fr-FR')} FCFA</div>
        </div>
      </div>
    `;

    const isPaid = order.paymentStatus === 'Payé intégralement' || order.paymentStatus === 'Payé';
    downloadOrderPdf(
      order,
      isPaid ? 'invoice' : 'quote',
      (msg) => triggerToast(msg)
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#003366] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-orange-500/30 animate-fadeIn text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Account Header */}
      <div className="bg-gradient-to-br from-[#003366] via-slate-900 to-slate-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl mb-8 border border-blue-900/60 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF6600] to-orange-600 flex items-center justify-center font-black text-2xl shadow-lg border border-orange-400/30">
              {(displayName || user.email || 'U')[0].toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black">{displayName || 'Compte Client B2B'}</h1>
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#FF6600] text-white tracking-widest">
                    ADMIN
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  Pays par défaut : {defaultCountry || 'Sénégal'}
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5 font-mono">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isAdmin && (
              <Link
                to="/admin"
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
              >
                <Shield className="w-3.5 h-3.5" /> Back-Office
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-white/20 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-red-300" /> Déconnexion
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto gap-2 no-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3.5 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'border-[#FF6600] text-[#FF6600]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Package className="w-4 h-4" /> Tableau de Bord
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3.5 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'orders'
              ? 'border-[#FF6600] text-[#FF6600]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <ShoppingCart className="w-4 h-4" /> Mes Commandes ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab('liked')}
          className={`pb-3.5 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'liked'
              ? 'border-[#FF6600] text-[#FF6600]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Heart className={`w-4 h-4 ${likedProducts.length > 0 ? 'fill-red-500 text-red-500' : ''}`} />
          <span>Produits Aimés ({likedProducts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3.5 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'profile'
              ? 'border-[#FF6600] text-[#FF6600]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <User className="w-4 h-4" /> Mon Profil & Coordonnées
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3.5 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'settings'
              ? 'border-[#FF6600] text-[#FF6600]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Settings className="w-4 h-4" /> Paramètres
        </button>
      </div>

      {/* ================= TAB 1: OVERVIEW ================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/70 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Commandes en cours
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-black font-mono text-[#003366]">
                  {pendingOrdersCount + transitOrdersCount}
                </span>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  {pendingOrdersCount} attente • {transitOrdersCount} transit
                </span>
              </div>
            </div>

            <div className="p-5 border border-emerald-200 rounded-2xl bg-emerald-50/40 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                Commandes Livrées
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-black font-mono text-emerald-700">
                  {deliveredOrdersCount}
                </span>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Archivées
                </span>
              </div>
            </div>

            <div
              onClick={() => setActiveTab('liked')}
              className="p-5 border border-rose-200 rounded-2xl bg-rose-50/40 hover:bg-rose-50/80 transition-colors flex flex-col justify-between cursor-pointer"
            >
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                Produits Aimés
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-black font-mono text-rose-700">
                  {likedProducts.length}
                </span>
                <span className="text-[11px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md">
                  Voir ma sélection &rarr;
                </span>
              </div>
            </div>

            <div className="p-5 border border-blue-200 rounded-2xl bg-blue-50/40 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-[#003366] uppercase tracking-wider">
                Total Facturé & Réglé
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-black font-mono text-[#003366]">
                  {totalSpent.toLocaleString('fr-FR')} <span className="text-xs">FCFA</span>
                </span>
                <span className="text-[10px] font-bold text-[#003366] bg-blue-100 px-2 py-0.5 rounded-md">
                  TTC
                </span>
              </div>
            </div>
          </div>

          {/* Bandeau Statut Fiscal & Pays par défaut du client */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Statut Client (Particulier vs Entreprise) */}
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between gap-3 text-xs">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                    Profil & Régime de Facturation
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border flex items-center gap-1 ${
                    clientType === 'b2b'
                      ? 'bg-blue-50 text-[#003366] border-blue-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {clientType === 'b2b' ? <Building2 className="w-3 h-3 text-[#003366]" /> : <User className="w-3 h-3 text-slate-600" />}
                    <span>{clientType === 'b2b' ? 'Compte Entreprise (B2B)' : 'Compte Particulier (B2C)'}</span>
                  </span>
                </div>

                <div className="pt-1">
                  <div className="font-extrabold text-sm text-gray-900">
                    {clientType === 'b2b' && companyName ? companyName : displayName || user.displayName || 'Client'}
                  </div>
                  {clientType === 'b2b' && (
                    <div className="text-[11px] text-gray-500 font-mono mt-0.5 flex flex-wrap gap-2">
                      {ninea && <span>NINEA : <strong>{ninea}</strong></span>}
                      {rccm && <span>• RCCM : <strong>{rccm}</strong></span>}
                    </div>
                  )}
                  {taxExemptionNumber && (
                    <div className="text-[10px] text-purple-700 font-semibold mt-1">
                      ⭐ Exonération DGID N° {taxExemptionNumber}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[10px] text-gray-400">
                  {clientType === 'b2b' ? 'Factures avec NINEA & TVA pro' : 'Facturation simple Particulier'}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="text-xs font-bold text-[#FF6600] hover:underline cursor-pointer"
                >
                  Modifier mon statut &rarr;
                </button>
              </div>
            </div>

            {/* 2. Pays de livraison & Fiscalité Applicable */}
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between gap-3 text-xs">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                    Pays de Livraison & Traitement TVA
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${
                    (defaultCountry || 'Sénégal').toLowerCase() === 'sénégal' || (defaultCountry || 'Sénégal').toLowerCase() === 'senegal'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-blue-50 text-blue-800 border-blue-200'
                  }`}>
                    {(defaultCountry || 'Sénégal').toLowerCase() === 'sénégal' || (defaultCountry || 'Sénégal').toLowerCase() === 'senegal'
                      ? 'TVA 18% (Vente Locale)'
                      : '0% TVA (Export Art. 358 bis CGI)'}
                  </span>
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#003366] shrink-0" />
                  <span className="font-extrabold text-sm text-[#003366]">
                    {defaultCountry || 'Sénégal'}
                  </span>
                  {isDeliveryCountrySupported(
                    defaultCountry || 'Sénégal',
                    siteSettings.supportedDeliveryCountries || DEFAULT_SUPPORTED_DELIVERY_COUNTRIES
                  ) ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      ✓ Livraison Directe Prise en Charge
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                      ⚠️ Sur devis spécifique
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[10px] text-gray-400 truncate">
                  {(siteSettings.supportedDeliveryCountries || DEFAULT_SUPPORTED_DELIVERY_COUNTRIES).slice(0, 4).join(', ')}...
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="text-xs font-bold text-[#003366] hover:underline cursor-pointer"
                >
                  Changer de pays &rarr;
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Orders */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider text-[#003366] flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[#FF6600]" /> Dernières Commandes
              </h2>
              <Link
                to="/shop"
                className="text-xs font-bold text-[#FF6600] hover:underline flex items-center gap-1"
              >
                Passer une nouvelle commande &rarr;
              </Link>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl p-6 bg-gray-50/50">
                <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-gray-700">Aucune commande enregistrée</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Explorez le catalogue de matériel industriel pour passer votre première commande.
                </p>
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-[#003366] text-white rounded-xl text-xs font-bold"
                >
                  Consulter le catalogue &rarr;
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {orders.slice(0, 3).map(order => (
                  <div key={order.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-900">{order.orderNumber}</span>
                        <span className="text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleDateString('fr-FR')}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          order.paymentStatus === 'Payé intégralement' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {order.paymentStatus}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {order.items.length} article{order.items.length > 1 ? 's' : ''} : {order.items.map(i => i.name).slice(0, 2).join(', ')}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span className="font-mono font-black text-sm text-[#003366]">
                        {(order.totalTTC || 0).toLocaleString('fr-FR')} FCFA
                      </span>
                      <button
                        type="button"
                        onClick={() => printInvoice(order)}
                        className="p-1.5 bg-gray-100 hover:bg-[#003366] hover:text-white rounded-lg text-gray-700 transition-colors"
                        title="Télécharger PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: MES COMMANDES (EDIT, PAY, DELETE) ================= */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#003366]">
                Historique & Gestion des Commandes ({orders.length})
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Poursuivez le règlement PayDunya, modifiez ou annulez les dossiers non terminés, et téléchargez vos factures proforma.
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setOrderFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  orderFilter === 'all' ? 'bg-[#003366] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Toutes ({orders.length})
              </button>
              <button
                onClick={() => setOrderFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  orderFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                À payer / En attente ({pendingOrdersCount})
              </button>
              <button
                onClick={() => setOrderFilter('transit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  orderFilter === 'transit' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                }`}
              >
                En transit ({transitOrdersCount})
              </button>
              <button
                onClick={() => setOrderFilter('delivered')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  orderFilter === 'delivered' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Livrées ({deliveredOrdersCount})
              </button>
            </div>
          </div>

          {payError && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{payError}</span>
            </div>
          )}

          {filteredOrders.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl p-6">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-800">Aucune commande dans cette catégorie</h3>
              <p className="text-xs text-gray-400 mt-1">
                Vos commandes validées ou devis proforma apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map(order => {
                const isPaid = order.paymentStatus === 'Payé intégralement' || order.paymentStatus === 'Payé';
                const isPendingPayment = !isPaid;

                return (
                  <div
                    key={order.id}
                    className="border border-gray-200 rounded-2xl overflow-hidden hover:border-[#003366]/40 transition-all bg-white shadow-xs"
                  >
                    {/* Clean Order Header without redundant SEA | SEA */}
                    <div className="bg-gray-50/80 px-5 py-3.5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-sm text-[#003366]">
                          {order.orderNumber}
                        </span>
                        <span className="text-gray-500 font-mono text-[11px]">
                          {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                        {order.isQuote && (
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px]">
                            Devis Proforma
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          order.status === 'Livrée'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : order.status === 'En transit'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {order.status}
                        </span>

                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-orange-50 text-orange-800 border border-orange-200'
                        }`}>
                          {order.paymentStatus}
                        </span>
                      </div>
                    </div>

                    {/* Order Items Table */}
                    <div className="p-5 space-y-4">
                      <div className="divide-y divide-gray-100">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="font-bold text-[#003366] bg-blue-50 px-2 py-0.5 rounded text-[11px] shrink-0 font-mono">
                                x{it.quantity}
                              </span>
                              <div className="truncate">
                                <span className="font-bold text-gray-900">{it.name}</span>
                                <span className="text-gray-400 text-[10px] block">
                                  {it.brand || 'OEM'} • {it.shippingMethod === 'air' ? '✈️ Fret Aérien' : it.shippingMethod === 'sea' ? '🚢 Fret Maritime' : '📦 Stock Local'}
                                </span>
                              </div>
                            </div>
                            <div className="font-mono font-bold text-gray-800 shrink-0">
                              {((it.price || 0) * (it.quantity || 1)).toLocaleString('fr-FR')} FCFA
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Order Actions: Pay with PayDunya, Resume in Cart, Delete, Print */}
                      <div className="pt-4 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="text-xs text-gray-500">
                          <div><strong>Livraison :</strong> {order.customerAddress || 'Adresse client'}, {order.customerCity || 'Dakar'}</div>
                          <div><strong>Règlement :</strong> {order.paymentMethod || 'PayDunya'}</div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 self-end md:self-auto">
                          <div className="text-right mr-2">
                            <span className="block text-[10px] text-gray-400 uppercase font-bold">Total TTC</span>
                            <span className="text-base font-black font-mono text-[#003366]">
                              {(order.totalTTC || 0).toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>

                          {/* Action 1: Pay now via PayDunya if unpaid */}
                          {isPendingPayment && (
                            <button
                              type="button"
                              onClick={() => handlePayOrderWithPaydunya(order)}
                              disabled={payingOrderId === order.id}
                              className="px-3.5 py-2 bg-[#FF6600] hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              {payingOrderId === order.id ? 'Ouverture...' : 'Payer avec PayDunya'}
                            </button>
                          )}

                          {/* Action 2: Resume / Edit in Cart */}
                          {isPendingPayment && (
                            <button
                              type="button"
                              onClick={() => handleResumeOrderInCart(order)}
                              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                              title="Reprendre et modifier les articles de cette commande dans votre panier"
                            >
                              <Edit className="w-3.5 h-3.5 text-orange-400" />
                              <span>Modifier</span>
                            </button>
                          )}

                          {/* Action 3: Download PDF (Facture Définitive si payé ou Proforma B2B) */}
                          <button
                            type="button"
                            onClick={() => printInvoice(order)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs text-white ${
                              order.paymentStatus === 'Payé intégralement' || order.paymentStatus === 'Payé'
                                ? 'bg-emerald-700 hover:bg-emerald-800'
                                : 'bg-[#003366] hover:bg-[#002244]'
                            }`}
                            title={order.paymentStatus === 'Payé intégralement' || order.paymentStatus === 'Payé'
                              ? "Télécharger la Facture Définitive Acquittée (.PDF)"
                              : "Télécharger le Devis Proforma Officiel (.PDF)"}
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{order.paymentStatus === 'Payé intégralement' || order.paymentStatus === 'Payé' ? 'Facture PDF' : 'Proforma PDF'}</span>
                          </button>

                          {/* Action 4: Delete / Cancel if unpaid */}
                          {isPendingPayment && (
                            <button
                              type="button"
                              onClick={() => setOrderToDelete(order)}
                              className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs transition-all border border-red-200 cursor-pointer"
                              title="Annuler et supprimer cette commande non finalisée"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2B: PRODUITS AIMÉS (FAVORIS DÉDIÉS) ================= */}
      {activeTab === 'liked' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#003366] flex items-center gap-2.5">
                <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
                <span>Mes Produits Aimés ({likedProducts.length})</span>
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Retrouvez tous les équipements industriels et matériels MRO que vous avez aimés pour les commander rapidement ou suivre leur disponibilité de livraison vers votre pays par défaut (<strong>{defaultCountry || 'Sénégal'}</strong>).
              </p>
            </div>
            <Link
              to="/shop"
              className="px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>Explorer le catalogue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {likedProducts.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl p-6 bg-gray-50/50">
              <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-800">Aucun produit aimé pour le moment</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                Cliquez sur l'icône cœur ❤️ sur n'importe quelle fiche produit ou dans le catalogue pour enregistrer vos équipements favoris dans cet espace dédié.
              </p>
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-[#FF6600] hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-md transition-all"
              >
                <span>Découvrir les matériels</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {likedProducts.map(prod => {
                const basePrice = getEffectiveProductBasePrice(prod);
                const isSourcing = isProductSourcing(prod);
                const deliveryCheck = catalogService.isCountryDeliverableForProduct(defaultCountry || 'Sénégal', prod);
                const whFreight = catalogService.getProductWarehouseAndFreight(prod, parseWeightToKg(prod.weight) || 1);

                return (
                  <div
                    key={prod.id}
                    className="border border-gray-200 rounded-2xl p-4 flex flex-col justify-between bg-white hover:border-[#003366]/40 transition-all shadow-xs group"
                  >
                    <div>
                      <div className="relative aspect-video bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center p-3 mb-3 overflow-hidden">
                        <Link to={`/product/${prod.id}`} className="w-full h-full flex items-center justify-center">
                          <img
                            src={getProductImageUrl(prod.img)}
                            alt={prod.name}
                            className="max-h-28 max-w-full object-contain group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                            onError={handleImageError}
                          />
                        </Link>
                        <span className="absolute top-2 left-2 bg-white/95 border border-gray-200 px-2 py-0.5 rounded text-[9px] font-bold text-[#003366] uppercase">
                          {prod.brand}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            catalogService.toggleLikedProduct(prod.id, user.uid);
                            triggerToast(`"${prod.name}" retiré de vos produits aimés.`);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/95 border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer shadow-2xs"
                          title="Retirer des produits aimés"
                        >
                          <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        {isSourcing ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-orange-50 text-[#FF6600] border border-orange-200">
                            À sourcer • {whFreight.offersAirFreight && whFreight.offersSeaFreight ? 'Air & Mer' : whFreight.offersAirFreight ? 'Fret Aérien' : 'Fret Maritime'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Stock Local • Dispo immédiate
                          </span>
                        )}

                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          deliveryCheck.deliverable
                            ? 'bg-blue-50 text-[#003366] border border-blue-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {deliveryCheck.deliverable
                            ? `✓ Livré vers ${deliveryCheck.canonicalCountry}`
                            : `⚠️ Non livré vers ${deliveryCheck.canonicalCountry}`}
                        </span>
                      </div>

                      <Link
                        to={`/product/${prod.id}`}
                        className="font-bold text-sm text-gray-900 hover:text-[#003366] line-clamp-2 leading-snug block"
                      >
                        {prod.name}
                      </Link>
                      <p className="text-[10px] text-gray-400 font-mono mt-1">
                        Réf: {prod.ref || prod.model} • Origine: {prod.origin || 'International'}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1">
                        Pays livrés : <span className="font-semibold text-gray-700">{deliveryCheck.supportedCountries.join(', ')}</span>
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 space-y-2.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[10px] font-bold uppercase text-gray-400">Prix Unitaire HT</span>
                        <span className="font-mono font-black text-sm text-[#003366]">
                          {basePrice.toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const weightKg = parseWeightToKg(prod.weight) || 1;
                            const wf = catalogService.getProductWarehouseAndFreight(prod, weightKg);
                            const method = isSourcing ? wf.defaultClientMethod : 'none';
                            const fCost = isSourcing ? (method === 'air' ? wf.airFreightCost : wf.seaFreightCost) : 0;
                            addItem({
                              productId: prod.id,
                              name: prod.name,
                              price: basePrice,
                              costPrice: prod.costPrice,
                              supplierPrice: prod.supplierPrice,
                              supplierCurrency: prod.supplierCurrency,
                              supplierId: prod.supplierId,
                              supplierName: prod.supplierName,
                              brand: prod.brand,
                              origin: prod.origin,
                              quantity: 1,
                              img: prod.img,
                              weightKg,
                              inStock: !isSourcing,
                              availabilityMode: isSourcing ? 'sourcing' : 'stock',
                              shippingMethod: method,
                              freightCost: fCost,
                              seaFreightCostXOF: wf.seaFreightCost,
                              airFreightCostXOF: wf.airFreightCost
                            });
                            triggerToast(`"${prod.name}" ajouté au panier.`);
                          }}
                          className="flex-1 bg-[#003366] hover:bg-[#002244] text-white py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Ajouter au panier</span>
                        </button>
                        <Link
                          to={`/product/${prod.id}`}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                        >
                          Fiche
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: MON PROFIL (WITH SENSITIVE INFO EMAIL OTP) ================= */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-6 animate-fadeIn">
          <div className="border-b border-gray-100 pb-5">
            <h1 className="text-xl sm:text-2xl font-black text-[#003366]">
              Coordonnées & Informations du Compte
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              La modification des coordonnées sensibles (téléphone, entreprise, adresse) requiert une vérification par code reçu sur votre email.
            </p>
          </div>

          {saveSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Vos coordonnées ont été enregistrées avec succès.</span>
            </div>
          )}

          {otpError && (
            <div className="p-3.5 bg-red-50 border border-red-300 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>{otpError}</span>
            </div>
          )}

          <form onSubmit={handleInitiateProfileSave} className="space-y-4 text-xs">
            {/* Statut Client : Particulier ou Entreprise */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <label className="block font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                Statut Client & Régime Fiscal :
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-white border border-slate-200 rounded-xl">
                <button
                  type="button"
                  onClick={() => setClientType('b2c')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    clientType === 'b2c'
                      ? 'bg-[#003366] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Particulier (B2C)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setClientType('b2b')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    clientType === 'b2b'
                      ? 'bg-[#003366] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Entreprise / Société (B2B)</span>
                </button>
              </div>
              <p className="text-[10px] text-gray-500">
                {clientType === 'b2b'
                  ? 'Permet d\'émettre vos factures et proformas conformes avec NINEA, RCCM et TVA déductible / exonération.'
                  : 'Facturation simplifiée au nom du particulier avec calcul automatique de la TVA locale ou 0% Export.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">
                  {clientType === 'b2b' ? 'Nom du Représentant / Acheteur *' : 'Nom & Prénom du Contact *'}
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder={clientType === 'b2b' ? 'Ex: Babacar Sarr (Direction Achats)' : 'Ex: Amadou Ndiaye'}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#003366]"
                />
              </div>

              {clientType === 'b2b' ? (
                <div>
                  <label className="block font-bold text-[#003366] uppercase mb-1">
                    Raison Sociale / Entreprise *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Ex: Sahel Industries BTP SA"
                    className="w-full border border-blue-300 bg-blue-50/40 font-semibold rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#003366]"
                  />
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">
                    Activité / Profession (Optionnel)
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Ex: Artisan, Ingénieur, Consultant..."
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#003366]"
                  />
                </div>
              )}

              {clientType === 'b2b' && (
                <>
                  <div>
                    <label className="block font-bold text-gray-700 uppercase mb-1">
                      NINEA (Numéro d'Identification Fiscale Sénégal)
                    </label>
                    <input
                      type="text"
                      value={ninea}
                      onChange={e => setNinea(e.target.value)}
                      placeholder="Ex: 008921822"
                      className="w-full border border-gray-300 font-mono rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#003366]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 uppercase mb-1">
                      RCCM (Registre du Commerce)
                    </label>
                    <input
                      type="text"
                      value={rccm}
                      onChange={e => setRccm(e.target.value)}
                      placeholder="Ex: SN-DKR-2024-B-14892"
                      className="w-full border border-gray-300 font-mono rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#003366]"
                    />
                  </div>

                  <div className="sm:col-span-2 p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
                    <label className="block font-bold text-purple-900 uppercase mb-1 text-[11px]">
                      Attestation d'Exonération de TVA DGID (Si bénéficiaire Art. 358 CGI)
                    </label>
                    <input
                      type="text"
                      value={taxExemptionNumber}
                      onChange={e => setTaxExemptionNumber(e.target.value)}
                      placeholder="Ex: DGID-EXO-2025-8842"
                      className="w-full border border-purple-300 bg-white font-mono rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-600"
                    />
                    <span className="text-[10px] text-purple-700 mt-1 block">
                      Permet d'appliquer automatiquement 0% TVA avec visa fiscal officiel sur vos commandes.
                    </span>
                  </div>
                </>
              )}

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">
                  Téléphone Principal (WhatsApp / PayDunya) *
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="+221 77 000 00 00"
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">
                  Adresse Email (Identifiant de connexion sécurisé)
                </label>
                <input
                  type="email"
                  disabled
                  value={user.email || ''}
                  className="w-full border border-gray-200 bg-gray-50 text-gray-500 rounded-xl px-3.5 py-2.5 text-xs font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">
                  Pays de Livraison par Défaut *
                </label>
                <select
                  value={defaultCountry}
                  onChange={e => setDefaultCountry(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#003366] focus:outline-none focus:border-[#003366] bg-white"
                >
                  <optgroup label="Pays pris en charge de base par la livraison">
                    {(siteSettings.supportedDeliveryCountries || DEFAULT_SUPPORTED_DELIVERY_COUNTRIES).map(c => (
                      <option key={`sup-${c}`} value={c}>{c} (Livraison prise en charge)</option>
                    ))}
                  </optgroup>
                  <optgroup label="Tous les pays">
                    {WORLD_COUNTRIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                </select>
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Utilisé automatiquement lors de vos commandes si aucun autre pays n'est renseigné.
                </span>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">
                  Ville de Livraison ({defaultCountry || 'Sénégal'})
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Ex: Dakar, Abidjan, Bamako..."
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-gray-700 uppercase mb-1">
                  Adresse Précise de Livraison
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Ex: Km 4 Boulevard du Centenaire, Entrepôt B"
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#003366]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[11px] text-gray-500 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                Vérification par code email obligatoire pour toute modification sensible.
              </span>

              <button
                type="submit"
                disabled={isSendingOtp}
                className="px-6 py-2.5 bg-[#003366] hover:bg-[#002244] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                {isSendingOtp ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Valider & Demander le Code</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= TAB 4: SETTINGS ================= */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-6 animate-fadeIn">
          <div className="border-b border-gray-100 pb-5">
            <h1 className="text-xl sm:text-2xl font-black text-[#003366]">
              Préférences & Notifications
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Configurez vos alertes logistiques et préférences d'acheminement.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 border border-gray-200 rounded-2xl flex items-center justify-between">
              <div>
                <strong className="block text-gray-900 font-bold">Notifications WhatsApp Direct</strong>
                <span className="text-gray-500 text-[11px]">Recevoir les mises à jour de statut colis et de fret par WhatsApp</span>
              </div>
              <input
                type="checkbox"
                checked={notifyWhatsapp}
                onChange={e => setNotifyWhatsapp(e.target.checked)}
                className="w-4 h-4 accent-[#FF6600] rounded cursor-pointer"
              />
            </div>

            <div className="p-4 border border-gray-200 rounded-2xl flex items-center justify-between">
              <div>
                <strong className="block text-gray-900 font-bold">Factures & Devis par Email</strong>
                <span className="text-gray-500 text-[11px]">Envoi automatique des factures proforma dès validation de commande</span>
              </div>
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={e => setNotifyEmail(e.target.checked)}
                className="w-4 h-4 accent-[#FF6600] rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* SENSITIVE INFO EMAIL OTP MODAL */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-[#003366]">
                <ShieldCheck className="w-5 h-5 text-[#FF6600]" />
                <h3 className="font-black text-sm uppercase tracking-wider">Sécurité du Compte Client</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-600 leading-relaxed">
              Pour des raisons de sécurité, veuillez saisir le code de vérification à 6 chiffres envoyé à votre adresse email <strong>{user.email}</strong> pour confirmer la modification de vos coordonnées.
            </p>

            {otpError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{otpError}</span>
              </div>
            )}

            {generatedFallbackOtp && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                <span className="font-bold text-amber-900">Code de validation directe :</span>
                <button
                  type="button"
                  onClick={() => setOtpCode(generatedFallbackOtp)}
                  className="px-2.5 py-1 bg-amber-600 text-white rounded-lg font-mono font-black cursor-pointer"
                >
                  {generatedFallbackOtp}
                </button>
              </div>
            )}

            <form onSubmit={handleVerifyOtpAndSaveProfile} className="space-y-4">
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1 text-center">
                  Code de Confirmation Email
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full py-3 px-4 text-center font-mono text-2xl font-black tracking-[0.3em] border-2 border-[#003366] rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                  autoFocus
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isVerifyingOtp || otpCode.length < 6}
                  className="px-6 py-2.5 bg-[#FF6600] hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-lg shadow-orange-600/30 flex items-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  {isVerifyingOtp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Confirmer la Modification</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE ORDER MODAL */}
      {orderToDelete && (
        <ConfirmModal
          isOpen={Boolean(orderToDelete)}
          title="Annuler et Supprimer la Commande"
          message={`Êtes-vous sûr de vouloir supprimer définitivement le dossier "${orderToDelete.orderNumber}" ? Cette action est irréversible.`}
          onConfirm={handleConfirmDeleteOrder}
          onCancel={() => setOrderToDelete(null)}
        />
      )}
    </div>
  );
}
