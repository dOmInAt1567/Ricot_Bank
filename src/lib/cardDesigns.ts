export type CardDesign = {
  key: string;
  name: string;
  category: 'classic' | 'nature' | 'animals' | 'kittens' | 'premium';
  type: 'gradient' | 'photo';
  gradient?: string;
  imageUrl?: string;
  text: string;
  overlay?: string;
  chipColor: string;
  premium?: boolean;
};

export const CARD_DESIGNS: CardDesign[] = [
  // Classic gradients
  { key: 'classic', name: 'Classic', category: 'classic', type: 'gradient', gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', text: '#ffffff', chipColor: '#d4af37' },
  { key: 'midnight', name: 'Midnight', category: 'classic', type: 'gradient', gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', text: '#ffffff', chipColor: '#d4af37' },
  { key: 'crimson', name: 'Crimson', category: 'classic', type: 'gradient', gradient: 'linear-gradient(135deg, #cb2d3e 0%, #ef473a 100%)', text: '#ffffff', chipColor: '#ffd700' },
  { key: 'ocean', name: 'Ocean', category: 'classic', type: 'gradient', gradient: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)', text: '#ffffff', chipColor: '#e0e0e0' },
  { key: 'forest', name: 'Forest', category: 'classic', type: 'gradient', gradient: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)', text: '#ffffff', chipColor: '#d4af37' },
  { key: 'sunset', name: 'Sunset', category: 'classic', type: 'gradient', gradient: 'linear-gradient(135deg, #ff512f 0%, #dd2476 100%)', text: '#ffffff', chipColor: '#ffd700' },

  // Nature photos
  { key: 'mountain', name: 'Mountain', category: 'nature', type: 'photo', imageUrl: 'https://images.pexels.com/photos/38520172/pexels-photo-38520172.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', text: '#ffffff', overlay: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 100%)', chipColor: '#d4af37' },
  { key: 'tropical', name: 'Tropical Beach', category: 'nature', type: 'photo', imageUrl: 'https://images.pexels.com/photos/188014/pexels-photo-188014.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', text: '#ffffff', overlay: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 100%)', chipColor: '#d4af37' },
  { key: 'island', name: 'Island Paradise', category: 'nature', type: 'photo', imageUrl: 'https://images.pexels.com/photos/9149273/pexels-photo-9149273.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', text: '#ffffff', overlay: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 100%)', chipColor: '#d4af37' },
  { key: 'aurora', name: 'Aurora', category: 'nature', type: 'photo', imageUrl: 'https://images.pexels.com/photos/28237726/pexels-photo-28237726.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', text: '#ffffff', overlay: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)', chipColor: '#d4af37' },
  { key: 'desert', name: 'Desert Dunes', category: 'nature', type: 'photo', imageUrl: 'https://images.pexels.com/photos/35112800/pexels-photo-35112800.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', text: '#ffffff', overlay: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 100%)', chipColor: '#d4af37' },
  { key: 'greenmountain', name: 'Green Mountains', category: 'nature', type: 'photo', imageUrl: 'https://images.pexels.com/photos/12610181/pexels-photo-12610181.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', text: '#ffffff', overlay: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 100%)', chipColor: '#d4af37' },

  // Animals
  { key: 'lion', name: 'Lion', category: 'animals', type: 'photo', imageUrl: 'https://images.pexels.com/photos/33828273/pexels-photo-33828273.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', text: '#ffffff', overlay: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 100%)', chipColor: '#d4af37' },
  { key: 'goldtiger', name: 'Golden Tiger', category: 'animals', type: 'photo', imageUrl: 'https://images.pexels.com/photos/16958632/pexels-photo-16958632.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', text: '#ffffff', overlay: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 100%)', chipColor: '#d4af37' },
  { key: 'whitetiger', name: 'White Tiger', category: 'animals', type: 'photo', imageUrl: 'https://images.pexels.com/photos/36454887/pexels-photo-36454887.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', text: '#ffffff', overlay: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)', chipColor: '#d4af37' },

  // Kittens
  { key: 'kitten1', name: 'Cute Kitten', category: 'kittens', type: 'photo', imageUrl: 'https://images.pexels.com/photos/21047223/pexels-photo-21047223.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', text: '#ffffff', overlay: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 100%)', chipColor: '#d4af37' },
  { key: 'kitten2', name: 'Fluffy Kitten', category: 'kittens', type: 'photo', imageUrl: 'https://images.pexels.com/photos/37220239/pexels-photo-37220239.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', text: '#ffffff', overlay: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 100%)', chipColor: '#d4af37' },
  { key: 'kitten3', name: 'Twin Kittens', category: 'kittens', type: 'photo', imageUrl: 'https://images.pexels.com/photos/16390929/pexels-photo-16390929.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', text: '#ffffff', overlay: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 100%)', chipColor: '#d4af37' },

  // Premium (locked for non-premium users)
  { key: 'gold', name: 'Gold', category: 'premium', type: 'gradient', gradient: 'linear-gradient(135deg, #b8860b 0%, #ffd700 50%, #b8860b 100%)', text: '#1a1a2e', chipColor: '#5d4037', premium: true },
  { key: 'platinum', name: 'Platinum', category: 'premium', type: 'gradient', gradient: 'linear-gradient(135deg, #bdc3c7 0%, #e0e0e0 50%, #bdc3c7 100%)', text: '#1a1a2e', chipColor: '#78909c', premium: true },
  { key: 'obsidian', name: 'Obsidian', category: 'premium', type: 'gradient', gradient: 'linear-gradient(135deg, #000000 0%, #2c2c2c 50%, #000000 100%)', text: '#ffffff', chipColor: '#ffd700', premium: true },
  { key: 'sapphire', name: 'Sapphire', category: 'premium', type: 'gradient', gradient: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)', text: '#ffffff', chipColor: '#d4af37', premium: true },
  { key: 'emerald', name: 'Emerald', category: 'premium', type: 'gradient', gradient: 'linear-gradient(135deg, #0f3d2e 0%, #1a7a52 50%, #0f3d2e 100%)', text: '#ffffff', chipColor: '#d4af37', premium: true },
  { key: 'ruby', name: 'Ruby', category: 'premium', type: 'gradient', gradient: 'linear-gradient(135deg, #8b0a1a 0%, #c4151f 50%, #8b0a1a 100%)', text: '#ffffff', chipColor: '#ffd700', premium: true },
];

export function getCardDesign(key: string): CardDesign {
  return CARD_DESIGNS.find((d) => d.key === key) ?? CARD_DESIGNS[0];
}
