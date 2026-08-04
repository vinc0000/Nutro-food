import { useCallback, useEffect, useState } from 'react';

export interface SharedMenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  halal: boolean;
  vegan: boolean;
  glutenFree: boolean;
  keto: boolean;
  nutFree: boolean;
  spicy: boolean;
  available: boolean;
  description: string;
  stock: number;
  ingredients: { name: string; grams: number }[];
  allergens: string[];
  taxRate: number;
  image: string;
  portionSize: string;
  weight: number;
}

const STORAGE_KEY = 'nutro:shared-menu';
const MENU_EVENT = 'nutro:menu-updated';

export const DEFAULT_MENU_ITEMS: SharedMenuItem[] = [
  {
    id: '1',
    name: 'Wagyu Beef Burger',
    category: 'Mains',
    price: 24,
    calories: 820,
    protein: 48,
    carbs: 42,
    fats: 52,
    fiber: 4,
    halal: true,
    vegan: false,
    glutenFree: false,
    keto: false,
    nutFree: true,
    spicy: false,
    available: true,
    stock: 15,
    taxRate: 5,
    portionSize: 'Regular',
    weight: 380,
    image: 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?w=400',
    description: 'Premium A5 Wagyu patty, aged cheddar, truffle aioli, brioche bun.',
    ingredients: [{ name: 'Wagyu beef', grams: 180 }, { name: 'Brioche bun', grams: 60 }, { name: 'Cheddar', grams: 20 }],
    allergens: ['Gluten', 'Dairy'],
  },
  {
    id: '2',
    name: 'Truffle Fries',
    category: 'Starters',
    price: 9,
    calories: 380,
    protein: 6,
    carbs: 48,
    fats: 18,
    fiber: 5,
    halal: true,
    vegan: true,
    glutenFree: true,
    keto: false,
    nutFree: true,
    spicy: false,
    available: true,
    stock: 30,
    taxRate: 5,
    portionSize: 'Large',
    weight: 200,
    image: 'https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg?w=400',
    description: 'Hand-cut fries tossed in truffle oil and parmesan.',
    ingredients: [{ name: 'Potatoes', grams: 200 }, { name: 'Truffle oil', grams: 5 }],
    allergens: ['Dairy'],
  },
  {
    id: '3',
    name: 'Vegan Buddha Bowl',
    category: 'Mains',
    price: 18,
    calories: 540,
    protein: 22,
    carbs: 68,
    fats: 16,
    fiber: 12,
    halal: true,
    vegan: true,
    glutenFree: true,
    keto: false,
    nutFree: false,
    spicy: false,
    available: true,
    stock: 8,
    taxRate: 5,
    portionSize: 'Regular',
    weight: 420,
    image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=400',
    description: 'Quinoa, roasted veggies, avocado, tahini, mixed greens.',
    ingredients: [{ name: 'Quinoa', grams: 150 }, { name: 'Avocado', grams: 50 }],
    allergens: ['Sesame'],
  },
  {
    id: '4',
    name: 'Grilled Salmon',
    category: 'Mains',
    price: 28,
    calories: 560,
    protein: 42,
    carbs: 8,
    fats: 28,
    fiber: 3,
    halal: false,
    vegan: false,
    glutenFree: true,
    keto: false,
    nutFree: true,
    spicy: false,
    available: true,
    stock: 12,
    taxRate: 5,
    portionSize: 'Regular',
    weight: 300,
    image: 'https://images.pexels.com/photos/3655916/pexels-photo-3655916.jpeg?w=400',
    description: 'Atlantic salmon fillet, lemon butter sauce, seasonal vegetables.',
    ingredients: [{ name: 'Atlantic salmon', grams: 200 }, { name: 'Lemon butter', grams: 40 }],
    allergens: ['Fish', 'Dairy'],
  },
  {
    id: '5',
    name: 'Chocolate Lava Cake',
    category: 'Desserts',
    price: 11,
    calories: 460,
    protein: 7,
    carbs: 62,
    fats: 22,
    fiber: 3,
    halal: true,
    vegan: false,
    glutenFree: false,
    keto: false,
    nutFree: false,
    spicy: false,
    available: false,
    stock: 0,
    taxRate: 5,
    portionSize: 'Small',
    weight: 180,
    image: 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?w=400',
    description: 'Warm molten chocolate cake, vanilla ice cream.',
    ingredients: [{ name: 'Dark chocolate', grams: 80 }, { name: 'Butter', grams: 40 }],
    allergens: ['Gluten', 'Dairy', 'Egg'],
  },
  {
    id: '6',
    name: 'Fresh Lemonade',
    category: 'Drinks',
    price: 6,
    calories: 120,
    protein: 0,
    carbs: 28,
    fats: 0,
    fiber: 0,
    halal: true,
    vegan: true,
    glutenFree: true,
    keto: false,
    nutFree: true,
    spicy: false,
    available: true,
    stock: 50,
    taxRate: 5,
    portionSize: 'Large',
    weight: 350,
    image: 'https://images.pexels.com/photos/1998635/pexels-photo-1998635.jpeg?w=400',
    description: 'House-squeezed lemonade with mint and ice.',
    ingredients: [{ name: 'Lemon juice', grams: 30 }, { name: 'Mint', grams: 10 }],
    allergens: [],
  },
];

function readStoredMenu(): SharedMenuItem[] {
  if (typeof window === 'undefined') return DEFAULT_MENU_ITEMS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MENU_ITEMS;
    const parsed = JSON.parse(raw) as SharedMenuItem[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_MENU_ITEMS;
  } catch {
    return DEFAULT_MENU_ITEMS;
  }
}

function persistMenu(menu: SharedMenuItem[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(menu));
  window.dispatchEvent(new CustomEvent(MENU_EVENT, { detail: menu }));
}

export function useSharedMenu() {
  const [menuItems, setMenuItemsState] = useState<SharedMenuItem[]>(() => readStoredMenu());

  useEffect(() => {
    const syncMenu = () => setMenuItemsState(readStoredMenu());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) syncMenu();
    };
    window.addEventListener(MENU_EVENT, syncMenu as EventListener);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(MENU_EVENT, syncMenu as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setMenuItems = useCallback((valueOrUpdater: SharedMenuItem[] | ((prev: SharedMenuItem[]) => SharedMenuItem[])) => {
    setMenuItemsState(prev => {
      const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
      persistMenu(next);
      return next;
    });
  }, []);

  return { menuItems, setMenuItems };
}
