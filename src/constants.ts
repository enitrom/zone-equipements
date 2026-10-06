export const CATEGORIES = [
  { 
    name: "Abrasifs", 
    brands: "3M, Norton", 
    icon: "Disc",
    description: "Les abrasifs enlèvent de la matière d'une pièce à travailler par ponçage, tronçonnage ou meulage.",
    subcategories: [
      { name: "Abrasifs de ponçage", icon: "Layers" },
      { name: "Abrasifs de tronçonnage et meulage", icon: "Disc" },
      { name: "Brosses abrasives", icon: "Brush" },
      { name: "Sablage abrasif", icon: "Wind" },
      { name: "Ébavurage", icon: "Scissors" },
      { name: "Affûtage", icon: "Zap" },
      { name: "Polissage et lustrage", icon: "Sun" },
      { name: "Finition par vibration", icon: "Activity" },
      { name: "Accessoires pour abrasifs", icon: "PlusCircle" }
    ]
  },
  { 
    name: "Adhésifs", 
    brands: "Loctite, 3M, Gorilla", 
    icon: "StickyNote",
    description: "Les adhésifs, les produits d'étanchéité et les rubans sont utilisés pour coller, réparer et sceller une large gamme de matériaux.",
    subcategories: [
      { name: "Adhésifs et colles", icon: "Droplet" },
      { name: "Calfeutrage et mastics", icon: "Pipette" },
      { name: "Freins-filets et composés de fixation", icon: "Lock" },
      { name: "Revêtements de protection", icon: "Shield" },
      { name: "Réparation de béton et d'asphalte", icon: "Hammer" },
      { name: "Composés de rebouchage", icon: "Pencil" },
      { name: "Préparation de surface", icon: "Eraser" },
      { name: "Équipement de distribution", icon: "Syringe" },
      { name: "Rubans adhésifs", icon: "StickyNote" }
    ]
  },
  { 
    name: "Batteries pour appareils électroménagers", 
    brands: "Duracell, Panasonic, Varta", 
    icon: "Battery",
    description: "Batteries de rechange et piles spécifiques pour appareils électroménagers et dispositifs électriques portables.",
    subcategories: [
      { name: "Batteries Lithium-Ion", icon: "Battery" },
      { name: "Piles rechargeables", icon: "RefreshCw" },
      { name: "Piles bouton de précision", icon: "CircleDot" },
      { name: "Chargeurs de batterie", icon: "Zap" }
    ]
  },
  { 
    name: "Produits de nettoyage", 
    brands: "Kärcher, Nilfisk, Rubbermaid", 
    icon: "Sparkles",
    description: "Les produits de nettoyage maintiennent les installations commerciales et industrielles propres et bien entretenues.",
    subcategories: [
      { name: "Produits en papier et distributeurs", icon: "FileText" },
      { name: "Soins personnels et des mains", icon: "Hand" },
      { name: "Produits chimiques de nettoyage", icon: "FlaskConical" },
      { name: "Contrôle des odeurs", icon: "Wind" },
      { name: "Fournitures de nettoyage", icon: "Eraser" },
      { name: "Gestion des déchets et recyclage", icon: "Trash" },
      { name: "Machines de nettoyage de sol", icon: "Zap" },
      { name: "Pièces d'équipement de nettoyage", icon: "Settings" }
    ]
  },
  { 
    name: "Électricité", 
    brands: "Schneider Electric, Legrand, ABB", 
    icon: "Zap",
    description: "L'équipement électrique facilite et fournit l'énergie aux appareils, machines et systèmes industriels.",
    subcategories: [
      { name: "Fils, câbles et cordons", icon: "Cable" },
      { name: "Boîtiers et coffrets électriques", icon: "Box" },
      { name: "Conduits et raccords", icon: "Pipette" },
      { name: "Connecteurs et dispositifs de câblage", icon: "Plug" },
      { name: "Gestion des câbles", icon: "Rss" },
      { name: "Multiprises et rallonges", icon: "Zap" },
      { name: "Mises à la terre", icon: "ArrowDownCircle" },
      { name: "Fusibles et disjoncteurs", icon: "ShieldAlert" },
      { name: "Panneaux solaires", icon: "Sun" },
      { name: "Distribution d'énergie temporaire", icon: "BatteryCharging" },
      { name: "Automatisation et sécurité machine", icon: "Cpu" },
      { name: "Commandes de moteur", icon: "Activity" },
      { name: "Transformateurs et onduleurs", icon: "Zap" }
    ]
  },
  { 
    name: "Fixations", 
    brands: "Hilti, Würth, Fischer", 
    icon: "Settings",
    description: "Les fixations sont des pièces de quincaillerie qui assemblent mécaniquement plusieurs matériaux ou objets.",
    subcategories: [
      { name: "Boulons et vis de force", icon: "Settings" },
      { name: "Écrous", icon: "Hexagon" },
      { name: "Rondelles", icon: "Circle" },
      { name: "Tiges filetées", icon: "Hash" },
      { name: "Ancrages lourds", icon: "Anchor" },
      { name: "Inserts filetés", icon: "LogIn" },
      { name: "Rivets", icon: "CircleDot" },
      { name: "Clous et pointes", icon: "Pin" },
      { name: "Agrafes", icon: "Paperclip" },
      { name: "Entretoises", icon: "Columns" },
      { name: "Supports et équerres", icon: "Layout" },
      { name: "Adaptateurs de filetage", icon: "RefreshCw" },
      { name: "Goupilles", icon: "MapPin" },
      { name: "Anneaux de retenue", icon: "Circle" },
      { name: "Clavettes", icon: "Key" },
      { name: "Cales de réglage", icon: "Layers" },
      { name: "Fil à freiner", icon: "Link" }
    ]
  },
  { 
    name: "Entretien de meubles", 
    brands: "Pledge, Liberon, Rubid", 
    icon: "Armchair",
    description: "Produits spécialisés pour le traitement, le nettoyage et la protection des meubles et surfaces en bois, cuir ou métal.",
    subcategories: [
      { name: "Huiles de traitement du bois", icon: "Droplets" },
      { name: "Cires de protection", icon: "Sparkles" },
      { name: "Nettoyants et rénovateurs", icon: "Eraser" },
      { name: "Protections de surfaces vernies", icon: "Shield" }
    ]
  },
  { 
    name: "Outillage à main", 
    brands: "Facom, Stanley, Gedore", 
    icon: "Wrench",
    description: "Outils de précision et d'usage quotidien pour les plombiers, électriciens et techniciens de maintenance d'usine.",
    subcategories: [
      { name: "Clés plates et mixtes", icon: "Wrench" },
      { name: "Tournevis robustes", icon: "Pencil" },
      { name: "Pinces isolées et multiprises", icon: "Scissors" },
      { name: "Marteaux et maillets", icon: "Hammer" },
      { name: "Douilles et étuis de rangement", icon: "Box" },
      { name: "Instruments d'alésage manuel", icon: "Target" }
    ]
  },
  { 
    name: "Quincaillerie", 
    brands: "Yale, Master Lock, Abus", 
    icon: "Key",
    description: "Quincaillerie de sécurité pour les installations, vannes et systèmes de fermeture d'usine.",
    subcategories: [
      { name: "Quincaillerie de porte", icon: "DoorOpen" },
      { name: "Quincaillerie de fenêtre", icon: "Square" },
      { name: "Poignées et boutons", icon: "Hand" },
      { name: "Glissières de tiroir", icon: "ArrowRight" },
      { name: "Charnières lourdes", icon: "Columns" },
      { name: "Loquets et verrous", icon: "Lock" },
      { name: "Protections murales", icon: "Shield" },
      { name: "Fournitures d'étanchéité", icon: "Pipette" },
      { name: "Ressorts", icon: "Activity" },
      { name: "Bâches et accessoires", icon: "Layers" },
      { name: "Crochets et poulies", icon: "Anchor" },
      { name: "Contrôle des vibrations", icon: "Activity" },
      { name: "Aimants", icon: "Magnet" },
      { name: "Supports et équerres", icon: "Layout" },
      { name: "Fixations auto-agrippantes", icon: "Link" },
      { name: "Quincaillerie de sol", icon: "Maximize" },
      { name: "Bouchons et filets de protection", icon: "Circle" }
    ]
  },
  { 
    name: "CVC", 
    brands: "Carrier, Daikin, Clivet", 
    icon: "Wind",
    description: "Produits de climatisation, ventilation, chauffage professionnel et traitement thermique de l'air.",
    subcategories: [
      { name: "Filtres à air d'atelier", icon: "Filter" },
      { name: "Traitement de l'air comprimé", icon: "Wind" },
      { name: "Ventilateurs de refroidissement", icon: "Fan" },
      { name: "Équipement de ventilation", icon: "Wind" },
      { name: "Climatiseurs de cabine de pont", icon: "Snowflake" },
      { name: "Équipement thermique central", icon: "Settings" },
      { name: "Chauffages d'ateliers", icon: "Flame" },
      { name: "Échangeurs de chaleur", icon: "RefreshCw" },
      { name: "Commandes CVC et thermostats", icon: "Thermometer" },
      { name: "Réfrigérants et lubrifiants", icon: "Droplet" },
      { name: "Diagnostics CVC", icon: "Search" },
      { name: "Nettoyage de conduits", icon: "Eraser" },
      { name: "Pales de ventilateur", icon: "Fan" },
      { name: "Pièces de rechange CVC", icon: "Settings" }
    ]
  },
  { 
    name: "Hydraulique", 
    brands: "Parker, Bosch Rexroth, Eaton", 
    icon: "Droplets",
    description: "Les systèmes hydrauliques convertissent l'huile sous pression en énergie mécanique pour les machines industrielles.",
    subcategories: [
      { name: "Accumulateurs hydrauliques", icon: "Battery" },
      { name: "Cylindres et joints hydrauliques", icon: "Circle" },
      { name: "Pièces de rechange hydrauliques", icon: "Settings" },
      { name: "Filtration hydraulique", icon: "Filter" },
      { name: "Raccords hydrauliques", icon: "Link" },
      { name: "Machines à sertir les flexibles", icon: "Zap" },
      { name: "Moteurs hydrauliques", icon: "Activity" },
      { name: "Refroidisseurs d'huile", icon: "Snowflake" },
      { name: "Outils hydrauliques", icon: "Wrench" },
      { name: "Unités de puissance hydraulique", icon: "Zap" },
      { name: "Pompes hydrauliques HP", icon: "Waves" },
      { name: "Vérins hydrauliques d'exhaure", icon: "ArrowUp" },
      { name: "Réservoirs hydrauliques", icon: "Container" },
      { name: "Vannes et électrovannes", icon: "Settings" }
    ]
  },
  { 
    name: "Fournitures de laboratoire", 
    brands: "Thermo Fisher, VWR, Merck", 
    icon: "Beaker",
    description: "Verrerie de précision, consommables, instruments d'analyse clinique et éducative.",
    subcategories: [
      { name: "Récipients en plastique et verre", icon: "GlassWater" },
      { name: "Produits chimiques de laboratoire", icon: "FlaskConical" },
      { name: "Réfrigération de laboratoire", icon: "Snowflake" },
      { name: "Chauffage de laboratoire", icon: "Flame" },
      { name: "Équipement de test de l'eau", icon: "Droplets" },
      { name: "Équipement de laboratoire", icon: "Microscope" },
      { name: "Pipetage et transfert de liquide", icon: "Pipette" },
      { name: "Purification de l'eau", icon: "Waves" },
      { name: "Ventilation de laboratoire", icon: "Wind" },
      { name: "Ustensiles et plateaux", icon: "Utensils" },
      { name: "Nettoyants de laboratoire", icon: "Eraser" },
      { name: "Mobilier de laboratoire", icon: "Armchair" },
      { name: "Stockage et transport", icon: "Truck" },
      { name: "Filtres et tamis d'analyses", icon: "Filter" },
      { name: "Instrumentation de laboratoire", icon: "Gauge" },
      { name: "Fournitures de salle blanche", icon: "Shield" },
      { name: "Microbiologie", icon: "Dna" },
      { name: "Diagnostics de laboratoire", icon: "Search" },
      { name: "Tests agricoles et du sol", icon: "Trees" },
      { name: "Chromatographie", icon: "Activity" }
    ]
  },
  { 
    name: "Éclairage", 
    brands: "Philips, Osram, Sylvania", 
    icon: "Lightbulb",
    description: "Ampoules, luminaires haute efficacité et projecteurs LED résistants aux chocs pour ateliers et zones ATEX.",
    subcategories: [
      { name: "Ampoules et lampes industrielles", icon: "Lightbulb" },
      { name: "Ballasts et drivers", icon: "Zap" },
      { name: "Luminaires de grande hauteur (Highbay)", icon: "Lamp" },
      { name: "Éclairage de secours et de sortie", icon: "AlertTriangle" },
      { name: "Éclairage de chantier portatif", icon: "Construction" },
      { name: "Projecteurs ATEX étanches", icon: "Flashlight" },
      { name: "Commandes d'éclairage", icon: "Settings" },
      { name: "Broyeurs de lampes usagées", icon: "Trash" },
      { name: "Pièces de rechange d'éclairage", icon: "Settings" }
    ]
  },
  { 
    name: "Lubrification", 
    brands: "Mobil, Shell, Castrol", 
    icon: "Droplet",
    description: "Huiles hydrauliques synthétiques, graisses polyurées pour paliers de broche et engrenages d'ateliers.",
    subcategories: [
      { name: "Graisse de haute performance", icon: "Droplet" },
      { name: "Huiles pour glissières et réducteurs", icon: "Droplets" },
      { name: "Lubrifiants pénétrants", icon: "Wind" },
      { name: "Composés anti-grippants", icon: "Lock" },
      { name: "Pompes de graissage manuel", icon: "Zap" },
      { name: "Raccords de graissage laiton", icon: "Link" },
      { name: "Burettes et réservoirs", icon: "Container" },
      { name: "Lubrificateurs automatiques monopoint", icon: "Activity" },
      { name: "Jauges de niveau d'huile", icon: "Gauge" }
    ]
  },
  { 
    name: "Usinage", 
    brands: "Sandvik, Kennametal, Mitutoyo", 
    icon: "Cpu",
    description: "Plaquettes carbure indexables, forets de force et fluides de coupe pour l'usinage des métaux.",
    subcategories: [
      { name: "Perçage et alésage de précision", icon: "Target" },
      { name: "Fraisage et outils de coupe", icon: "Cpu" },
      { name: "Taraudage et filetage", icon: "Hash" },
      { name: "Tournage et rainurage", icon: "RefreshCw" },
      { name: "Outils de coupe indexables", icon: "Scissors" },
      { name: "Porte-outils et pinces de serrage", icon: "Layout" },
      { name: "Fluides de travail des métaux", icon: "Droplet" },
      { name: "Outils de mesure de précision", icon: "Ruler" }
    ]
  },
  { 
    name: "Manutention", 
    brands: "Jungheinrich, Toyota, Pramac", 
    icon: "Truck",
    description: "Équipements de manutention de charge pour déplacer, charger et stocker de façon sécurisée.",
    subcategories: [
      { name: "Transpalettes haute levée et manuels", icon: "Truck" },
      { name: "Sangles d'arrimage et élingues", icon: "Link" },
      { name: "Diables de transport renforcés", icon: "Layers" },
      { name: "Échelles et plateformes sécurisées", icon: "Maximize" },
      { name: "Roulettes et roues polyuréthane", icon: "Circle" },
      { name: "Pesage industriel et balances de quai", icon: "Scale" }
    ]
  },
  { 
    name: "Moteurs", 
    brands: "Siemens, ABB, Leroy Somer", 
    icon: "Activity",
    description: "Moteurs industriels triphasés AC et moteurs DC robustes pour convoyeurs, pompes et ventilateurs d'usine.",
    subcategories: [
      { name: "Moteurs électriques AC", icon: "Zap" },
      { name: "Moteurs industriels DC", icon: "Battery" },
      { name: "Condensateurs de moteur permanent", icon: "Box" },
      { name: "Variateurs de fréquence triphasés", icon: "Activity" },
      { name: "Maintenance de moteurs", icon: "Wrench" },
      { name: "Pièces de rechange moteurs", icon: "Settings" }
    ]
  },
  { 
    name: "Fournitures de bureau", 
    brands: "Staples, Bic, Rexel", 
    icon: "Printer",
    description: "Papier, classeurs d'atelier, fournitures de traçabilité industrielle pour les techniciens.",
    subcategories: [
      { name: "Papier technique et d'impression", icon: "FileText" },
      { name: "Classeurs et rangements robustes", icon: "Archive" },
      { name: "Instruments d'écriture d'atelier", icon: "Pencil" },
      { name: "Bureautique et étiquetage de sécurité", icon: "Barcode" }
    ]
  },
  { 
    name: "Équipement d'extérieur", 
    brands: "Stihl, Husqvarna, Honda, Cummins, Kather", 
    icon: "Trees",
    description: "Groupes électrogènes, générateurs de chantier, nettoyeurs haute pression et équipements d'aménagement extérieur industriel.",
    subcategories: [
      { name: "Groupes électrogènes et générateurs", icon: "Zap" },
      { name: "Nettoyeurs haute pression", icon: "Waves" },
      { name: "Tondeuses et faucheuses de force", icon: "Zap" },
      { name: "Débroussailleuses et taille-haies", icon: "Trees" },
      { name: "Tronçonneuses d'élagage thermiques", icon: "Flame" },
      { name: "Outils à main d'extérieur", icon: "Hammer" }
    ]
  },
  { 
    name: "Fournitures de peinture", 
    brands: "Sherwin-Williams, PPG, Hempel", 
    icon: "Paintbrush",
    description: "Peintures industrielles résistantes à l'abrasion et sprays de marquage routier de précision.",
    subcategories: [
      { name: "Peintures en aérosol de sécurité", icon: "Wind" },
      { name: "Revêtements époxy de sol d’atelier", icon: "Paintbrush" },
      { name: "Marquage de sécurité extérieur", icon: "MapPin" },
      { name: "Équipements et pistolets à peinture", icon: "Settings" }
    ]
  },
  { 
    name: "Plomberie", 
    brands: "Grohe, Geberit, Kohler", 
    icon: "Waves",
    description: "Robinets industriels temporisés, canalisations, évacuations de force et vannes d'arrêt de fluide.",
    subcategories: [
      { name: "Vannes et robinets industriels", icon: "Droplet" },
      { name: "Tubes d'évacuation de force", icon: "Circle" },
      { name: "Adoucisseurs et filtration de l'eau", icon: "Waves" },
      { name: "Régulation thermique de plomberie", icon: "Thermometer" }
    ]
  },
  { 
    name: "Pneumatique", 
    brands: "Festo, SMC, Norgren", 
    icon: "Wind",
    description: "Actionneurs pneumatiques, distributeurs, compresseurs à vis et filtres-régulateurs-lubrificateurs (FRL).",
    subcategories: [
      { name: "Actionneurs et vérins pneumatiques", icon: "Activity" },
      { name: "Compresseurs à vis industriels", icon: "Wind" },
      { name: "Filtres régulateurs lubrificateurs FRL", icon: "Filter" },
      { name: "Raccords de tuyau rapides", icon: "Link" },
      { name: "Vannes et terminaux pneumatiques", icon: "Settings" }
    ]
  },
  { 
    name: "Outillage électrique", 
    brands: "Makita, Bosch, DeWalt", 
    icon: "Zap",
    description: "Perceuses à percussion, meuleuses d'angle de forte puissance, perforateurs SDS max et cloueurs.",
    subcategories: [
      { name: "Meuleuses et polisseuses de force", icon: "Disc" },
      { name: "Perforateurs et burineurs lourds", icon: "Hammer" },
      { name: "Visseuses à chocs professionnelles", icon: "Zap" },
      { name: "Scies sauteuses et circulaires de chantier", icon: "Scissors" },
      { name: "Accessoires pour outillage électroportatif", icon: "PlusCircle" }
    ]
  },
  { 
    name: "Transmission de puissance", 
    brands: "SKF, Timken, Gates", 
    icon: "Settings",
    description: "Roulements rigides et rotules sur rouleaux SKF, courroies trapézoïdales Gates et chaînes de force.",
    subcategories: [
      { name: "Roulements d'origine certifiée", icon: "Circle" },
      { name: "Courroies et chaînes de transmission", icon: "RefreshCw" },
      { name: "Paliers auto-aligneurs d'atelier", icon: "Settings" },
      { name: "Accouplements rigides et élastiques", icon: "Link" }
    ]
  },
  { 
    name: "Pompes", 
    brands: "Grundfos, Wilo, KSB", 
    icon: "Droplets",
    description: "Pompes submersibles d'exhaure minière, circulateurs haute efficacité et pompes triphasées industrielles.",
    subcategories: [
      { name: "Pompes submersibles d'exhaure de force", icon: "ArrowDown" },
      { name: "Pompes centrifuges monocellulaires", icon: "RefreshCw" },
      { name: "Pompes doseuses de haute précision", icon: "Pipette" },
      { name: "Systèmes de surpression d'incendie", icon: "Flame" }
    ]
  },
  { 
    name: "Matières premières", 
    brands: "ArcelorMittal, Alcoa", 
    icon: "Layers",
    description: "Profilés laiton, plaques d'acier perforé, caoutchouc armé de rechange technique.",
    subcategories: [
      { name: "Plates-bandes et profilés d'acier", icon: "Box" },
      { name: "Plaques de caoutchouc composite", icon: "Layers" },
      { name: "Profilés d'aluminium industriels", icon: "Maximize" }
    ]
  },
  { 
    name: "Ouvrages de référence", 
    brands: "ASTM, ISO", 
    icon: "Book",
    description: "Livres de normes techniques internationales, guides ASME de chaudière et de maintenance mécanique.",
    subcategories: [
      { name: "Normes de soudage ASME/API", icon: "Book" },
      { name: "Directives de sécurité d'usine ATEX", icon: "Shield" },
      { name: "Formulaires de calcul de mécanique", icon: "FileText" }
    ]
  },
  { 
    name: "Sécurité", 
    brands: "Honeywell, Delta Plus, UVEX", 
    icon: "Shield",
    description: "Harnais de chute de grande hauteur, vêtements protecteurs ignifugés et protection auditive antibruit d'ateliers.",
    subcategories: [
      { name: "Harnais de sécurité d'exhaure", icon: "ArrowDown" },
      { name: "Vêtements protecteurs retardants flammes", icon: "Shirt" },
      { name: "Gants anticoupure d'origine certifiée", icon: "Hand" },
      { name: "Chaussures de sécurité coquées S3", icon: "Footprints" }
    ]
  },
  { 
    name: "Instruments de mesure", 
    brands: "Fluke, Mitutoyo, Testo", 
    icon: "Gauge",
    description: "Multimètres numériques de force TRMS Fluke, caméras infrarouges de diagnostic thermique pro.",
    subcategories: [
      { name: "Multimètres de force d'ateliers Fluke", icon: "Zap" },
      { name: "Pieds à coulisse numériques Mitutoyo", icon: "Ruler" },
      { name: "Caméras infrarouges de thermographie", icon: "Eye" },
      { name: "Mesureurs d'épaisseur à ultrasons", icon: "Maximize" }
    ]
  },
  { 
    name: "Entretien des véhicules", 
    brands: "Bosch automotive, Castrol, Valeo", 
    icon: "Car",
    description: "Huiles de moteur forte charge, filtres d'origine constructeur, outillage de relevage de flottes d'ateliers.",
    subcategories: [
      { name: "Filtres d'origine constructeur", icon: "Filter" },
      { name: "Lubrifiants et additifs moteurs", icon: "Droplet" },
      { name: "Crics lourds et chandelles de garage", icon: "ArrowUp" },
      { name: "Alternative de puissance de rechange", icon: "Zap" }
    ]
  },
  { 
    name: "Soudage", 
    brands: "Lincoln Electric, ESAB, Fronius", 
    icon: "Flame",
    description: "Postes de soudage inverter triphasés d'origine certifiée, électrodes rutiles et métal d'apport.",
    subcategories: [
      { name: "Postes inverter MMA / TIG de force", icon: "Zap" },
      { name: "Électrodes basiques et rutiles", icon: "Layers" },
      { name: "Torches de rechange de forte puissance", icon: "Flame" },
      { name: "Masques de soudage photosensibles LCD", icon: "Eye" }
    ]
  }
];

