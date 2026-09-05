import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChefHat, Monitor, Tablet, BarChart3, Shield, Globe, Zap,
  Check, X, ArrowRight, Menu as MenuIcon, ChevronDown, Sparkles, Mail, X as XIcon,
  Star, Award, Headphones, Cloud, Scale, Brain,
  Phone, MessageCircle, ArrowUp,
  Facebook, Instagram, Linkedin, Youtube, ExternalLink
} from 'lucide-react';
import { useTheme, THEMES, ThemeName } from '@/contexts/ThemeContext';
import { useLocale, type SupportedCurrency } from '@/contexts/LocaleContext';
import { CURRENCIES } from '@/lib/countries';
import Logo from '@/components/Logo';

const SLIDES = [
  {
    image: 'https://images.pexels.com/photos/34723813/pexels-photo-34723813.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080',
    title: ['La technologie restaurant', 'réinventée pour', 'les chefs d\'aujourd\'hui'],
    description: 'Nutro unifie menu interactif sur tablette, caisse cloud, kitchen display et analytics multi-branches en une seule plateforme élégante.',
    cta: 'Démarrer l\'essai gratuit',
    ctaLink: '/auth/signup',
    ctaColor: '#0369A1',
  },
  {
    image: 'https://images.pexels.com/photos/36073021/pexels-photo-36073021.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080',
    title: ['Une cuisine connectée', 'et performante', 'au service du goût'],
    description: 'Kitchen Display System avec timers colorés, alertes allergènes et routage intelligent des tickets pour un service fluide aux heures de pointe.',
    cta: 'En savoir plus',
    ctaLink: '#features',
    ctaColor: '#0EA5E9',
  },
  {
    image: 'https://images.pexels.com/photos/12935087/pexels-photo-12935087.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080',
    title: ['Vos menus digitaux', 'à portée de', 'tablette'],
    description: 'Menus interactifs élégants avec filtrage allergènes en temps réel, suivi des macros et personnalisation diet pour une expérience client premium.',
    cta: 'Démarrer l\'essai gratuit',
    ctaLink: '/auth/signup',
    ctaColor: '#0369A1',
  },
  {
    image: 'https://images.pexels.com/photos/12935080/pexels-photo-12935080.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080',
    title: ['Encaissez plus vite,', 'servez mieux,', 'sans limite'],
    description: 'Terminal POS cloud complet : gestion des tables, paiements fractionnés, multi-moyens de paiement et reporting de shift en temps réel.',
    cta: 'En savoir plus',
    ctaLink: '#features',
    ctaColor: '#10B981',
  },
  {
    image: 'https://images.pexels.com/photos/20150680/pexels-photo-20150680.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080',
    title: ['L\'excellence culinaire', 'mérite une technologie', 'à sa hauteur'],
    description: 'Analytiques multi-branches consolidées, dashboards de revenus en temps réel et benchmarking de performance pour décider avec données.',
    cta: 'Démarrer l\'essai gratuit',
    ctaLink: '/auth/signup',
    ctaColor: '#0369A1',
  },
  {
    image: 'https://images.pexels.com/photos/1327393/pexels-photo-1327393.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080',
    title: ['La gastronomie', 'rencontre la', 'précision digitale'],
    description: 'Chaque assiette mérite d\'être sublimée par une technologie qui comprend l\'art culinaire. Nutro accompagne votre créativité du four à la table.',
    cta: 'Démarrer l\'essai gratuit',
    ctaLink: '/auth/signup',
    ctaColor: '#10B981',
  },
];

