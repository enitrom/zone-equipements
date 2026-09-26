import { Download, FileText, Code, Database, MessageSquare } from 'lucide-react';

export default function Assets() {
  const downloadCSV = () => {
    const csvContent = `Nom, Prix, Lien Fournisseur, Délai, Secteur
"Compresseur industriel X", "500000 FCFA", "https://raptorsupplies.com/product/x", "10 jours", "Mines"
"Générateur Diesel 50kVA", "1200000 FCFA", "https://grainger.com/product/y", "15 jours", "BTP"
"Pompe Hydraulique Haute Pression", "350000 FCFA", "https://mcmaster.com/product/z", "7 jours", "Agriculture"
"Kit Outillage Mécanique Pro", "150000 FCFA", "https://raptorsupplies.com/product/a", "5 jours", "Mines"
"Moteur Électrique Triphasé", "280000 FCFA", "https://grainger.com/product/b", "12 jours", "Agriculture"`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "afrimro_import_produits.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold font-roboto text-[#003366] mb-4">Ressources Générées (Pour WordPress)</h1>
          <p className="text-gray-600">
            Voici les contenus demandés pour intégration dans votre site WordPress (Elementor/Astra).
          </p>
        </div>

        <div className="space-y-8">
          {/* CSV Download */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-[#FF6600]" />
              <h2 className="text-xl font-bold text-[#003366]">1. Fichier d'import CSV (WP All Import)</h2>
            </div>
            <p className="text-gray-600 mb-4 text-sm">Fichier formaté pour l'importation de produits externes WooCommerce.</p>
            <button 
              onClick={downloadCSV}
              className="bg-[#003366] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-[#002244] transition-colors text-sm font-bold"
            >
              <Download className="w-4 h-4" /> Télécharger le CSV d'exemple
            </button>
          </div>

          {/* CSS Code */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <Code className="w-6 h-6 text-[#FF6600]" />
              <h2 className="text-xl font-bold text-[#003366]">2. Code CSS Personnalisé (Apparence {'>'} Personnaliser)</h2>
            </div>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`/* Boutons orange avec effet hover */
.elementor-button, .button, .btn {
    background-color: #FF6600 !important;
    color: #FFFFFF !important;
    border-radius: 5px;
    transition: all 0.3s ease;
}

.elementor-button:hover, .button:hover, .btn:hover {
    background-color: #e65c00 !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(255, 102, 0, 0.3);
}

/* Police Roboto pour les titres */
h1, h2, h3, h4, h5, h6, .elementor-heading-title {
    font-family: 'Roboto', sans-serif !important;
}

/* Taille spécifique demandée */
h2.elementor-heading-title {
    font-size: 24px !important;
    color: #003366 !important;
}`}
            </pre>
          </div>

          {/* Text Content */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-[#FF6600]" />
              <h2 className="text-xl font-bold text-[#003366]">3. Textes pour la page d'accueil</h2>
            </div>
            <div className="prose prose-sm max-w-none text-gray-600">
              <h3 className="text-lg font-bold text-gray-800">Hero Section</h3>
              <p><strong>Titre :</strong> Trouvez vos fournitures industrielles en 3 clics</p>
              <p><strong>Sous-titre :</strong> Afrimro est la première plateforme B2B dédiée à l'approvisionnement industriel en Afrique. Nous connectons les entreprises des secteurs minier, agricole et du BTP aux meilleurs fournisseurs mondiaux de produits MRO (Maintenance, Repair, and Operations). Fini les intermédiaires coûteux et les délais incertains : comparez, commandez et faites-vous livrer directement sur votre site d'exploitation.</p>
              
              <h3 className="text-lg font-bold text-gray-800 mt-4">Pourquoi choisir Afrimro ?</h3>
              <p>L'approvisionnement en matériel industriel en Afrique est souvent complexe. Afrimro simplifie ce processus en vous offrant un catalogue centralisé de milliers de références. Que vous cherchiez un compresseur haute pression, des pièces de rechange pour vos tracteurs ou de l'outillage spécialisé, notre comparateur intégré vous garantit le meilleur rapport qualité-prix. De plus, grâce à notre intégration avec PayDunya, réglez vos achats internationaux facilement via Orange Money ou Wave, en monnaie locale.</p>
            </div>
          </div>

          {/* Chatbot Script */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="w-6 h-6 text-[#FF6600]" />
              <h2 className="text-xl font-bold text-[#003366]">4. Script Chatbot (Tawk.to Triggers)</h2>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm space-y-4">
              <div>
                <strong className="text-gray-800">Message de bienvenue (Auto-trigger après 10s) :</strong><br/>
                "Bonjour ! 👋 Bienvenue sur Afrimro. Je suis là pour vous aider à trouver l'équipement industriel qu'il vous faut. Que recherchez-vous aujourd'hui ?"
              </div>
              <div>
                <strong className="text-gray-800">Raccourci /paiement :</strong><br/>
                "Nous acceptons les paiements locaux via PayDunya (Orange Money, Wave) ainsi que les paiements internationaux par PayPal ou carte bancaire. Les prix sont affichés en FCFA pour faciliter vos transactions."
              </div>
              <div>
                <strong className="text-gray-800">Raccourci /livraison :</strong><br/>
                "Nous travaillons avec DHL et Aramex pour assurer des livraisons rapides partout en Afrique. Comptez généralement entre 10 et 15 jours ouvrés selon la disponibilité chez le fournisseur."
              </div>
              <div>
                <strong className="text-gray-800">Raccourci /devis :</strong><br/>
                "Pour une demande de devis spécifique ou du sourcing de pièces rares, veuillez remplir notre formulaire de contact ou nous écrire directement sur WhatsApp au +221 77 000 00 00. Un conseiller vous répondra sous 24h."
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
