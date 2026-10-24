// Reward catalog shared by the server (awarding) and client (display).

export interface Badge {
  code: string;
  name: string;
  emoji: string;
  description: string;
}

export const BADGES: Badge[] = [
  { code: 'first_quiz', name: 'First Steps', emoji: '🐾', description: 'Finish your first quiz' },
  { code: 'quiz_10', name: 'Dedicated', emoji: '📚', description: 'Finish 10 quizzes' },
  { code: 'quiz_25', name: 'Math Marathon', emoji: '🏃‍♀️', description: 'Finish 25 quizzes' },
  { code: 'perfect', name: 'Perfect!', emoji: '💯', description: 'Get every question right on the first try' },
  { code: 'streak_3', name: 'On Fire', emoji: '🔥', description: 'Practice 3 days in a row' },
  { code: 'streak_7', name: 'Week Warrior', emoji: '🗓️', description: 'Practice 7 days in a row' },
  { code: 'streak_14', name: 'Unstoppable', emoji: '🚀', description: 'Practice 14 days in a row' },
  { code: 'stars_50', name: 'Star Collector', emoji: '⭐', description: 'Earn 50 stars' },
  { code: 'stars_200', name: 'Superstar', emoji: '🌟', description: 'Earn 200 stars' },
  { code: 'plot_pro', name: 'Plot Pro', emoji: '📍', description: '10 coordinate questions right in a row' },
  { code: 'order_master', name: 'Order Master', emoji: '🔢', description: '10 ordering questions right in a row' },
  { code: 'distance_whiz', name: 'Distance Whiz', emoji: '📏', description: '10 distance questions right in a row' },
  { code: 'comeback', name: 'Comeback Kid', emoji: '💪', description: 'Fix 5 answers on the second try in one quiz' },
];

export type Slot = 'color' | 'hat' | 'face' | 'extra' | 'helper' | 'helperFur' | 'helperHat' | 'helperExtra' | 'mode';

export interface AvatarItem {
  id: string;
  slot: Slot;
  label: string;
  stars: number; // what it costs in the Star Store; 0 = everyone owns it
}

