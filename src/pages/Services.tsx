import { ArrowRight } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Services() {
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero */}
      <section className="bg-[#003366] text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold font-roboto mb-6">Nos Services</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Au-delà de la simple mise en relation, Zone Équipements Sénégal vous accompagne à chaque étape de votre approvisionnement industriel.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            
            {/* Service 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-[#003366] text-white rounded-xl flex items-center justify-center mb-6 shadow-md">
                  <Icons.HeadphonesIcon className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-[#003366] mb-4 font-roboto">Service Client 24/7</h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Une équipe dédiée disponible à tout moment via le chat en direct (Tawk.to) ou sur WhatsApp pour répondre à vos questions, suivre vos commandes ou résoudre le moindre problème.
                </p>
                <a href="https://wa.me/221766538384" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[#FF6600] font-bold hover:gap-3 transition-all">
                  Contacter sur WhatsApp <ArrowRight className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Service 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-[#FF6600] text-white rounded-xl flex items-center justify-center mb-6 shadow-md">
                  <Icons.Search className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-[#003366] mb-4 font-roboto">Sourcing sur Demande</h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Vous ne trouvez pas la pièce spécifique qu'il vous faut ? Notre équipe d'experts recherche pour vous les équipements industriels rares ou spécifiques auprès de notre réseau mondial.
                </p>
                <Link to="/contact" className="inline-flex items-center gap-2 text-[#003366] font-bold hover:gap-3 transition-all">
                  Faire une demande <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
