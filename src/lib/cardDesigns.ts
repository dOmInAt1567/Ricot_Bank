import { getCardDesign } from '@/lib/cardDesigns';

export type CardDesign = {
  key: string;
  name: string;
  category: 'classic' | 'nature' | 'premium' | 'photo';
  gradient?: string;
  text: string;
  chipColor: string;
  photoUrl?: string;
};

export const CARD_DESIGNS: CardDesign[] = [
  { key: 'classic', name: 'Classic', category: 'classic', gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', text: '#ffffff', chipColor: '#d4af37' },
  { key: 'midnight', name: 'Midnight', category: 'classic', gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', text: '#ffffff', chipColor: '#d4af37' },
  { key: 'crimson', name: 'Crimson', category: 'classic', gradient: 'linear-gradient(135deg, #cb2d3e 0%, #ef473a 100%)', text: '#ffffff', chipColor: '#ffd700' },
  // nature gradients kept
  { key: 'forest', name: 'Forest', category: 'nature', gradient: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)', text: '#ffffff', chipColor: '#d4af37' },
  { key: 'sunset', name: 'Sunset', category: 'nature', gradient: 'linear-gradient(135deg, #ff512f 0%, #dd2476 100%)', text: '#ffffff', chipColor: '#ffd700' },
  // photo designs (real images) - premium and free
  { key: 'photo-forest', name: 'Forest Photo', category: 'photo', photoUrl: '/cards/forest.jpg', text: '#ffffff', chipColor: '#d4af37' },
  { key: 'photo-kittens', name: 'Kittens', category: 'photo', photoUrl: '/cards/kittens.jpg', text: '#ffffff', chipColor: '#ffd700' },
  { key: 'photo-mountain', name: 'Mountain', category: 'photo', photoUrl: '/cards/mountain.jpg', text: '#ffffff', chipColor: '#d4af37' },
  { key: 'gold', name: 'Gold', category: 'premium', gradient: 'linear-gradient(135deg, #b8860b 0%, #ffd700 50%, #b8860b 100%)', text: '#1a1a2e', chipColor: '#5d4037' },
  { key: 'platinum', name: 'Platinum', category: 'premium', gradient: 'linear-gradient(135deg, #bdc3c7 0%, #e0e0e0 50%, #bdc3c7 100%)', text: '#1a1a2e', chipColor: '#78909c' },
];

export function getCardDesign(key: string): CardDesign {
  return CARD_DESIGNS.find((d) => d.key === key) ?? CARD_DESIGNS[0];
}