export const AFRICA_COUNTRIES = [
  { name: "Sénégal", x: 15, y: 45 },
  { name: "Côte d'Ivoire", x: 25, y: 60 },
  { name: "Nigeria", x: 45, y: 55 },
  { name: "Cameroun", x: 50, y: 65 },
  { name: "Gabon", x: 50, y: 75 },
  { name: "Congo", x: 55, y: 80 },
  { name: "RDC", x: 65, y: 85 },
  { name: "Angola", x: 60, y: 95 },
  { name: "Afrique du Sud", x: 75, y: 130 },
  { name: "Kenya", x: 95, y: 75 },
  { name: "Éthiopie", x: 95, y: 60 },
  { name: "Égypte", x: 85, y: 25 },
  { name: "Maroc", x: 25, y: 15 },
  { name: "Algérie", x: 45, y: 15 },
  { name: "Tunisie", x: 55, y: 10 },
  { name: "Libye", x: 70, y: 20 },
  { name: "Mali", x: 30, y: 40 },
  { name: "Mauritanie", x: 20, y: 35 },
  { name: "Niger", x: 50, y: 40 },
  { name: "Tchad", x: 65, y: 45 },
  { name: "Soudan", x: 80, y: 45 },
  { name: "Tanzanie", x: 90, y: 90 },
  { name: "Madagascar", x: 115, y: 110 }
];

