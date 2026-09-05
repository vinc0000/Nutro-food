import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type SupportedLanguage = 'en' | 'fr' | 'ar';
export type SupportedCurrency = 'USD' | 'EUR' | 'AED' | 'XAF' | 'NGN' | 'GBP';

interface LocaleContextValue {
  language: SupportedLanguage;
  currency: SupportedCurrency;
  setLanguage: (language: SupportedLanguage) => void;
  setCurrency: (currency: SupportedCurrency) => void;
  t: (key: string, fallback?: string) => string;
  formatCurrency: (value: number, currencyOverride?: SupportedCurrency) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (value: Date | string | number) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const translations: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    'nav.login': 'Sign in',
    'nav.trial': 'Free trial',
    'nav.help': 'Help',
    'nav.contact': 'Contact us',
    'hero.cta': 'Start free trial',
    'hero.learnMore': 'Learn more',
    'auth.welcome': 'Welcome back',
    'auth.email': 'Email Address',
    'auth.password': 'Password',
    'auth.remember': 'Remember me',
    'auth.forgot': 'Forgot password?',
    'auth.signin': 'Sign In',
    'auth.signup': 'Start free trial',
    'auth.noAccount': "Don't have an account?",
    'auth.alreadyAccount': 'Already have an account?',
    'auth.createAccount': 'Create your account',
    'auth.freeTrial': 'Start your 14-day free trial. No credit card required.',
    'auth.fullName': 'Full Name',
    'auth.restaurantName': 'Restaurant Name',
    'auth.phoneNumber': 'Phone Number',
    'auth.language': 'Language',
    'auth.country': 'Country',
    'auth.city': 'City',
    'auth.currencyAuto': 'Currency (auto-detected)',
    'auth.choosePlan': 'Choose your plan',
    'auth.planDesc': 'All plans include KDS and thermal receipts. Cancel anytime.',
    'dashboard.greetingMorning': 'Good morning',
    'dashboard.greetingAfternoon': 'Good afternoon',
    'dashboard.greetingEvening': 'Good evening',
    'dashboard.addMenu': 'Add Menu Item',
    'dashboard.recentOrders': 'Recent Orders',
    'dashboard.viewAll': 'View all',
    'dashboard.openPos': 'Open POS',
    'dashboard.kds': 'Kitchen Display',
    'dashboard.tablet': 'Tablet Preview',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.back': 'Back',
    'common.continue': 'Continue',
    'common.close': 'Close',
    'common.language': 'Language',
    'common.currency': 'Currency',
    'common.orders': 'Orders',
    'common.menu': 'Menu',
    'common.reports': 'Reports',
    'common.settings': 'Settings',
    'common.signOut': 'Sign Out',
    'common.loading': 'Loading...',
    'common.search': 'Search',
    'common.today': 'Today',
    'pos.title': 'POS Terminal',
    'pos.pinPrompt': 'Enter your 4-digit PIN to continue',
    'pos.demoPin': 'Demo PIN: 1234',
    'pos.managerTitle': 'Manager Approval',
    'pos.managerPrompt': 'Enter Manager PIN to authorize',
    'pos.managerDemo': 'Demo Manager PIN: 9999',
    'pos.tabletOrders': 'Tablet Orders',
    'pos.zReport': 'Z-Report',
    'pos.lock': 'Lock',
    'pos.orders': 'orders',
    'pos.minutes': 'm',
    'tablet.title': 'Le Maison Dubai',
    'tablet.table': 'Table',
    'tablet.social': 'Social',
    'tablet.search': 'Search dishes...',
    'tablet.customAllergy': 'Custom allergy or dietary note...',
    'tablet.details': 'Details',
    'tablet.add': 'Add to Order',
    'tablet.soldOut': 'Sold Out',
    'tablet.callWaiter': 'Call Waiter',
    'tablet.water': 'Water Request',
    'tablet.bill': 'Bring Bill',
    'kds.title': 'Kitchen Display System',
    'kds.live': 'LIVE',
    'kds.activeTickets': 'active tickets',
    'kds.allergyAlert': 'ALLERGY ALERT',
    'kds.soundOn': 'Sound On',
    'kds.soundOff': 'Sound Off',
    'kds.new': 'New Orders',
    'kds.preparing': 'Preparing',
    'kds.ready': 'Ready to Serve',
    'layout.dashboard': 'Dashboard',
    'layout.tabletMenu': 'Interactive Tablet Menu',
    'layout.menuManager': 'Menu & Recipe Manager',
    'layout.posTerminal': 'POS Terminal',
    'layout.kds': 'KDS Kitchen Screen',
    'layout.reports': 'Reports & Analytics',
    'layout.inventory': 'Inventory',
    'layout.staff': 'Staff & Access Control',
    'layout.integrations': 'Integrations',
    'layout.settings': 'Restaurant Settings',
    'layout.superAdmin': 'Super Admin Command',
    'layout.platform': 'Platform',
    'layout.signOut': 'Sign Out',
    'layout.backOffice': 'Restaurant Back-Office',
    'layout.language': 'Language',
    'layout.currency': 'Currency',
    'layout.restaurantAdmin': 'Restaurant Admin',
    'layout.profile': 'Profile',
  },
  fr: {
    'nav.login': 'Connexion',
    'nav.trial': 'Essai gratuit',
    'nav.help': 'Aide',
    'nav.contact': 'Nous contacter',
    'hero.cta': 'Démarrer l’essai gratuit',
    'hero.learnMore': 'En savoir plus',
    'auth.welcome': 'Bon retour',
    'auth.email': 'Adresse e-mail',
    'auth.password': 'Mot de passe',
    'auth.remember': 'Se souvenir de moi',
    'auth.forgot': 'Mot de passe oublié ?',
    'auth.signin': 'Se connecter',
    'auth.signup': 'Commencer l’essai gratuit',
    'auth.noAccount': 'Vous n’avez pas de compte ?',
    'auth.alreadyAccount': 'Vous avez déjà un compte ?',
    'auth.createAccount': 'Créez votre compte',
    'auth.freeTrial': 'Commencez votre essai gratuit de 14 jours. Aucune carte bleue requise.',
    'auth.fullName': 'Nom complet',
    'auth.restaurantName': 'Nom du restaurant',
    'auth.phoneNumber': 'Numéro de téléphone',
    'auth.language': 'Langue',
    'auth.country': 'Pays',
    'auth.city': 'Ville',
    'auth.currencyAuto': 'Devise (détectée automatiquement)',
    'auth.choosePlan': 'Choisissez votre formule',
    'auth.planDesc': 'Tous les forfaits incluent KDS et reçus thermiques. Annulation à tout moment.',
    'dashboard.greetingMorning': 'Bonjour',
    'dashboard.greetingAfternoon': 'Bon après-midi',
    'dashboard.greetingEvening': 'Bonsoir',
    'dashboard.addMenu': 'Ajouter un article',
    'dashboard.recentOrders': 'Commandes récentes',
    'dashboard.viewAll': 'Tout voir',
    'dashboard.openPos': 'Ouvrir le POS',
    'dashboard.kds': 'Écran cuisine',
    'dashboard.tablet': 'Prévisualisation tablette',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.back': 'Retour',
    'common.continue': 'Continuer',
    'common.close': 'Fermer',
    'common.language': 'Langue',
    'common.currency': 'Devise',
    'common.orders': 'Commandes',
    'common.menu': 'Menu',
    'common.reports': 'Rapports',
    'common.settings': 'Paramètres',
    'common.signOut': 'Se déconnecter',
    'common.loading': 'Chargement...',
    'common.search': 'Rechercher',
    'common.today': 'Aujourd’hui',
    'pos.title': 'Terminal POS',
    'pos.pinPrompt': 'Saisissez votre code PIN à 4 chiffres pour continuer',
    'pos.demoPin': 'PIN de démo : 1234',
    'pos.managerTitle': 'Validation manager',
    'pos.managerPrompt': 'Saisissez le PIN manager pour autoriser',
    'pos.managerDemo': 'PIN manager de démo : 9999',
    'pos.tabletOrders': 'Commandes tablette',
    'pos.zReport': 'Rapport Z',
    'pos.lock': 'Verrouiller',
    'pos.orders': 'commandes',
    'pos.minutes': 'min',
    'tablet.title': 'Le Maison Dubai',
    'tablet.table': 'Table',
    'tablet.social': 'Réseaux',
    'tablet.search': 'Rechercher un plat...',
    'tablet.customAllergy': 'Allergie ou note diététique personnalisée...',
    'tablet.details': 'Détails',
    'tablet.add': 'Ajouter à la commande',
    'tablet.soldOut': 'Épuisé',
    'tablet.callWaiter': 'Appeler le serveur',
    'tablet.water': 'Demander de l’eau',
    'tablet.bill': 'Apporter l’addition',
    'kds.title': 'Écran cuisine',
    'kds.live': 'EN DIRECT',
    'kds.activeTickets': 'tickets actifs',
    'kds.allergyAlert': 'ALERTE ALLERGIE',
    'kds.soundOn': 'Son activé',
    'kds.soundOff': 'Son désactivé',
    'kds.new': 'Nouvelles commandes',
    'kds.preparing': 'Préparation',
    'kds.ready': 'Prêt à servir',
    'layout.dashboard': 'Tableau de bord',
    'layout.tabletMenu': 'Menu interactif sur tablette',
    'layout.menuManager': 'Gestion du menu et recettes',
    'layout.posTerminal': 'Terminal POS',
    'layout.kds': 'Écran cuisine',
    'layout.reports': 'Rapports et analyses',
    'layout.inventory': 'Inventaire',
    'layout.staff': 'Équipe et accès',
    'layout.integrations': 'Intégrations',
    'layout.settings': 'Paramètres du restaurant',
    'layout.superAdmin': 'Commande Super Admin',
    'layout.platform': 'Plateforme',
    'layout.signOut': 'Se déconnecter',
    'layout.backOffice': 'Back-office restaurant',
    'layout.language': 'Langue',
    'layout.currency': 'Devise',
    'layout.restaurantAdmin': 'Administrateur restaurant',
    'layout.profile': 'Profil',
  },
  ar: {
    'nav.login': 'تسجيل الدخول',
    'nav.trial': 'تجربة مجانية',
    'nav.help': 'المساعدة',
    'nav.contact': 'تواصل معنا',
    'hero.cta': 'ابدأ التجربة المجانية',
    'hero.learnMore': 'اعرف المزيد',
    'auth.welcome': 'مرحبًا بك مرة أخرى',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.remember': 'تذكرني',
    'auth.forgot': 'هل نسيت كلمة المرور؟',
    'auth.signin': 'تسجيل الدخول',
    'auth.signup': 'ابدأ التجربة المجانية',
    'auth.noAccount': 'ليس لديك حساب؟',
    'auth.alreadyAccount': 'هل لديك حساب بالفعل؟',
    'auth.createAccount': 'أنشئ حسابك',
    'auth.freeTrial': 'ابدأ تجربة مجانية لمدة 14 يومًا. لا تحتاج إلى بطاقة ائتمان.',
    'auth.fullName': 'الاسم الكامل',
    'auth.restaurantName': 'اسم المطعم',
    'auth.phoneNumber': 'رقم الهاتف',
    'auth.language': 'اللغة',
    'auth.country': 'البلد',
    'auth.city': 'المدينة',
    'auth.currencyAuto': 'العملة (تُكتشف تلقائيًا)',
    'auth.choosePlan': 'اختر الخطة',
    'auth.planDesc': 'تشتمل جميع الخطط على شاشة المطبخ وإيصالات حرارية. يمكنك الإلغاء في أي وقت.',
    'dashboard.greetingMorning': 'صباح الخير',
    'dashboard.greetingAfternoon': 'مساء الخير',
    'dashboard.greetingEvening': 'مساء الخير',
    'dashboard.addMenu': 'إضافة عنصر قائمة',
    'dashboard.recentOrders': 'أحدث الطلبات',
    'dashboard.viewAll': 'عرض الكل',
    'dashboard.openPos': 'فتح نقطة البيع',
    'dashboard.kds': 'شاشة المطبخ',
    'dashboard.tablet': 'معاينة الجهاز اللوحي',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.back': 'رجوع',
    'common.continue': 'متابعة',
    'common.close': 'إغلاق',
    'common.language': 'اللغة',
    'common.currency': 'العملة',
    'common.orders': 'الطلبات',
    'common.menu': 'القائمة',
    'common.reports': 'التقارير',
    'common.settings': 'الإعدادات',
    'common.signOut': 'تسجيل الخروج',
    'common.loading': 'جارٍ التحميل...',
    'common.search': 'بحث',
    'common.today': 'اليوم',
    'pos.title': 'نقطة البيع',
    'pos.pinPrompt': 'أدخل رقم التعريف الشخصي المكون من 4 أرقام للمتابعة',
    'pos.demoPin': 'PIN تجريبي: 1234',
    'pos.managerTitle': 'موافقة المدير',
    'pos.managerPrompt': 'أدخل PIN المدير للموافقة',
    'pos.managerDemo': 'PIN المدير التجريبي: 9999',
    'pos.tabletOrders': 'طلبات الجهاز اللوحي',
    'pos.zReport': 'تقرير Z',
    'pos.lock': 'قفل',
    'pos.orders': 'طلبات',
    'pos.minutes': 'د',
    'tablet.title': 'Le Maison Dubai',
    'tablet.table': 'الجدول',
    'tablet.social': 'اجتماعي',
    'tablet.search': 'ابحث عن الأطباق...',
    'tablet.customAllergy': 'ملاحظة حساسية أو غذائية مخصصة...',
    'tablet.details': 'التفاصيل',
    'tablet.add': 'أضف إلى الطلب',
    'tablet.soldOut': 'نفد',
    'tablet.callWaiter': 'استدعاء النادل',
    'tablet.water': 'طلب ماء',
    'tablet.bill': 'إحضار الفاتورة',
    'kds.title': 'شاشة المطبخ',
    'kds.live': 'مباشر',
    'kds.activeTickets': 'التذاكر النشطة',
    'kds.allergyAlert': 'تنبيه حساسية',
    'kds.soundOn': 'تشغيل الصوت',
    'kds.soundOff': 'إيقاف الصوت',
    'kds.new': 'طلبات جديدة',
    'kds.preparing': 'قيد التحضير',
    'kds.ready': 'جاهز للتقديم',
    'layout.dashboard': 'لوحة التحكم',
    'layout.tabletMenu': 'قائمة الجهاز اللوحي التفاعلية',
    'layout.menuManager': 'إدارة القائمة والوصفات',
    'layout.posTerminal': 'نقطة البيع',
    'layout.kds': 'شاشة المطبخ',
    'layout.reports': 'التقارير والتحليلات',
    'layout.inventory': 'المخزون',
    'layout.staff': 'الموظفون والصلاحيات',
    'layout.integrations': 'التكاملات',
    'layout.settings': 'إعدادات المطعم',
    'layout.superAdmin': 'لوحة المشرف العام',
    'layout.platform': 'المنصة',
    'layout.signOut': 'تسجيل الخروج',
    'layout.backOffice': 'المكتب الخلفي للمطعم',
    'layout.language': 'اللغة',
    'layout.currency': 'العملة',
    'layout.restaurantAdmin': 'مشرف المطعم',
    'layout.profile': 'الملف الشخصي',
  },
};

function detectBrowserLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'en';
  const value = window.navigator.language?.toLowerCase() ?? 'en';
  if (value.startsWith('fr')) return 'fr';
  if (value.startsWith('ar')) return 'ar';
  return 'en';
}

function detectBrowserCurrency(language: SupportedLanguage): SupportedCurrency {
  if (typeof window === 'undefined') return 'USD';
  const locale = window.navigator.language ?? 'en-US';
  if (locale.startsWith('fr')) return 'EUR';
  if (locale.startsWith('ar')) return 'AED';
  if (locale.includes('xaf') || locale.includes('cm') || locale.includes('ci')) return 'XAF';
  if (locale.includes('ng')) return 'NGN';
  if (language === 'fr') return 'EUR';
  if (language === 'ar') return 'AED';
  return 'USD';
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (typeof window === 'undefined') return 'en';
    const stored = window.localStorage.getItem('nutro-language') as SupportedLanguage | null;
    return stored && stored in translations ? stored : detectBrowserLanguage();
  });
  const [currency, setCurrencyState] = useState<SupportedCurrency>(() => {
    if (typeof window === 'undefined') return 'USD';
    const stored = window.localStorage.getItem('nutro-currency') as SupportedCurrency | null;
    return stored && ['USD', 'EUR', 'AED', 'XAF', 'NGN', 'GBP'].includes(stored) ? stored : detectBrowserCurrency('en');
  });

  useEffect(() => {
    const detectedLanguage = detectBrowserLanguage();
    const detectedCurrency = detectBrowserCurrency(detectedLanguage);
    const storedLang = window.localStorage.getItem('nutro-language') as SupportedLanguage | null;
    const storedCurrency = window.localStorage.getItem('nutro-currency') as SupportedCurrency | null;
    if (!storedLang) setLanguageState(detectedLanguage);
    if (!storedCurrency) setCurrencyState(detectedCurrency);
  }, []);

  // The <html lang="..."> attribute was hardcoded to "fr" in index.html and never
  // updated at runtime, so screen readers and search engines always saw "fr" even
  // for users on "en" or "ar" — actively wrong for an "international" product.
  // Keep it in sync with the active language, and set dir="rtl" for Arabic so the
  // browser's native bidi handling (form fields, native widgets) is correct too.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const setLanguage = (next: SupportedLanguage) => {
    setLanguageState(next);
    if (typeof window !== 'undefined') window.localStorage.setItem('nutro-language', next);
  };

  const setCurrency = (next: SupportedCurrency) => {
    setCurrencyState(next);
    if (typeof window !== 'undefined') window.localStorage.setItem('nutro-currency', next);
  };

  const t = (key: string, fallback?: string) => translations[language][key] ?? fallback ?? key;

  const formatCurrency = (value: number, currencyOverride?: SupportedCurrency) => {
    const code = currencyOverride ?? currency;
    const locale = language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
    const date = value instanceof Date ? value : new Date(value);
    const locale = language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-US';
    return new Intl.DateTimeFormat(locale, options).format(date);
  };

  const formatTime = (value: Date | string | number) => formatDate(value, { hour: '2-digit', minute: '2-digit' });

  const value = useMemo(() => ({ language, currency, setLanguage, setCurrency, t, formatCurrency, formatDate, formatTime }), [language, currency]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside LocaleProvider');
  return ctx;
}
