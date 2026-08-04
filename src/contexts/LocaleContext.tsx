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
    'auth.createAccount': 'Create your account',
    'auth.email': 'Email Address',
    'auth.password': 'Password',
    'auth.remember': 'Remember me',
    'auth.forgot': 'Forgot password?',
    'auth.signin': 'Sign In',
    'auth.signup': 'Start free trial',
    'auth.noAccount': "Don't have an account?",
    'auth.alreadyAccount': 'Already have an account?',
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
  },
  fr: {
    'nav.login': 'Connexion',
    'nav.trial': 'Essai gratuit',
    'nav.help': 'Aide',
    'nav.contact': 'Nous contacter',
    'hero.cta': 'Démarrer l’essai gratuit',
    'hero.learnMore': 'En savoir plus',
    'auth.welcome': 'Bon retour',
    'auth.createAccount': 'Créez votre compte',
    'auth.email': 'Adresse e-mail',
    'auth.password': 'Mot de passe',
    'auth.remember': 'Se souvenir de moi',
    'auth.forgot': 'Mot de passe oublié ?',
    'auth.signin': 'Se connecter',
    'auth.signup': 'Commencer l’essai gratuit',
    'auth.noAccount': 'Vous n’avez pas de compte ?',
    'auth.alreadyAccount': 'Vous avez déjà un compte ?',
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
  },
  ar: {
    'nav.login': 'تسجيل الدخول',
    'nav.trial': 'تجربة مجانية',
    'nav.help': 'المساعدة',
    'nav.contact': 'تواصل معنا',
    'hero.cta': 'ابدأ التجربة المجانية',
    'hero.learnMore': 'اعرف المزيد',
    'auth.welcome': 'مرحبًا بك مرة أخرى',
    'auth.createAccount': 'أنشئ حسابك',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.remember': 'تذكرني',
    'auth.forgot': 'هل نسيت كلمة المرور؟',
    'auth.signin': 'تسجيل الدخول',
    'auth.signup': 'ابدأ التجربة المجانية',
    'auth.noAccount': 'ليس لديك حساب؟',
    'auth.alreadyAccount': 'هل لديك حساب بالفعل؟',
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