export interface ProductSpec {
  [key: string]: string;
}

export interface Product {
  id: number;
  name: string;
  brand: string;
  price: number; // in FCFA
  category: string;
  subcategory: string;
  img: string;
  rating: number;
  reviews: number;
  sector: string;
  model: string;
  ref: string;
  specs: ProductSpec;
  description: string;
  extendedDescription: string;
  origin: string;
  packageQty: number; // Unit quantity per box
  moq: number; // Minimum order quantity
  weight: string;
  warranty: string;
  leadTime: string; // standard shipping time to Africa
  inStock?: boolean;
  images?: string[]; // Multiple photos réelles du produit
  supplierId?: string; // Fournisseur assigné
}

export const DEFAULT_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80';
export const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=1920&auto=format&fit=crop&q=80';
export const DEFAULT_SECTOR_IMAGE = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80';
export const FALLBACK_SVG_PRODUCT = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="%230f172a" stroke="%23ea580c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>';

const FALLBACK_IMAGE_MAP: Record<string, string> = {
  power_drill: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80',
  perceuse: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80',
  drill: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80',
  makita: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80',
  hydraulic_pump: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
  pompe: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
  pump: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
  welding_machine: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&auto=format&fit=crop&q=80',
  soudage: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&auto=format&fit=crop&q=80',
  welder: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&auto=format&fit=crop&q=80',
  grinding_wheel: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800&auto=format&fit=crop&q=80',
  abrasif: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800&auto=format&fit=crop&q=80',
  abrasifs: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800&auto=format&fit=crop&q=80',
  multimeter: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80',
  multimetre: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80',
  fluke: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80',
  electric_motor: 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=800&auto=format&fit=crop&q=80',
  moteur: 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=800&auto=format&fit=crop&q=80',
  motor: 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=800&auto=format&fit=crop&q=80',
  bearings: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
  roulement: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
  skf: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
  pneumatic_cylinder: 'https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?w=800&auto=format&fit=crop&q=80',
  verin: 'https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?w=800&auto=format&fit=crop&q=80',
  pneumatique: 'https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?w=800&auto=format&fit=crop&q=80',
  harness: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=800&auto=format&fit=crop&q=80',
  harnais: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=800&auto=format&fit=crop&q=80',
  securite: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=800&auto=format&fit=crop&q=80',
  wrench_set: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=800&auto=format&fit=crop&q=80',
  cles: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=800&auto=format&fit=crop&q=80',
  outillage: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=800&auto=format&fit=crop&q=80',
  facom: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=800&auto=format&fit=crop&q=80'
};