// Real partner restaurants using Nutro, shown in the landing page's trust banner.
// Add new partners here as they come on board — the marquee below duplicates this
// list automatically for a seamless scroll, so no other change is needed. Kept as
// square-ish source images normalized to a fixed height box (object-contain) so
// wildly different logo aspect ratios (wordmarks vs. circular badges vs. Arabic
// script) all render at a visually consistent size in the strip.
const PARTNER_LOGOS = [
  { name: 'Tent Jumeirah Restaurant', file: 'tent-jumeirah.png' },
  { name: 'Al Masa', file: 'al-masa.jpg' },
  { name: 'GoBurrito', file: 'goburrito.jpg' },
  { name: 'Beach Burrito Company', file: 'beach-burrito.png' },
  { name: "Sharky's Fish Shack & Co", file: 'sharkys-fish.jpg' },
  { name: 'Fergburger', file: 'fergburger.png' },
  { name: "Harry's Cafe de Wheels", file: 'harrys-cafe.png' },
  { name: 'Casalaura', file: 'casalaura.png' },
  { name: "L'Antica Pizzeria Da Michele", file: 'da-michele-antica.png' },
  { name: 'Da Michele Ristorante Pizzeria', file: 'da-michele-ristorante.png' },
  { name: 'Bouillon Chartier', file: 'bouillon-chartier.png' },
  { name: 'Ichiran', file: 'ichiran.jpg' },
  { name: 'Mocotó Bar e Restaurante', file: 'mocoto.jpg' },
  { name: "Mama Dangote's Canteen", file: 'mama-dangotes.jpg' },
  { name: 'Din Tai Fung', file: 'din-tai-fung.webp' },
  { name: 'La Puerta Falsa', file: 'la-puerta-falsa.png' },
  { name: 'Carnivore Nairobi', file: 'carnivore-nairobi.jpg' },
  { name: 'Café La Paris Pâtisserie', file: 'cafe-la-paris.jpg' },
  { name: 'Café de Paris', file: 'cafe-de-paris.jpg' },
  { name: 'Golden Tulip Al Barsha Hotel', file: 'golden-tulip-albarsha.jpeg' },
  { name: 'Millennium Al Barsha', file: 'millennium-albarsha.webp' },
  { name: 'Malam Payroll Plus', file: 'malam-payroll-plus.png' },
  { name: 'Tambo Real Hotel & Suites', file: 'tambo-real.jpg' },
  { name: 'Carlton Hotel Singapore', file: 'carlton-singapore.webp' },
  { name: 'Maritim Antonine Hotel & Spa Malta', file: 'maritim-antonine-malta.jpg' },
  { name: 'Radisson Hotels & Resorts', file: 'radisson-hotels-resorts.png' },
];

const FEATURES = [
  { icon: Tablet, title: 'Menu interactif sur tablette', desc: 'Menus client élégants avec filtrage allergènes en temps réel, suivi des macros et personnalisations diet qui élèvent l\'expérience dining.' },
  { icon: Monitor, title: 'Terminal POS cloud', desc: 'Point de vente complet avec gestion des tables, paiements fractionnés, multi-moyens de paiement et reporting de shift en temps réel.' },
  { icon: ChefHat, title: 'Kitchen Display System', desc: 'KDS temps réel avec timers colorés, alertes allergènes et routage priorité pour des cuisines fluides aux heures de pointe.' },
  { icon: BarChart3, title: 'Analytiques multi-branches', desc: 'Rapports financiers consolidés sur tous les sites avec dashboards revenus temps réel et benchmarking de performance.' },
  { icon: Shield, title: 'Contrôle d\'accès RBAC', desc: 'Contrôle d\'accès granulaire par rôle — du Super Admin au personnel cuisine avec permissions personnalisées par site.' },
  { icon: Globe, title: 'Multi-langue & multi-devise', desc: 'Servez vos clients en EN, FR, AR avec changement de devise en direct USD, EUR, AED, XAF, NGN, GBP et plus.' },
];

const WHY_US = [
  { icon: Cloud, title: 'Flexibilité cloud', desc: 'Gérez vos opérations partout, sur tout appareil. Vos données se synchronisent en temps réel sur tous les terminaux.' },
  { icon: Scale, title: 'Scalabilité sans effort', desc: 'Passez d\'un site à une chaîne multi-branches sans changer d\'infrastructure. La plateforme grandit avec vous.' },
  { icon: Brain, title: 'Insights intelligents', desc: 'Boostez la satisfaction avec analytics temps réel, inventaire prédictif et support décisionnel data-driven.' },
  { icon: Headphones, title: 'Support dédié', desc: 'Équipe support prioritaire disponible tous fuseaux horaires. Onboarding, formation et assistance continue inclus.' },
];

const TESTIMONIALS = [
  { quote: 'Nutro a transformé nos opérations multi-branches. Nous avons désormais une visibilité temps réel sur tous nos sites et le menu tablette a élevé l\'expérience client.', author: 'Omar Al Mulla', role: 'Directeur des opérations', company: 'Babu Town Restaurant Group' },
  { quote: 'Le terminal POS est incroyablement rapide et intuitif. Notre équipe l\'a maîtrisé en moins d\'une heure. Le KDS avec alertes allergènes nous rassure aux heures de pointe.', author: 'Sarah M', role: 'Directrice générale', company: 'Fine Dining Group' },
  { quote: 'Nous sommes passés de trois outils séparés à Nutro et réduit nos coûts logiciels de 60%. Le reporting consolidé paie l\'abonnement à lui seul.', author: 'Faizal Kaivelikkal', role: 'Directeur', company: 'Madinath Group' },
  { quote: 'En tant que chaîne en croissance, les analytics multi-branches et le contrôle d\'accès par rôle sont exactement ce dont nous avions besoin. La plateforme scale avec nous.', author: 'Ahmed Z', role: 'Propriétaire', company: 'Galore Restaurants' },
];

const STATS = [
  { value: '158+', label: 'Groupes de restaurants' },
  { value: '312+', label: 'Sites desservis' },
  { value: '2.4M+', label: 'Commandes traitées' },
  { value: '99.9%', label: 'Disponibilité plateforme' },
];

