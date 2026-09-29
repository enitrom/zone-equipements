import React, { useState, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { Search, X, Check } from 'lucide-react';

export interface IconItem {
  name: string;
  label: string;
  category: string;
}

export const INDUSTRIAL_ICON_PACK: IconItem[] = [
  // Outillage & Mécanique
  { name: 'Wrench', label: 'Clé / Outillage', category: 'Outillage' },
  { name: 'Hammer', label: 'Marteau', category: 'Outillage' },
  { name: 'Scissors', label: 'Découpe / Ciseaux', category: 'Outillage' },
  { name: 'Settings', label: 'Engrenage / Mécanique', category: 'Outillage' },
  { name: 'Cog', label: 'Roue dentée', category: 'Outillage' },
  { name: 'Drill', label: 'Perçage / Forage', category: 'Outillage' },
  { name: 'Disc', label: 'Disque / Abrasif', category: 'Outillage' },
  { name: 'Layers', label: 'Couches / Plaques', category: 'Outillage' },
  { name: 'Anchor', label: 'Ancrage / Fixation', category: 'Outillage' },
  { name: 'Key', label: 'Quincaillerie / Clé', category: 'Outillage' },
  { name: 'Lock', label: 'Verrouillage / Sécurité', category: 'Outillage' },
  { name: 'DoorOpen', label: 'Ouverture / Porte', category: 'Outillage' },

  // Électricité, Électronique & Énergie
  { name: 'Zap', label: 'Électricité / Énergie', category: 'Électricité' },
  { name: 'Cpu', label: 'Automate / Processeur', category: 'Électricité' },
  { name: 'Battery', label: 'Batterie / Accu', category: 'Électricité' },
  { name: 'BatteryCharging', label: 'Chargeur / Secours', category: 'Électricité' },
  { name: 'Sun', label: 'Solaire / Photovoltaïque', category: 'Électricité' },
  { name: 'Plug', label: 'Prise / Connecteur', category: 'Électricité' },
  { name: 'Cable', label: 'Câble / Filaire', category: 'Électricité' },
  { name: 'Lightbulb', label: 'Éclairage / Lampe', category: 'Électricité' },
  { name: 'Lamp', label: 'Luminaire industriel', category: 'Électricité' },
  { name: 'Flashlight', label: 'Projecteur / Torche', category: 'Électricité' },
  { name: 'Radio', label: 'Communication / Radio', category: 'Électricité' },
  { name: 'Activity', label: 'Moteur / Signal / Fréquence', category: 'Électricité' },

  // Fluides, Pompes & CVC
  { name: 'Droplet', label: 'Goutte / Lubrifiant', category: 'Fluides & Pompes' },
  { name: 'Droplets', label: 'Hydraulique / Eau', category: 'Fluides & Pompes' },
  { name: 'Waves', label: 'Pompe HP / Débit', category: 'Fluides & Pompes' },
  { name: 'Wind', label: 'CVC / Ventilation / Air', category: 'Fluides & Pompes' },
  { name: 'Fan', label: 'Ventilateur / Extraction', category: 'Fluides & Pompes' },
  { name: 'Snowflake', label: 'Froid / Climatisation', category: 'Fluides & Pompes' },
  { name: 'Flame', label: 'Thermique / Chauffage', category: 'Fluides & Pompes' },
  { name: 'Filter', label: 'Filtration / Purificateur', category: 'Fluides & Pompes' },
  { name: 'FlaskConical', label: 'Chimie / Réactif', category: 'Fluides & Pompes' },
  { name: 'Pipette', label: 'Raccord / Tuyau', category: 'Fluides & Pompes' },

  // Logistique, Manutention & Stockage
  { name: 'Truck', label: 'Camion / Fret / Manutention', category: 'Logistique' },
  { name: 'Package', label: 'Colis / Matériel', category: 'Logistique' },
  { name: 'Box', label: 'Boîte / Caisse', category: 'Logistique' },
  { name: 'Archive', label: 'Stockage / Rayonnage', category: 'Logistique' },
  { name: 'Scale', label: 'Pesage / Balance', category: 'Logistique' },
  { name: 'Navigation', label: 'Navigation / Transit', category: 'Logistique' },
  { name: 'Globe', label: 'Import / International', category: 'Logistique' },
  { name: 'MapPin', label: 'Localisation / Chantier', category: 'Logistique' },

  // BTP, Mines, Agro & Environnement
  { name: 'HardHat', label: 'BTP / Chantier', category: 'Industries' },
  { name: 'Mountain', label: 'Mines / Carrières', category: 'Industries' },
  { name: 'Sprout', label: 'Agroalimentaire / Agri', category: 'Industries' },
  { name: 'Trees', label: 'Équipement d\'extérieur', category: 'Industries' },
  { name: 'Paintbrush', label: 'Peinture & Revêtement', category: 'Industries' },
  { name: 'Brush', label: 'Brosse industrielle', category: 'Industries' },
  { name: 'Armchair', label: 'Mobilier & Agencement', category: 'Industries' },
  { name: 'Printer', label: 'Bureautique & Traçabilité', category: 'Industries' },
  { name: 'Barcode', label: 'Code-barres / Étiquetage', category: 'Industries' },
  { name: 'Sparkles', label: 'Nettoyage & Propreté', category: 'Industries' },
  { name: 'Trash', label: 'Gestion des déchets', category: 'Industries' },

  // Mesure, Contrôle & Sécurité
  { name: 'Gauge', label: 'Manomètre / Jauge', category: 'Mesure & Sécurité' },
  { name: 'Ruler', label: 'Mesure / Dimension', category: 'Mesure & Sécurité' },
  { name: 'Microscope', label: 'Laboratoire / Contrôle', category: 'Mesure & Sécurité' },
  { name: 'Beaker', label: 'Verrerie scientifique', category: 'Mesure & Sécurité' },
  { name: 'Shield', label: 'Protection / Sécurité', category: 'Mesure & Sécurité' },
  { name: 'ShieldCheck', label: 'Conformité certifiée', category: 'Mesure & Sécurité' },
  { name: 'AlertTriangle', label: 'Alerte / Signalisation', category: 'Mesure & Sécurité' },
  { name: 'Award', label: 'Qualité / Garantie', category: 'Mesure & Sécurité' },
  { name: 'Clock', label: 'Disponibilité / Temps', category: 'Mesure & Sécurité' },
  { name: 'RefreshCw', label: 'Recyclage / Rotation', category: 'Mesure & Sécurité' }
];

interface IconPickerProps {
  selectedIcon: string;
  onSelect: (iconName: string) => void;
  onClose?: () => void;
}

export function IconPicker({ selectedIcon, onSelect, onClose }: IconPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Tous');

  const categories = useMemo(() => {
    const set = new Set(INDUSTRIAL_ICON_PACK.map(i => i.category));
    return ['Tous', ...Array.from(set)];
  }, []);

  const filteredIcons = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return INDUSTRIAL_ICON_PACK.filter(item => {
      const matchCat = activeCategory === 'Tous' || item.category === activeCategory;
      const matchSearch = !term ||
        item.name.toLowerCase().includes(term) ||
        item.label.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term);
      return matchCat && matchSearch;
    });
  }, [searchTerm, activeCategory]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xl p-4 max-w-xl w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#FF6600] flex items-center justify-center font-bold">
            ⚡
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#003366]">Pack d'icônes Industrielles & MRO</h3>
            <p className="text-[11px] text-gray-500">Sélectionnez une icône pour votre catégorie ou secteur</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher une icône (clé, pompe, moteur, camion, solaire...)"
          className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366] bg-gray-50/50"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 custom-scrollbar text-xs">
        {categories.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? 'bg-[#003366] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Icons Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-64 overflow-y-auto p-1 custom-scrollbar">
        {filteredIcons.map(icon => {
          const IconComp = (Icons as any)[icon.name] || Icons.Package;
          const isSelected = selectedIcon === icon.name;

          return (
            <button
              key={icon.name}
              type="button"
              onClick={() => {
                onSelect(icon.name);
                if (onClose) onClose();
              }}
              className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center group cursor-pointer ${
                isSelected
                  ? 'bg-orange-50 border-[#FF6600] ring-2 ring-[#FF6600]/20 text-[#FF6600]'
                  : 'bg-gray-50/70 border-gray-200 hover:bg-white hover:border-[#003366] text-gray-700'
              }`}
              title={`${icon.label} (${icon.name})`}
            >
              <div className="relative">
                <IconComp className={`w-5 h-5 transition-transform group-hover:scale-110 ${isSelected ? 'text-[#FF6600]' : 'text-[#003366]'}`} />
                {isSelected && (
                  <span className="absolute -top-1 -right-2 bg-[#FF6600] text-white rounded-full p-0.5">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-tight truncate max-w-full text-gray-600 group-hover:text-gray-950">
                {icon.name}
              </span>
            </button>
          );
        })}
      </div>

      {filteredIcons.length === 0 && (
        <div className="py-8 text-center text-xs text-gray-400">
          Aucune icône trouvée pour "{searchTerm}".
        </div>
      )}

      {/* Footer / Selected preview */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-[11px]">Icône active :</span>
          {(() => {
            const ActiveIcon = (Icons as any)[selectedIcon] || Icons.Package;
            return (
              <span className="inline-flex items-center gap-1 font-bold text-[#003366] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                <ActiveIcon className="w-3.5 h-3.5 text-[#FF6600]" />
                {selectedIcon || 'Package'}
              </span>
            );
          })()}
        </div>
        <span className="text-[10px] text-gray-400 font-mono">{filteredIcons.length} icônes disponibles</span>
      </div>
    </div>
  );
}