export const AVATAR_ITEMS: AvatarItem[] = [
  { id: 'color-sky', slot: 'color', label: 'Sky', stars: 0 },
  { id: 'color-mint', slot: 'color', label: 'Mint', stars: 0 },
  { id: 'color-peach', slot: 'color', label: 'Peach', stars: 10 },
  { id: 'color-lavender', slot: 'color', label: 'Lavender', stars: 25 },
  { id: 'color-gold', slot: 'color', label: 'Gold', stars: 120 },
  { id: 'color-galaxy', slot: 'color', label: 'Galaxy', stars: 250 },
  { id: 'hat-none', slot: 'hat', label: 'No hat', stars: 0 },
  { id: 'hat-bow', slot: 'hat', label: 'Bow', stars: 5 },
  { id: 'hat-cap', slot: 'hat', label: 'Cap', stars: 20 },
  { id: 'hat-crown', slot: 'hat', label: 'Crown', stars: 75 },
  { id: 'hat-wizard', slot: 'hat', label: 'Wizard hat', stars: 150 },
  { id: 'face-smile', slot: 'face', label: 'Smile', stars: 0 },
  { id: 'face-glasses', slot: 'face', label: 'Glasses', stars: 15 },
  { id: 'face-shades', slot: 'face', label: 'Sunglasses', stars: 40 },
  { id: 'face-star', slot: 'face', label: 'Star eyes', stars: 100 },
  { id: 'extra-none', slot: 'extra', label: 'Nothing', stars: 0 },
  { id: 'extra-headphones', slot: 'extra', label: 'Headphones', stars: 30 },
  { id: 'extra-cape', slot: 'extra', label: 'Hero cape', stars: 60 },
  { id: 'extra-rainbow', slot: 'extra', label: 'Rainbow', stars: 200 },
  // Math helper: which animal, then its look (fur colors, hats and extras fit every helper)
  { id: 'helper-fox', slot: 'helper', label: 'Pip the fox', stars: 0 },
  { id: 'helper-wolf', slot: 'helper', label: 'Luna the wolf', stars: 0 },
  { id: 'helper-horse', slot: 'helper', label: 'Maple the horse', stars: 0 },
  { id: 'helper-bear', slot: 'helper', label: 'Popsicle the polar bear', stars: 0 },
  { id: 'hfur-classic', slot: 'helperFur', label: 'Classic', stars: 0 },
  { id: 'hfur-arctic', slot: 'helperFur', label: 'Arctic', stars: 15 },
  { id: 'hfur-silver', slot: 'helperFur', label: 'Silver', stars: 35 },
  { id: 'hfur-ruby', slot: 'helperFur', label: 'Ruby', stars: 70 },
  { id: 'hfur-lilac', slot: 'helperFur', label: 'Lilac', stars: 110 },
  { id: 'hfur-galaxy', slot: 'helperFur', label: 'Galaxy', stars: 220 },
  { id: 'hhat-none', slot: 'helperHat', label: 'No hat', stars: 0 },
  { id: 'hhat-party', slot: 'helperHat', label: 'Party hat', stars: 8 },
  { id: 'hhat-beanie', slot: 'helperHat', label: 'Beanie', stars: 25 },
  { id: 'hhat-top', slot: 'helperHat', label: 'Top hat', stars: 55 },
  { id: 'hhat-pirate', slot: 'helperHat', label: 'Pirate hat', stars: 95 },
  { id: 'hhat-crown', slot: 'helperHat', label: 'Crown', stars: 180 },
  { id: 'hextra-none', slot: 'helperExtra', label: 'Nothing', stars: 0 },
  { id: 'hextra-scarf', slot: 'helperExtra', label: 'Scarf', stars: 12 },
  { id: 'hextra-bowtie', slot: 'helperExtra', label: 'Bow tie', stars: 30 },
  { id: 'hextra-glasses', slot: 'helperExtra', label: 'Smart glasses', stars: 45 },
  { id: 'hextra-cape', slot: 'helperExtra', label: 'Hero cape', stars: 85 },
  { id: 'hextra-medal', slot: 'helperExtra', label: 'Gold medal', stars: 150 },
  // Celebration style
  { id: 'mode-normal', slot: 'mode', label: 'Normal', stars: 0 },
  { id: 'mode-crazy', slot: 'mode', label: 'Crazy Mode', stars: 75 },
];

export type Avatar = Record<Slot, string>;

export const DEFAULT_AVATAR: Avatar = {
  color: 'color-sky',
  hat: 'hat-none',
  face: 'face-smile',
  extra: 'extra-none',
  helper: 'helper-fox',
  helperFur: 'hfur-classic',
  helperHat: 'hhat-none',
  helperExtra: 'hextra-none',
  mode: 'mode-normal',
};

export type HelperLook = Pick<Avatar, 'helper' | 'helperFur' | 'helperHat' | 'helperExtra' | 'mode'>;

export const HELPER_NAMES: Record<string, string> = { 'helper-fox': 'Pip', 'helper-wolf': 'Luna', 'helper-horse': 'Maple', 'helper-bear': 'Popsicle' };
export const helperName = (a: Partial<Avatar>) => HELPER_NAMES[a.helper ?? ''] ?? 'Pip';

/** Avatars saved before there were several helpers used pip* slots and ids. */
export function upgradeAvatar(raw: Record<string, string>): Partial<Avatar> {
  const out: Record<string, string> = { ...raw };
  const moves: [string, string, (v: string) => string][] = [
    ['pipFur', 'helperFur', (v) => (v === 'pipfur-orange' ? 'hfur-classic' : v.replace('pipfur-', 'hfur-'))],
    ['pipHat', 'helperHat', (v) => v.replace('piphat-', 'hhat-')],
    ['pipExtra', 'helperExtra', (v) => v.replace('pipextra-', 'hextra-')],
  ];
  for (const [from, to, fix] of moves) {
    if (from in out) {
      out[to] ??= fix(out[from]);
      delete out[from];
    }
  }
  return out;
}

/** Stars for an answer: 2 on the first try, 1 if fixed on the retry. */
export const starsFor = (correctFirst: boolean, correctFinal: boolean) => (correctFirst ? 2 : correctFinal ? 1 : 0);