const PLANS = [
  { name: 'Starter', price: 29, color: '#64748B', description: 'Parfait pour les restaurants single-site qui se lancent dans le digital.',
    features: [
      { text: '1 Site', included: true }, { text: 'Jusqu\'à 10 tables', included: true },
      { text: 'Jusqu\'à 3 comptes staff', included: true }, { text: 'Menu digital interactif', included: true },
      { text: 'KDS & reçus thermiques', included: true }, { text: 'Allergènes & macros de base', included: true },
      { text: 'Terminal POS cloud', included: false }, { text: 'Multi-devise', included: false },
      { text: 'Comptabilité multi-branches', included: false }, { text: 'Rôles personnalisés', included: false },
    ] },
  { name: 'Premium', price: 69, color: '#0369A1', popular: true, description: 'Pour les restaurants en croissance qui veulent la suite complète multi-branches.',
    features: [
      { text: 'Jusqu\'à 3 sites', included: true }, { text: 'Jusqu\'à 30 tables', included: true },
      { text: 'Jusqu\'à 10 comptes staff', included: true }, { text: 'Menu digital interactif', included: true },
      { text: 'Terminal POS complet', included: true }, { text: 'KDS & reçus thermiques', included: true },
      { text: 'Macros & allergènes avancés', included: true }, { text: 'Multi-devise', included: true },
      { text: 'Comptabilité multi-branches', included: true }, { text: 'Rôles standards', included: true },
    ] },
  { name: 'Enterprise', price: 189, color: '#0369A1', description: 'Échelle illimitée pour chaînes & groupes hôteliers avec besoins avancés.',
    features: [
      { text: 'Sites illimités', included: true }, { text: 'Tables illimitées', included: true },
      { text: 'Comptes staff illimités', included: true }, { text: 'Menu digital interactif', included: true },
      { text: 'Terminaux POS illimités', included: true }, { text: 'KDS & reçus thermiques', included: true },
      { text: 'Assistant AI Gemini complet', included: true }, { text: 'Multi-devise', included: true },
      { text: 'Comptabilité multi-branches centralisée', included: true }, { text: 'Créateur de rôles personnalisé', included: true },
      { text: 'Support prioritaire (support@liafrik.com)', included: true },
    ] },
];

