import { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const articles = [
  { id: 1, title: 'Comment choisir un compresseur industriel ?', excerpt: 'Découvrez les critères essentiels pour choisir le compresseur adapté à vos besoins de production.', date: '12 Mars 2026', category: 'Guide d\'achat' },
  { id: 2, title: 'Maintenance préventive des générateurs diesel', excerpt: 'Les 5 étapes clés pour assurer la longévité de vos groupes électrogènes sur chantier.', date: '05 Mars 2026', category: 'Maintenance' },
  { id: 3, title: 'Normes de sécurité pour l\'outillage minier', excerpt: 'Ce qu\'il faut savoir avant d\'équiper vos équipes d\'extraction.', date: '28 Fév 2026', category: 'Sécurité' },
  { id: 4, title: 'Optimiser l\'irrigation agricole avec les pompes solaires', excerpt: 'Une solution économique et durable pour l\'agro-industrie en Afrique.', date: '15 Fév 2026', category: 'Agriculture' },
  { id: 5, title: 'Comprendre les délais de livraison internationaux', excerpt: 'Comment Zone Équipements Sénégal travaille avec DHL et Aramex pour réduire vos temps d\'attente.', date: '02 Fév 2026', category: 'Logistique' },
];

const faqs = [
  { q: 'Comment payer ma commande via Orange Money ou Wave ?', a: 'Lors du paiement, sélectionnez l\'option PayDunya. Vous serez redirigé vers une page sécurisée où vous pourrez choisir Orange Money ou Wave. Entrez votre numéro et validez sur votre téléphone.' },
  { q: 'Quels sont les délais de livraison habituels ?', a: 'Nos partenaires logistiques (DHL, Aramex) assurent généralement une livraison sous 10 à 15 jours ouvrés à compter de la confirmation de votre commande par le fournisseur.' },
  { q: 'Puis-je suivre ma commande ?', a: 'Oui, dès que votre commande est expédiée, vous recevrez un numéro de suivi par email et WhatsApp, consultable directement sur notre site via la page "Suivi de commande".' },
  { q: 'Les prix affichés incluent-ils les frais de douane ?', a: 'Non, les prix affichés couvrent le coût du produit et notre commission. Les frais de livraison et de douane seront calculés lors de la finalisation de votre commande selon votre pays de destination.' },
  { q: 'Que faire si un produit reçu est défectueux ?', a: 'Contactez immédiatement notre service client 24/7 via le chat ou WhatsApp avec des photos du produit. Nous ferons le lien avec le fournisseur pour organiser un remplacement ou un remboursement selon leurs conditions de garantie.' },
];

export default function Blog() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold font-roboto text-[#003366] mb-4">Ressources & FAQ</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Retrouvez nos guides d'experts et les réponses à vos questions les plus fréquentes.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          
          {/* Blog Section */}
          <div>
            <div className="flex items-center gap-3 mb-8 border-b border-gray-200 pb-4">
              <BookOpen className="w-8 h-8 text-[#FF6600]" />
              <h2 className="text-3xl font-bold font-roboto text-[#003366]">Derniers Articles</h2>
            </div>
            
            <div className="space-y-6">
              {articles.map(article => (
                <article key={article.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-3">
                    <span className="bg-blue-50 text-[#003366] text-xs font-bold px-3 py-1 rounded-full">{article.category}</span>
                    <span className="text-sm text-gray-400">{article.date}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3 hover:text-[#FF6600] transition-colors cursor-pointer">
                    {article.title}
                  </h3>
                  <p className="text-gray-600 mb-4">{article.excerpt}</p>
                  <button className="text-[#FF6600] font-bold text-sm hover:underline">Lire la suite →</button>
                </article>
              ))}
            </div>
          </div>

          {/* FAQ Section (Heroic KB Mockup) */}
          <div>
            <div className="flex items-center gap-3 mb-8 border-b border-gray-200 pb-4">
              <HelpCircle className="w-8 h-8 text-[#003366]" />
              <h2 className="text-3xl font-bold font-roboto text-[#003366]">Foire Aux Questions</h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <button 
                    className="w-full px-6 py-5 text-left font-bold text-gray-800 flex justify-between items-center hover:bg-gray-50 transition-colors"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  >
                    <span className="pr-8">{faq.q}</span>
                    {openFaq === index ? (
                      <ChevronUp className="w-5 h-5 text-[#FF6600] flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                  {openFaq === index && (
                    <div className="px-6 pb-5 text-gray-600 leading-relaxed border-t border-gray-50 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 bg-blue-50 p-6 rounded-xl border border-blue-100 text-center">
              <h3 className="font-bold text-[#003366] mb-2">Vous ne trouvez pas votre réponse ?</h3>
              <p className="text-sm text-gray-600 mb-4">Notre équipe est disponible 24/7 pour vous aider.</p>
              <Link to="/contact" className="inline-block bg-[#003366] text-white px-6 py-2 rounded-md font-bold hover:bg-[#002244] transition-colors">
                Contactez-nous
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
