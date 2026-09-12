import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, Send, Bot, User, ChevronRight, HelpCircle,
  UtensilsCrossed, Monitor, Tablet, ChefHat, BarChart3, Shield, Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocale } from '@/contexts/LocaleContext';

// Replaces the previous version, which listed a fake article count per category
// ("12 articles", "18 articles"...) on cards with no onClick or link — pure
// decoration implying real articles existed when none did. Each category now
// expands (same accordion pattern as the FAQ below) to real written guidance
// grounded in what the platform actually does, not placeholder copy.
function getGuides(t: (key: string, fallback?: string) => string) {
  return [
    { icon: UtensilsCrossed, title: t('help.guide.menu.title'), color: '#10B981', desc: t('help.guide.menu.desc'),
      sections: [t('help.guide.menu.s1'), t('help.guide.menu.s2'), t('help.guide.menu.s3'), t('help.guide.menu.s4')] },
    { icon: Monitor, title: t('help.guide.pos.title'), color: '#3b82f6', desc: t('help.guide.pos.desc'),
      sections: [t('help.guide.pos.s1'), t('help.guide.pos.s2'), t('help.guide.pos.s3'), t('help.guide.pos.s4')] },
    { icon: ChefHat, title: t('help.guide.kds.title'), color: '#f59e0b', desc: t('help.guide.kds.desc'),
      sections: [t('help.guide.kds.s1'), t('help.guide.kds.s2'), t('help.guide.kds.s3'), t('help.guide.kds.s4')] },
    { icon: Tablet, title: t('help.guide.tablet.title'), color: '#8b5cf6', desc: t('help.guide.tablet.desc'),
      sections: [t('help.guide.tablet.s1'), t('help.guide.tablet.s2'), t('help.guide.tablet.s3'), t('help.guide.tablet.s4')] },
    { icon: BarChart3, title: t('help.guide.analytics.title'), color: '#06b6d4', desc: t('help.guide.analytics.desc'),
      sections: [t('help.guide.analytics.s1'), t('help.guide.analytics.s2'), t('help.guide.analytics.s3')] },
    { icon: Shield, title: t('help.guide.security.title'), color: '#ef4444', desc: t('help.guide.security.desc'),
      sections: [t('help.guide.security.s1'), t('help.guide.security.s2'), t('help.guide.security.s3'), t('help.guide.security.s4')] },
  ];
}

function getFaqs(t: (key: string, fallback?: string) => string) {
  return [
    { q: t('help.faq.q1'), a: t('help.faq.a1') },
    { q: t('help.faq.q2'), a: t('help.faq.a2') },
    { q: t('help.faq.q3'), a: t('help.faq.a3') },
    { q: t('help.faq.q4'), a: t('help.faq.a4') },
    { q: t('help.faq.q5'), a: t('help.faq.a5') },
    { q: t('help.faq.q6'), a: t('help.faq.a6') },
  ];
}

interface Message { id: string; role: 'user' | 'assistant'; content: string; timestamp: Date; }

const AI_RESPONSES: Record<string, string> = {
  default: "I'm the Nutro Assistant. I can help with menu setup, POS operations, KDS configuration, and more. What would you like to know?",
  menu: "To add a menu item: go to **Admin → Menu Manager → Add Item**. You can set the name, price, category, full macros (calories, protein, carbs, fats), and dietary flags. Modifiers like add-ons or size options can be added after creating the base item.",
  pos: "The POS Terminal (/app/pos) is PIN-protected. After entering your 4-digit PIN, you can select tables, add items from the quick-grid, choose a payment method (Cash, Card, Tap to Pay, Gift Card), and process the order. The Z-Report at end of day shows your full shift summary.",
  kds: "The Kitchen Display System (/app/kds) shows tickets in real-time. Tickets turn yellow after 10 minutes and red after 15 minutes. Allergy alerts glow with a pulsing red border. Press BUMP when a ticket is complete to remove it from the screen.",
  allergen: "Nutro's allergen system lets you flag every menu item with dietary attributes: Halal, Vegan, Gluten-Free, Keto, Nut-Free, Dairy, Shellfish, and Spicy. On the customer tablet, guests can filter the entire menu by these flags. Severe allergy notes placed during ordering trigger high-priority KDS alerts.",
  tablet: "The customer tablet menu (/app/tablet?table=X) runs in a full-screen kiosk mode. It supports 3 languages (EN, FR, AR) and multiple currencies (USD, EUR, AED, GBP). Customers can filter by dietary needs, view full macros per dish, and place orders directly from their table.",
  pricing: "Nutro offers three plans:\n• **Starter** ($29/mo): 1 site, up to 10 tables, up to 3 staff accounts, digital menu + basic allergens\n• **Premium** ($69/mo): up to 3 sites, up to 30 tables, up to 10 staff accounts, full POS + KDS, multi-currency\n• **Enterprise** ($189/mo): unlimited sites, tables, staff and POS terminals, custom roles, centralized multi-branch accounting\n\nAll plans include a 14-day free trial.",
};

function getAIResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('menu') || lower.includes('item') || lower.includes('add')) return AI_RESPONSES.menu;
  if (lower.includes('pos') || lower.includes('terminal') || lower.includes('payment') || lower.includes('cashier')) return AI_RESPONSES.pos;
  if (lower.includes('kds') || lower.includes('kitchen')) return AI_RESPONSES.kds;
  if (lower.includes('allerg') || lower.includes('halal') || lower.includes('vegan') || lower.includes('gluten')) return AI_RESPONSES.allergen;
  if (lower.includes('tablet') || lower.includes('customer') || lower.includes('kiosk')) return AI_RESPONSES.tablet;
  if (lower.includes('price') || lower.includes('plan') || lower.includes('cost') || lower.includes('trial')) return AI_RESPONSES.pricing;
  return AI_RESPONSES.default;
}

function AIChatWidget() {
  const { theme } = useTheme();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'assistant', content: t('help.chat.greeting'), timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      const response = getAIResponse(userMsg.content);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: response, timestamp: new Date() }]);
      setTyping(false);
    }, 900);
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  return (
    <>
      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
        style={{ background: theme.primary, boxShadow: `0 8px 32px ${theme.primary}60` }}>
        <Bot size={24} color="#fff" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-80 rounded-2xl flex flex-col shadow-2xl overflow-hidden"
            style={{ background: theme.surface, border: `1px solid ${theme.border}`, height: 420 }}>
            <div className="px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ background: theme.primary }}>
              <div className="flex items-center gap-2">
                <Sparkles size={16} color="#fff" />
                <span className="text-sm font-bold text-white">{t('help.chat.name')}</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-auto p-3 space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: theme.primary }}>
                      <Bot size={13} color="#fff" />
                    </div>
                  )}
                  <div className="max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed"
                    style={{ background: msg.role === 'user' ? theme.primary : theme.bg, color: msg.role === 'user' ? '#fff' : theme.text }}>
                    {msg.content.split('**').map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: theme.border }}>
                      <User size={13} style={{ color: theme.textMuted }} />
                    </div>
                  )}
                </div>
              ))}
              {typing && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: theme.primary }}>
                    <Bot size={13} color="#fff" />
                  </div>
                  <div className="flex items-center gap-1 px-3 py-2 rounded-xl" style={{ background: theme.bg }}>
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: theme.textMuted }}
                        animate={{ y: [0, -4, 0] }} transition={{ delay: i * 0.15, duration: 0.6, repeat: Infinity }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="p-3 flex-shrink-0" style={{ borderTop: `1px solid ${theme.border}` }}>
              <div className="flex gap-2">
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
                  placeholder={t('help.chat.placeholder')}
                  className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                <button onClick={send} className="px-3 py-2 rounded-xl" style={{ background: theme.primary }}><Send size={13} color="#fff" /></button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function HelpCenter() {
  const { theme } = useTheme();
  const { t } = useLocale();
  const [search, setSearch] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [openGuide, setOpenGuide] = useState<number | null>(null);

  const GUIDES = getGuides(t);
  const FAQS = getFaqs(t);

  const filteredFaqs = FAQS.filter(f => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()));
  // Search previously only filtered the FAQ list — the User Manual guides were
  // unsearchable even though they're now the bulk of this page's real content.
  // A guide matches if the query hits its title, short description, or any of
  // its step sections, and matching guides auto-expand so the match is visible
  // immediately instead of the visitor having to click through blindly.
  const query = search.trim().toLowerCase();
  const filteredGuides = query
    ? GUIDES.filter(g => g.title.toLowerCase().includes(query) || g.desc.toLowerCase().includes(query) || g.sections.some(s => s.toLowerCase().includes(query)))
    : GUIDES;

  return (
    <div className="min-h-screen" style={{ background: theme.bg }}>
      <div className="py-16 px-6 text-center" style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}` }}>
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: theme.primary }}>
            <UtensilsCrossed size={16} color="#fff" />
          </div>
          <span className="font-extrabold" style={{ color: theme.text }}>NUTRO</span>
        </Link>
        <h1 className="text-2xl font-bold mb-4" style={{ color: theme.text }}>{t('help.title')}</h1>
        <p className="text-lg mb-8" style={{ color: theme.textMuted }}>{t('help.subtitle')}</p>
        <div className="relative max-w-lg mx-auto">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('help.searchPlaceholder')}
            className="w-full pl-12 pr-4 py-3 rounded-2xl text-sm outline-none"
            style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-12">
        <div>
          <h2 className="text-2xl font-extrabold mb-2" style={{ color: theme.text }}>{t('help.manual.title')}</h2>
          <p className="text-sm mb-6" style={{ color: theme.textMuted }}>{t('help.manual.subtitle')}</p>
          <div className="space-y-3">
            {filteredGuides.map((cat, i) => (
              <motion.div key={cat.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="rounded-2xl overflow-hidden" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                <button className="w-full flex items-center gap-4 p-5 text-left" onClick={() => setOpenGuide(openGuide === i ? null : i)}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cat.color + '18' }}>
                    <cat.icon size={20} style={{ color: cat.color }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold" style={{ color: theme.text }}>{cat.title}</h3>
                    <p className="text-xs" style={{ color: theme.textMuted }}>{cat.desc}</p>
                  </div>
                  <ChevronRight size={16} style={{ color: cat.color, transform: openGuide === i ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                </button>
                <AnimatePresence>
                  {openGuide === i && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
                      <ul className="px-5 pb-5 pl-[4.5rem] space-y-2.5 list-disc" style={{ color: theme.textMuted }}>
                        {cat.sections.map((s, j) => (
                          <li key={j} className="text-sm leading-relaxed">{s}</li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-extrabold mb-6" style={{ color: theme.text }}>{t('help.faq.title')}</h2>
          <div className="space-y-3">
            {filteredFaqs.map((faq, i) => (
              <div key={i} className="rounded-xl overflow-hidden" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                <button className="w-full flex items-center justify-between px-5 py-4 text-left" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span className="font-semibold text-sm" style={{ color: theme.text }}>{faq.q}</span>
                  <ChevronRight size={16} style={{ color: theme.textMuted, transform: openFaq === i ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
                      <p className="px-5 pb-4 text-sm leading-relaxed" style={{ color: theme.textMuted }}>{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-8 text-center" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          <HelpCircle size={36} className="mx-auto mb-4" style={{ color: theme.primary }} />
          <h2 className="text-xl font-extrabold mb-2" style={{ color: theme.text }}>{t('help.stillNeedHelp.title')}</h2>
          <p className="text-sm mb-6" style={{ color: theme.textMuted }}>{t('help.stillNeedHelp.desc')}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="mailto:support@liafrik.com" className="px-6 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: theme.primary }}>support@liafrik.com</a>
            <a href="mailto:cs@liafrik.com" className="px-6 py-2.5 rounded-xl font-bold text-sm" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>cs@liafrik.com</a>
          </div>
        </div>
      </div>

      <AIChatWidget />
    </div>
  );
}