export function resolveImageUrl(img?: string, fallbackUrl = DEFAULT_PRODUCT_IMAGE): string {
  if (!img || typeof img !== 'string') return fallbackUrl;
  const trimmed = img.trim();
  if (!trimmed) return fallbackUrl;

  // Support direct base64 data URLs, blob URLs, http/https URLs, and relative asset paths
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/')
  ) {
    if (trimmed.includes('picsum.photos')) {
      return fallbackUrl;
    }
    return trimmed;
  }
  
  const lower = trimmed.toLowerCase();
  if (FALLBACK_IMAGE_MAP[lower]) {
    return FALLBACK_IMAGE_MAP[lower];
  }

  // Check substring matches
  for (const [k, v] of Object.entries(FALLBACK_IMAGE_MAP)) {
    if (lower.includes(k)) return v;
  }

  return fallbackUrl;
}

export function getProductImageUrl(img?: string): string {
  return resolveImageUrl(img, DEFAULT_PRODUCT_IMAGE);
}

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>, fallbackUrl = DEFAULT_PRODUCT_IMAGE) {
  const target = e.currentTarget;
  const currentSrc = target.src || '';

  // 1. If direct remote image failed and hasn't been proxied yet, retry via proxy-image
  if (
    currentSrc.startsWith('http') &&
    !currentSrc.includes('/api/proxy-image') &&
    !currentSrc.includes('photo-1581092160607') &&
    !currentSrc.includes('localhost') &&
    !currentSrc.includes('127.0.0.1')
  ) {
    target.src = `/api/proxy-image?url=${encodeURIComponent(currentSrc)}`;
    return;
  }

  // 2. If proxy or first attempt was remote image, try fallbackUrl
  if (currentSrc !== fallbackUrl && !currentSrc.includes('photo-1581092160607')) {
    target.src = fallbackUrl;
  } else {
    // 3. If fallbackUrl also fails (e.g. offline mode or network restriction), use local SVG vector
    target.src = FALLBACK_SVG_PRODUCT;
  }
}

export const PRODUCTS: Product[] = [];