function LegalModal({ type, onClose, theme }: { type: 'privacy' | 'terms' | 'gdpr' | 'cookies' | 'refund' | 'mentions'; onClose: () => void; theme: ReturnType<typeof useTheme>['theme'] }) {
  const titles = {
    privacy: 'Politique de confidentialité',
    terms: 'Conditions générales d\'utilisation',
    gdpr: 'Conformité GDPR / INCO',
    cookies: 'Politique de cookies',
    refund: 'Politique de remboursement',
    mentions: 'Mentions légales',
  };
  const contents: Record<string, string[]> = {
    privacy: [
      'Nutro par LiAfrik Dubai & Afrique (« nous ») respecte votre vie privée. Nous collectons uniquement les données nécessaires au fonctionnement de la plateforme : profil restaurant, comptes staff, données menu et historique commandes.',
      'Nous ne vendons ni ne partageons vos données avec des tiers. Toutes les données sont chiffrées en transit et au repos selon les standards de l\'industrie.',
      'Vous pouvez demander l\'export ou la suppression de vos données à tout moment en contactant cs@liafrik.com.',
      'Les données de paiement sont traitées par nos prestataires de paiement (Flutterwave, Stripe, Paystack, PayUnit selon votre région) et ne sont jamais stockées sur nos serveurs.',
    ],
    terms: [
      'En utilisant Nutro, vous acceptez d\'utiliser la plateforme pour des opérations de restaurant licites uniquement.',
      'Les abonnements sont facturés mensuellement ou annuellement selon le plan choisi. Vous pouvez annuler à tout moment ; l\'accès continue jusqu\'à la fin de la période de facturation en cours.',
      'Les essais gratuits durent 14 jours. Aucune carte de crédit n\'est requise pour démarrer un essai.',
      'LiAfrik se réserve le droit de suspendre les comptes en cas d\'abus, fraude ou non-paiement.',
      'Pour les conditions complètes, contactez support@liafrik.com.',
    ],
    gdpr: [
      'Nutro est conforme au RGPD. Nous traitons les données personnelles sur la base juridique de l\'exécution du contrat et de l\'intérêt légitime (sécurité, prévention des fraudes).',
      'Les personnes concernées ont le droit d\'accès, de rectification, d\'effacement, de restriction, de portabilité et d\'opposition au traitement de leurs données personnelles.',
      'Nous ne transférons pas de données en dehors de l\'UE/EEE sans garanties appropriées (Clauses Contractuelles Types).',
      'Pour les demandes DPO : cs@liafrik.com. Pour les demandes de personnes concernées : support@liafrik.com.',
    ],
    cookies: [
      'Nutro utilise des cookies strictement nécessaires au fonctionnement du site (session, authentification, préférences de langue et de devise).',
      'Des cookies de mesure d\'audience peuvent être utilisés pour améliorer la plateforme ; ils sont anonymisés dès que possible.',
      'Vous pouvez configurer votre navigateur pour refuser les cookies non essentiels, ce qui peut limiter certaines fonctionnalités du site.',
      'Aucun cookie publicitaire tiers n\'est déposé sans votre consentement explicite.',
    ],
    refund: [
      'Les essais gratuits de 14 jours ne donnent lieu à aucun prélèvement et peuvent être annulés à tout moment sans frais.',
      'Les abonnements payants peuvent être remboursés intégralement dans les 14 jours suivant le premier paiement, sur simple demande à support@liafrik.com, conformément au droit de rétractation applicable.',
      'Passé ce délai, les paiements déjà effectués pour la période en cours ne sont pas remboursables, mais l\'abonnement reste actif jusqu\'à la fin de la période payée.',
      'Les remboursements sont traités via votre prestataire de paiement d\'origine (Flutterwave, Stripe, Paystack ou PayUnit) sous 5 à 10 jours ouvrés.',
      'En cas d\'erreur de facturation ou de double prélèvement, contactez-nous immédiatement à support@liafrik.com pour un remboursement prioritaire.',
    ],
    mentions: [
      'Nutro est une plateforme technologique édité et opérée par LiAfrik Dubai & Afrique.',
      'Contact éditeur : cs@liafrik.com · Support : support@liafrik.com.',
      'Hébergement et infrastructure : fournisseurs cloud internationaux avec chiffrement des données en transit et au repos.',
      'Paiements traités par nos prestataires de paiement partenaires (Flutterwave, Stripe, Paystack, PayUnit) pour l\'ensemble des transactions internationales.',
      'Pour toute question relative à la propriété intellectuelle ou au contenu du site, contactez cs@liafrik.com.',
    ],
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        className="w-full max-w-lg rounded-2xl p-6 max-h-[80vh] overflow-auto" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: theme.text }}>{titles[type]}</h2>
          <button onClick={onClose} style={{ color: theme.textMuted }}><XIcon size={20} /></button>
        </div>
        <div className="space-y-3">
          {contents[type].map((para, i) => (
            <p key={i} className="text-sm leading-relaxed" style={{ color: theme.textMuted }}>{para}</p>
          ))}
        </div>
        <div className="mt-6 pt-4 text-xs" style={{ borderTop: `1px solid ${theme.border}`, color: theme.textMuted }}>
          Dernière mise à jour : {new Date().getFullYear()} · LiAfrik Dubai & Afrique
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function LandingPage() {
  const { theme, themeName, setTheme } = useTheme();
  const { language, currency, setLanguage, setCurrency, t, formatCurrency } = useLocale();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | 'gdpr' | 'cookies' | 'refund' | 'mentions' | null>(null);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [nextSlide]);

  useEffect(() => {
    const handler = () => {
      setScrolled(window.scrollY > 40);
      setShowScrollTop(window.scrollY > 600);
    };
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setActiveTestimonial(i => (i + 1) % TESTIMONIALS.length), 6000);
    return () => clearInterval(interval);
  }, []);

  const selectedCurrency = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0];
  const toPrice = (usd: number) => formatCurrency(usd * selectedCurrency.rate, currency);

  const navSections = [
    {
      label: 'Solutions', href: '#features', dropdown: [
        { icon: Tablet, label: 'Menu tablette', desc: 'Menus clients interactifs' },
        { icon: Monitor, label: 'POS cloud', desc: 'Terminal point de vente complet' },
        { icon: ChefHat, label: 'Kitchen display', desc: 'KDS temps réel avec alertes' },
        { icon: BarChart3, label: 'Analytics', desc: 'Reporting multi-branches' },
      ],
    },
    { label: 'Pourquoi Nutro', href: '#why-us' },
    { label: 'Témoignages', href: '#testimonials' },
    { label: 'Tarifs', href: '#pricing' },
  ];

  return (
    <div className="min-h-screen" style={{ background: theme.bg, color: theme.text }}>
      {/* FIXED DARK HEADER */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(16px)',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.04)',
        }}>
        <div className="section-shell px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: theme.primary }}>
              <Logo size={18} color="#fff" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-bold tracking-tight text-white">NUTRO</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-7">
            {navSections.map(item => (
              <div key={item.label} className="relative group">
                {item.dropdown ? (
                  <>
                    <button className="text-sm font-medium transition-colors hover:text-white flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
                      {item.label} <ChevronDown size={14} />
                    </button>
                    <div className="absolute top-full left-0 mt-2 w-64 rounded-xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
                      style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                      {item.dropdown.map(sub => (
                        <a key={sub.label} href={item.href} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(3, 105, 161, 0.2)' }}>
                            <sub.icon size={15} style={{ color: '#38BDF8' }} />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">{sub.label}</div>
                            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{sub.desc}</div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </>
                ) : (
                  <a href={item.href} className="text-sm font-medium transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.65)' }}>{item.label}</a>
                )}
              </div>
            ))}
            <Link to="/help" className="text-sm font-medium transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.65)' }}>Aide</Link>
          </div>
          <div className="flex items-center gap-2">
            <select value={currency} onChange={e => setCurrency(e.target.value as SupportedCurrency)}
              className="text-xs font-semibold px-2 py-1.5 rounded-lg outline-none cursor-pointer hidden sm:block max-w-[90px]"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code} style={{ color: '#000' }}>{c.symbol} {c.code}</option>)}
            </select>
            <select value={language} onChange={e => setLanguage(e.target.value as 'en' | 'fr' | 'ar')}
              className="text-xs font-semibold px-2 py-1.5 rounded-lg outline-none cursor-pointer hidden sm:block max-w-[70px]"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <option value="en" style={{ color: '#000' }}>EN</option>
              <option value="fr" style={{ color: '#000' }}>FR</option>
              <option value="ar" style={{ color: '#000' }}>AR</option>
            </select>
            <Link to="/auth/login" className="text-sm font-semibold px-4 py-2 rounded-lg transition-all hidden sm:block"
              style={{ color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>{t('nav.login')}</Link>
            <Link to="/auth/signup" className="text-sm font-bold px-5 py-2 rounded-full transition-all hover:scale-105"
              style={{ background: '#fff', color: '#0F172A' }}>{t('nav.trial')}</Link>
            <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <MenuIcon size={20} color="#fff" />
            </button>
          </div>
        </div>
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="md:hidden px-4 pb-4" style={{ background: 'rgba(15, 23, 42, 0.98)' }}>
              <div className="space-y-2 py-2">
                {[...navSections, { label: 'Aide', href: '/help' }].map(item => (
                  <a key={item.label} href={item.href} className="block rounded-xl px-3 py-3 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.04)' }}
                    onClick={() => setMobileMenuOpen(false)}>{item.label}</a>
                ))}
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <select value={currency} onChange={e => setCurrency(e.target.value as SupportedCurrency)} className="text-sm rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }}>
                  {CURRENCIES.map(c => <option key={c.code} value={c.code} style={{ color: '#000' }}>{c.symbol} {c.code}</option>)}
                </select>
                <select value={language} onChange={e => setLanguage(e.target.value as 'en' | 'fr' | 'ar')} className="text-sm rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <option value="en" style={{ color: '#000' }}>EN</option>
                  <option value="fr" style={{ color: '#000' }}>FR</option>
                  <option value="ar" style={{ color: '#000' }}>AR</option>
                </select>
                <Link to="/auth/login" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-center"
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.14)' }}>{t('nav.login')}</Link>
                <Link to="/auth/signup" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-bold text-center"
                  style={{ background: '#fff', color: '#0F172A' }}>{t('nav.trial')}</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* FULL-SCREEN CAROUSEL HERO */}
      <section className="relative h-screen overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            <img src={SLIDES[currentSlide].image} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.6) 50%, rgba(15,23,42,0.75) 100%)' }} />
          </motion.div>
        </AnimatePresence>

        {/* Slide content */}
        <div className="relative z-10 h-full flex items-center justify-center px-6">
          <div className="max-w-3xl text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-8 text-sm font-medium"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
                  <Sparkles size={14} color="#38BDF8" /> Technologie restaurant entreprise — Essai 14 jours gratuit
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-white">
                  {SLIDES[currentSlide].title.map((line, i) => (
                    <span key={i} className="block">{line}</span>
                  ))}
                </h1>
                <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>
                  {SLIDES[currentSlide].description}
                </p>
                {SLIDES[currentSlide].ctaLink.startsWith('#') ? (
                  <a href={SLIDES[currentSlide].ctaLink}
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-bold transition-all hover:scale-105 hover:shadow-2xl"
                    style={{ background: SLIDES[currentSlide].ctaColor, color: '#fff', boxShadow: `0 8px 32px ${SLIDES[currentSlide].ctaColor}50` }}>
                    {SLIDES[currentSlide].cta} <ArrowRight size={18} />
                  </a>
                ) : (
                  <Link to={SLIDES[currentSlide].ctaLink}
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-bold transition-all hover:scale-105 hover:shadow-2xl"
                    style={{ background: SLIDES[currentSlide].ctaColor, color: '#fff', boxShadow: `0 8px 32px ${SLIDES[currentSlide].ctaColor}50` }}>
                    {SLIDES[currentSlide].cta} <ArrowRight size={18} />
                  </Link>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation dots */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setCurrentSlide(i)} className="transition-all duration-300"
              style={{
                width: currentSlide === i ? 28 : 12,
                height: 12,
                borderRadius: 9999,
                background: currentSlide === i ? '#0369A1' : 'transparent',
                border: currentSlide === i ? 'none' : '2px solid rgba(255,255,255,0.4)',
              }} />
          ))}
        </div>

        {/* Vertical contact tab on right edge */}
        <a href="mailto:cs@liafrik.com"
          className="fixed right-0 top-1/2 -translate-y-1/2 z-30 group"
          style={{ writingMode: 'vertical-rl' }}>
          <div className="flex items-center gap-2 px-4 py-4 rounded-tl-xl rounded-bl-xl transition-all group-hover:pl-5"
            style={{ background: '#0369A1', color: '#fff', writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
            <Mail size={16} />
            <span className="text-sm font-bold tracking-widest uppercase">Nous contacter</span>
          </div>
        </a>
      </section>

      {/* FLOATING BUTTONS - bottom right, always visible */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
            style={{ background: '#334155', color: '#fff' }}>
            <ArrowUp size={20} />
          </motion.button>
        )}
        <a href="https://wa.me/97140000000" target="_blank" rel="noopener noreferrer"
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110"
          style={{ background: '#25D366', color: '#fff', boxShadow: '0 4px 20px rgba(37, 211, 102, 0.4)' }}
          title="WhatsApp">
          <MessageCircle size={26} />
        </a>
        <a href="tel:+97140000000"
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110"
          style={{ background: '#0369A1', color: '#fff', boxShadow: '0 4px 20px rgba(3, 105, 161, 0.4)' }}
          title="Appelez-nous">
          <Phone size={24} />
        </a>
      </div>

      {/* FEATURES */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-sm font-semibold mb-4 px-3 py-1 rounded-full"
              style={{ color: theme.primary, background: theme.primary + '12' }}>
              <Zap size={14} /> Modules de la plateforme
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: theme.text }}>Tout ce dont votre restaurant a besoin</h2>
            <p className="text-xl" style={{ color: theme.textMuted }}>Une plateforme. Six modules puissants. Possibilités infinies.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="p-6 rounded-2xl group hover:-translate-y-1 transition-all duration-200"
                style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all group-hover:scale-110" style={{ background: theme.primary + '15' }}>
                  <f.icon size={22} style={{ color: theme.primary }} />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: theme.text }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: theme.textMuted }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="py-20 px-6" style={{ background: theme.surface, borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}` }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <div className="text-4xl font-bold mb-1" style={{ color: theme.primary }}>{stat.value}</div>
              <div className="text-sm" style={{ color: theme.textMuted }}>{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PARTNER LOGOS — real restaurants using Nutro, infinite scroll marquee */}
      <section className="py-12 overflow-hidden" style={{ background: theme.surface, borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}` }}>
        <p className="text-center text-xs font-bold tracking-widest uppercase mb-8" style={{ color: theme.textMuted }}>
          Approuvé par les leaders de la restauration
        </p>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes nutro-partner-scroll {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
          .nutro-partner-track {
            animation: nutro-partner-scroll 45s linear infinite;
          }
          .nutro-partner-track:hover { animation-play-state: paused; }
        `}} />
        <div className="relative w-full">
          <div className="flex items-center gap-12 nutro-partner-track" style={{ width: 'max-content' }}>
            {[...PARTNER_LOGOS, ...PARTNER_LOGOS].map((partner, i) => (
              <div key={`${partner.file}-${i}`} className="flex items-center justify-center flex-shrink-0" style={{ height: 56, width: 140 }} title={partner.name}>
                <img src={`/partners/${partner.file}`} alt={partner.name} className="max-h-full max-w-full object-contain" style={{ filter: 'grayscale(15%)', opacity: 0.9 }} loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section id="why-us" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-sm font-semibold mb-4 px-3 py-1 rounded-full"
              style={{ color: theme.primary, background: theme.primary + '12' }}>
              <Award size={14} /> Pourquoi choisir Nutro
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: theme.text }}>Conçu pour les meilleurs restaurants du monde</h2>
            <p className="text-xl" style={{ color: theme.textMuted }}>Nous apportons innovation et excellence aux entreprises du monde entier.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {WHY_US.map((item, i) => (
              <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl text-center hover:-translate-y-1 transition-all duration-200"
                style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 mx-auto" style={{ background: theme.primary + '15' }}>
                  <item.icon size={26} style={{ color: theme.primary }} />
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: theme.text }}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: theme.textMuted }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="py-32 px-6" style={{ background: theme.surface, borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}` }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-sm font-semibold mb-4 px-3 py-1 rounded-full"
              style={{ color: theme.primary, background: theme.primary + '12' }}>
              <Star size={14} /> Témoignages
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: theme.text }}>Ce que disent nos clients</h2>
            <p className="text-xl" style={{ color: theme.textMuted }}>Approuvé par 158+ groupes de restaurants dans le monde</p>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={activeTestimonial} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}
              className="text-center">
              <div className="flex justify-center gap-1 mb-6">
                {[...Array(5)].map((_, i) => <Star key={i} size={20} fill="currentColor" style={{ color: theme.primary }} />)}
              </div>
              <p className="text-xl md:text-2xl font-medium leading-relaxed mb-8" style={{ color: theme.text }}>
                "{TESTIMONIALS[activeTestimonial].quote}"
              </p>
              <div>
                <div className="font-bold text-lg" style={{ color: theme.text }}>{TESTIMONIALS[activeTestimonial].author}</div>
                <div className="text-sm" style={{ color: theme.textMuted }}>{TESTIMONIALS[activeTestimonial].role}</div>
                <div className="text-sm font-semibold" style={{ color: theme.primary }}>{TESTIMONIALS[activeTestimonial].company}</div>
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="flex justify-center gap-2 mt-8">
            {TESTIMONIALS.map((_, i) => (
              <button key={i} onClick={() => setActiveTestimonial(i)}
                className="h-2 rounded-full transition-all"
                style={{ width: activeTestimonial === i ? 24 : 8, background: activeTestimonial === i ? theme.primary : theme.border }} />
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-sm font-semibold mb-4 px-3 py-1 rounded-full"
              style={{ color: theme.primary, background: theme.primary + '12' }}>
              <Sparkles size={14} /> Tarification simple
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: theme.text }}>Démarrez gratuitement. Scalez sans effort.</h2>
            <p className="text-xl mb-6" style={{ color: theme.textMuted }}>Tous les plans incluent KDS & reçus thermiques. Essai 14 jours gratuit. Sans carte de crédit.</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold" style={{ background: theme.primary + '15', color: theme.primary, border: `1px solid ${theme.primary}30` }}>
              <Sparkles size={14} /> Payez 12 mois, on vous en offre 2 — l'abonnement annuel équivaut à 10 mois facturés
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {PLANS.map((plan, i) => (
              <motion.div key={plan.name} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="rounded-2xl p-8 relative flex flex-col"
                style={{ background: theme.surface, border: plan.popular ? `2px solid ${theme.primary}` : `1px solid ${theme.border}`, boxShadow: plan.popular ? `0 0 40px ${theme.primary}15` : 'none' }}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white" style={{ background: theme.primary }}>PLUS POPULAIRE</div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-1" style={{ color: plan.color }}>{plan.name}</h3>
                  <p className="text-sm mb-4" style={{ color: theme.textMuted }}>{plan.description}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-5xl font-bold" style={{ color: theme.text }}>{toPrice(plan.price)}</span>
                    <span className="text-sm mb-2" style={{ color: theme.textMuted }}>/mois</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map(f => (
                    <li key={f.text} className="flex items-center gap-3 text-sm">
                      {f.included ? <Check size={16} style={{ color: theme.primary, flexShrink: 0 }} /> : <X size={16} style={{ color: theme.textMuted, flexShrink: 0 }} />}
                      <span style={{ color: f.included ? theme.text : theme.textMuted }}>{f.text}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/auth/signup" className="block text-center py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                  style={{ background: plan.popular ? theme.primary : 'transparent', color: plan.popular ? '#fff' : theme.primary, border: plan.popular ? 'none' : `2px solid ${theme.primary}` }}>
                  Démarrer l'essai gratuit
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6" style={{ background: theme.surface, borderTop: `1px solid ${theme.border}` }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: theme.text }}>Prêt à transformer votre restaurant ?</h2>
          <p className="text-xl mb-10" style={{ color: theme.textMuted }}>Rejoignez 158+ groupes de restaurants déjà sur Nutro. Sans frais d'installation. Annulez à tout moment.</p>
          <Link to="/auth/signup" className="inline-flex items-center gap-3 px-10 py-4 rounded-xl text-lg font-bold transition-all hover:opacity-90 hover:-translate-y-0.5"
            style={{ background: theme.primary, color: '#fff', boxShadow: `0 8px 40px ${theme.primary}30` }}>
            Commencer gratuitement <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6" style={{ background: theme.bg, borderTop: `1px solid ${theme.border}` }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: theme.primary }}>
                  <Logo size={18} color="#fff" />
                </div>
                <span className="text-lg font-bold" style={{ color: theme.text }}>NUTRO</span>
              </div>
              <p className="text-sm leading-relaxed mb-4" style={{ color: theme.textMuted }}>
                Plateforme technologique restaurant entreprise. Propulsé par{' '}
                <a href="https://liafrik.com" target="_blank" rel="noopener noreferrer" className="font-semibold hover:opacity-80 inline-flex items-center gap-1" style={{ color: theme.text }}>
                  LiAfrik Dubai & Afrique <ExternalLink size={11} />
                </a>.
              </p>
              <div className="space-y-2 mb-5">
                <a href="mailto:cs@liafrik.com" className="flex items-center gap-2 text-sm hover:opacity-80" style={{ color: theme.textMuted }}>
                  <Mail size={13} /> cs@liafrik.com
                </a>
                <a href="mailto:support@liafrik.com" className="flex items-center gap-2 text-sm hover:opacity-80" style={{ color: theme.textMuted }}>
                  <Mail size={13} /> support@liafrik.com
                </a>
              </div>
              <div className="flex items-center gap-3">
                {[
                  { label: 'TikTok', href: 'https://www.tiktok.com/@liyahgroup?_r=1&_t=ZS-9981XGgaxrE', icon: 'tiktok' as const },
                  { label: 'Facebook', href: 'https://www.facebook.com/share/1LMAGqsy3n/?mibextid=wwXIfr', icon: Facebook },
                  { label: 'Instagram', href: 'https://www.instagram.com/liafrik_tech?igsi=eXBjdTc5NG42Zml4&utm_source=qr', icon: Instagram },
                  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/liafrik/', icon: Linkedin },
                  { label: 'YouTube', href: 'https://youtube.com/@liyah-n?si=D-lXwovYubw3sdaf', icon: Youtube },
                ].map(social => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    title={social.label}
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-opacity hover:opacity-80"
                    style={{ background: theme.surface, border: `1px solid ${theme.border}`, color: theme.textMuted }}
                  >
                    {social.icon === 'tiktok' ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z" />
                      </svg>
                    ) : (
                      <social.icon size={15} />
                    )}
                  </a>
                ))}
              </div>
            </div>
            {[
              { title: 'Plateforme', links: ['Fonctionnalités', 'Tarifs', 'Centre d\'aide', 'Changelog'] },
              { title: 'Modules', links: ['Menu tablette', 'POS cloud', 'Kitchen display', 'Analytics'] },
              { title: 'Légal', links: ['Conditions générales', 'Confidentialité', 'Cookies', 'Remboursement', 'Mentions légales', 'GDPR / INCO'] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="text-sm font-bold mb-4 uppercase tracking-wider" style={{ color: theme.text }}>{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(link => {
                    const legalMap: Record<string, 'privacy' | 'terms' | 'gdpr' | 'cookies' | 'refund' | 'mentions'> = {
                      'Confidentialité': 'privacy',
                      'Conditions générales': 'terms',
                      'GDPR / INCO': 'gdpr',
                      'Cookies': 'cookies',
                      'Remboursement': 'refund',
                      'Mentions légales': 'mentions',
                    };
                    const legalType = legalMap[link];
                    return (
                      <li key={link}>
                        {legalType ? (
                          <button onClick={() => setLegalModal(legalType)} className="text-sm hover:opacity-80 transition-opacity text-left" style={{ color: theme.textMuted }}>{link}</button>
                        ) : (
                          <a href="#" className="text-sm hover:opacity-80 transition-opacity" style={{ color: theme.textMuted }}>{link}</a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* Instagram feed teaser */}
          <div className="mb-10 pt-8 pb-2" style={{ borderTop: `1px solid ${theme.border}` }}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: theme.text }}>
                <Instagram size={16} /> Suivez-nous sur Instagram
              </h4>
              <a
                href="https://www.instagram.com/liafrik_tech?igsi=eXBjdTc5NG42Zml4&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold hover:opacity-80 flex items-center gap-1"
                style={{ color: theme.primary }}
              >
                @liafrik_tech <ExternalLink size={11} />
              </a>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <a
                  key={i}
                  href="https://www.instagram.com/liafrik_tech?igsi=eXBjdTc5NG42Zml4&utm_source=qr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square rounded-lg flex items-center justify-center transition-opacity hover:opacity-80"
                  style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
                  aria-label="Voir sur Instagram"
                >
                  <Instagram size={18} style={{ color: theme.textMuted }} />
                </a>
              ))}
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-4" style={{ borderTop: `1px solid ${theme.border}` }}>
            <p className="text-xs" style={{ color: theme.textMuted }}>
              © {new Date().getFullYear()} Nutro. Opéré par{' '}
              <a href="https://liafrik.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 underline">LiAfrik Dubai & Afrique</a>. Tous droits réservés.
            </p>
            <p className="text-xs" style={{ color: theme.textMuted }}>Conçu pour les meilleurs restaurants du monde.</p>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} theme={theme} />}
      </AnimatePresence>
    </div>
  );
}
