import { Mail, Phone, MapPin, Send, MessageCircle } from 'lucide-react';

export default function Contact() {
  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold font-roboto text-[#003366] mb-4">Contactez Zone Équipements Sénégal</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Notre équipe est à votre disposition pour toute demande de devis, de sourcing ou d'assistance technique.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          
          {/* Contact Info */}
          <div>
            <div className="bg-[#003366] text-white rounded-2xl p-10 shadow-lg relative overflow-hidden">
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#FF6600]/20 rounded-full blur-3xl"></div>
              
              <h2 className="text-3xl font-bold font-roboto mb-8 relative z-10">Informations de contact</h2>
              
              <div className="space-y-8 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="bg-white/10 p-3 rounded-lg">
                    <Mail className="w-6 h-6 text-[#FF6600]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Email Professionnel</h3>
                    <a href="mailto:zoneequipements@gmail.com" className="text-gray-300 hover:text-white transition-colors">zoneequipements@gmail.com</a>
                    <p className="text-sm text-gray-400 mt-1">Réponse sous 24h ouvrées</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-white/10 p-3 rounded-lg">
                    <MessageCircle className="w-6 h-6 text-[#FF6600]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">WhatsApp 24/7</h3>
                    <a href="https://wa.me/221766538384" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white hover:underline transition-colors">
                      +221 76 653 83 84 (00221766538384)
                    </a>
                    <p className="text-sm text-gray-400 mt-1">Assistance immédiate</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-white/10 p-3 rounded-lg">
                    <Phone className="w-6 h-6 text-[#FF6600]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Téléphone Direct</h3>
                    <a href="tel:+221766538384" className="text-gray-300 hover:text-white transition-colors">
                      +221 76 653 83 84
                    </a>
                    <p className="text-sm text-gray-400 mt-1">Lun-Ven, 8h-18h GMT</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-white/10 p-3 rounded-lg">
                    <MapPin className="w-6 h-6 text-[#FF6600]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Siège & Entrepôt</h3>
                    <p className="text-gray-300">Dakar, Sénégal</p>
                    <p className="text-sm text-gray-400 mt-1">Km 4, Boulevard du Centenaire, Dakar</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100">
            <h2 className="text-3xl font-bold font-roboto text-[#003366] mb-8">Envoyez-nous un message</h2>
            
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-2">Nom complet *</label>
                  <input type="text" id="name" className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF6600] focus:border-transparent transition-shadow" placeholder="Jean Dupont" required />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">Email *</label>
                  <input type="email" id="email" className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF6600] focus:border-transparent transition-shadow" placeholder="jean@entreprise.com" required />
                </div>
              </div>

              <div>
                <label htmlFor="sector" className="block text-sm font-bold text-gray-700 mb-2">Secteur d'activité *</label>
                <select id="sector" className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF6600] focus:border-transparent transition-shadow" required>
                  <option value="">Sélectionnez un secteur...</option>
                  <option value="mines">Mines & Extraction</option>
                  <option value="agriculture">Agriculture & Agro-industrie</option>
                  <option value="btp">BTP & Construction</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-bold text-gray-700 mb-2">Sujet *</label>
                <input type="text" id="subject" className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF6600] focus:border-transparent transition-shadow" placeholder="Demande de devis, Sourcing..." required />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-bold text-gray-700 mb-2">Message *</label>
                <textarea id="message" rows={5} className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF6600] focus:border-transparent transition-shadow resize-none" placeholder="Décrivez votre besoin en détail..." required></textarea>
              </div>

              <button type="submit" className="w-full bg-[#FF6600] hover:bg-[#e65c00] text-white font-bold py-4 rounded-md transition-colors flex items-center justify-center gap-2 text-lg">
                Envoyer le message <Send className="w-5 h-5" />
              </button>
              <p className="text-xs text-gray-400 text-center mt-4">
                En soumettant ce formulaire, vous acceptez que vos données soient utilisées pour traiter votre demande.
              </p>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
