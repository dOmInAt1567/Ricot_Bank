export type CardDesign = {
  key: string;
  name: string;
  category: 'classic' | 'nature' | 'premium';
  gradient: string;
  text: string;
  chipColor: string;
};

export const CARD_DESIGNS: CardDesign[] = [
  { key: 'classic', name: 'Classic', category: 'classic', gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', text: '#ffffff', chipColor: '#d4af37' },
  { key: 'midnight', name: 'Midnight', category: 'classic', gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', text: '#ffffff', chipColor: '#d4af37' },
  { key: 'crimson', name: 'Crimson', category: 'classic', gradient: 'linear-gradient(135deg, #cb2d3e 0%, #ef473a 100%)', text: '#ffffff', chipColor: '#ffd700' },
  { key: 'ocean', name: 'Ocean', category: 'classic', gradient: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)', text: '#ffffff', chipColor: '#e0e0e0' },
  { key: 'forest', name: 'Forest', category: 'nature', gradient: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)', text: '#ffffff', chipColor: '#d4af37' },
  { key: 'sunset', name: 'Sunset', category: 'nature', gradient: 'linear-gradient(135deg, #ff512f 0%, #dd2476 100%)', text: '#ffffff', chipColor: '#ffd700' },
  { key: 'aurora', name: 'Aurora', category: 'nature', gradient: 'linear-gradient(135deg, #00c9ff 0%, #92fe9d 100%)', text: '#1a1a2e', chipColor: '#d4af37' },
  { key: 'mountain', name: 'Mountain', category: 'nature', gradient: 'linear-gradient(135deg, #283c86 0%, #45a247 100%)', text: '#ffffff', chipColor: '#d4af37' },
  { key: 'desert', name: 'Desert', category: 'nature', gradient: 'linear-gradient(135deg, #c79081 0%, #dfa579 100%)', text: '#3e2723', chipColor: '#5d4037' },
  { key: 'glacier', name: 'Glacier', category: 'nature', gradient: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)', text: '#1a1a2e', chipColor: '#78909c' },
  { key: 'volcano', name: 'Volcano', category: 'nature', gradient: 'linear-gradient(135deg, #4a0000 0%, #8b0000 50%, #ff4500 100%)', text: '#ffffff', chipColor: '#ffd700' },
  { key: 'tropical', name: 'Tropical', category: 'nature', gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', text: '#ffffff', chipColor: '#d4af37' },
  { key: 'lavender', name: 'Lavender', category: 'nature', gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', text: '#3e2723', chipColor: '#5d4037' },
  { key: 'coral', name: 'Coral Reef', category: 'nature', gradient: 'linear-gradient(135deg, #ff9966 0%, #ff5e62 100%)', text: '#ffffff', chipColor: '#ffd700' },
  { key: 'gold', name: 'Gold', category: 'premium', gradient: 'linear-gradient(135deg, #b8860b 0%, #ffd700 50%, #b8860b 100%)', text: '#1a1a2e', chipColor: '#5d4037' },
  { key: 'platinum', name: 'Platinum', category: 'premium', gradient: 'linear-gradient(135deg, #bdc3c7 0%, #e0e0e0 50%, #bdc3c7 100%)', text: '#1a1a2e', chipColor: '#78909c' },
  { key: 'obsidian', name: 'Obsidian', category: 'premium', gradient: 'linear-gradient(135deg, #000000 0%, #2c2c2c 50%, #000000 100%)', text: '#ffffff', chipColor: '#ffd700' },
  { key: 'sapphire', name: 'Sapphire', category: 'premium', gradient: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)', text: '#ffffff', chipColor: '#d4af37' },
  { key: 'emerald', name: 'Emerald', category: 'premium', gradient: 'linear-gradient(135deg, #0f3d2e 0%, #1a7a52 50%, #0f3d2e 100%)', text: '#ffffff', chipColor: '#d4af37' },
  { key: 'ruby', name: 'Ruby', category: 'premium', gradient: 'linear-gradient(135deg, #8b0a1a 0%, #c4151f 50%, #8b0a1a 100%)', text: '#ffffff', chipColor: '#ffd700' },
];

export function getCardDesign(key: string): CardDesign {
  return CARD_DESIGNS.find((d) => d.key === key) ?? CARD_DESIGNS[0];
}
