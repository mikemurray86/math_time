// Reward catalog shared by the server (awarding) and client (display).

export interface Badge {
  code: string;
  name: string;
  emoji: string;
  description: string;
  secret?: boolean; // hidden on the badge shelf until earned
}

export const BADGES: Badge[] = [
  { code: 'first_quiz', name: 'First Steps', emoji: '🐾', description: 'Finish your first quiz' },
  { code: 'quiz_10', name: 'Dedicated', emoji: '📚', description: 'Finish 10 quizzes' },
  { code: 'quiz_25', name: 'Math Marathon', emoji: '🏃‍♀️', description: 'Finish 25 quizzes' },
  { code: 'quiz_50', name: 'Quiz Champion', emoji: '🎖️', description: 'Finish 50 quizzes' },
  { code: 'quiz_100', name: 'Century Club', emoji: '🏆', description: 'Finish 100 quizzes' },
  { code: 'quiz_250', name: 'Quiz Royalty', emoji: '👑', description: 'Finish 250 quizzes' },
  { code: 'perfect', name: 'Perfect!', emoji: '💯', description: 'Get every question right on the first try' },
  { code: 'perfect_5', name: 'Sharpshooter', emoji: '🎯', description: 'Get 5 perfect quizzes' },
  { code: 'perfect_25', name: 'Bullseye Boss', emoji: '🏹', description: 'Get 25 perfect quizzes' },
  { code: 'streak_3', name: 'On Fire', emoji: '🔥', description: 'Practice 3 days in a row' },
  { code: 'streak_7', name: 'Week Warrior', emoji: '🗓️', description: 'Practice 7 days in a row' },
  { code: 'streak_14', name: 'Unstoppable', emoji: '🚀', description: 'Practice 14 days in a row' },
  { code: 'streak_30', name: 'Month of Math', emoji: '🌙', description: 'Practice 30 days in a row' },
  { code: 'streak_60', name: 'Mountain Climber', emoji: '⛰️', description: 'Practice 60 days in a row' },
  { code: 'streak_100', name: 'Diamond Streak', emoji: '💎', description: 'Practice 100 days in a row' },
  { code: 'stars_50', name: 'Star Collector', emoji: '⭐', description: 'Earn 50 stars' },
  { code: 'stars_200', name: 'Superstar', emoji: '🌟', description: 'Earn 200 stars' },
  { code: 'stars_500', name: 'Shooting Star', emoji: '💫', description: 'Earn 500 stars' },
  { code: 'stars_1000', name: 'Galaxy Brain', emoji: '🌌', description: 'Earn 1,000 stars' },
  { code: 'stars_2500', name: 'Supernova', emoji: '☀️', description: 'Earn 2,500 stars' },
  // topic mastery: 10 right in a row on the first try
  { code: 'plot_pro', name: 'Plot Pro', emoji: '📍', description: '10 coordinate questions right in a row' },
  { code: 'order_master', name: 'Order Master', emoji: '🔢', description: '10 ordering questions right in a row' },
  { code: 'distance_whiz', name: 'Distance Whiz', emoji: '📏', description: '10 distance questions right in a row' },
  { code: 'abs_ace', name: 'Absolute Value Ace', emoji: '🧲', description: '10 absolute value questions right in a row' },
  { code: 'factor_finder', name: 'Factor Finder', emoji: '🧩', description: '10 factor, multiple, GCF and LCM questions right in a row' },
  { code: 'fraction_hero', name: 'Fraction Hero', emoji: '🍕', description: '10 fraction questions right in a row' },
  { code: 'shape_shifter', name: 'Shape Shifter', emoji: '📐', description: '10 area, perimeter and volume questions right in a row' },
  { code: 'number_ninja', name: 'Number Ninja', emoji: '🥷', description: '10 whole number questions right in a row' },
  { code: 'decimal_dynamo', name: 'Decimal Dynamo', emoji: '🔟', description: '10 decimal questions right in a row' },
  { code: 'ratio_ranger', name: 'Ratio Ranger', emoji: '⚖️', description: '10 ratio and percent questions right in a row' },
  { code: 'equation_explorer', name: 'Equation Explorer', emoji: '🧮', description: '10 expression and equation questions right in a row' },
  { code: 'data_detective', name: 'Data Detective', emoji: '🔍', description: '10 mean, median, mode and range questions right in a row' },
  { code: 'grade_jumper', name: 'Grade Jumper', emoji: '🦘', description: 'Get a challenge question from the next grade right on the first try' },
  { code: 'all_rounder', name: 'All-Rounder', emoji: '🎓', description: 'Earn the topic badge for every kind of question you practice' },
  // effort and habits
  { code: 'comeback', name: 'Comeback Kid', emoji: '💪', description: 'Fix 5 answers on the second try in one quiz' },
  { code: 'never_give_up', name: 'Never Give Up', emoji: '🛠️', description: 'Fix 50 answers on the second try' },
  { code: 'early_bird', name: 'Early Bird', emoji: '🌅', description: 'Finish a quiz before 8 in the morning' },
  { code: 'night_owl', name: 'Night Owl', emoji: '🦉', description: 'Finish a quiz after 8 at night' },
  { code: 'weekend_warrior', name: 'Weekend Warrior', emoji: '🎉', description: 'Practice on a Saturday and the Sunday after it' },
  { code: 'double_dip', name: 'Double Dip', emoji: '🔁', description: 'Finish 3 quizzes in one day' },
  { code: 'monthly_regular', name: 'Monthly Regular', emoji: '📆', description: 'Practice on 20 different days in one month' },
  // speed
  { code: 'lightning', name: 'Lightning', emoji: '⚡', description: 'Get a perfect quiz averaging under 20 seconds a question' },
  { code: 'personal_best', name: 'Personal Best', emoji: '⏱️', description: 'Beat your fastest perfect quiz' },
  // Star Store
  { code: 'fashionista', name: 'Fashionista', emoji: '👗', description: 'Own 15 things from the Star Store' },
  { code: 'holiday_collector', name: 'Holiday Collector', emoji: '🎁', description: 'Collect every item in a holiday set' },
  { code: 'dragon_tamer', name: 'Dragon Tamer', emoji: '🐉', description: 'Bring home Ember the dragon' },
  { code: 'unicorn_friend', name: 'Unicorn Friend', emoji: '🦄', description: 'Bring home Stardust the unicorn' },
  { code: 'saver', name: 'Super Saver', emoji: '💰', description: 'Save up 500 stars without spending them' },
  // secret
  { code: 'holiday_spirit', name: 'Holiday Spirit', emoji: '🦃', description: 'Practice on Thanksgiving or Christmas Day', secret: true },
  { code: 'star_kid', name: 'Star Kid', emoji: '🌠', description: 'Draw a star on the scratch pad', secret: true },
  { code: 'gamer', name: 'Gamer', emoji: '🎮', description: 'Found the secret code: ↑ ↑ ↓ ↓ ← → ← →', secret: true },
];

export type Slot = 'color' | 'hat' | 'face' | 'extra' | 'helper' | 'helperFur' | 'helperHat' | 'helperExtra' | 'mode';

/** Seasonal sets a grown-up switches on in Settings; their items are only for sale while switched on. */
export type Season = 'halloween' | 'fall' | 'thanksgiving' | 'winter' | 'christmas';

export const SEASONS: { id: Season; label: string; emoji: string }[] = [
  { id: 'halloween', label: 'Halloween', emoji: '🎃' },
  { id: 'fall', label: 'Fall', emoji: '🍂' },
  { id: 'thanksgiving', label: 'Thanksgiving', emoji: '🦃' },
  { id: 'winter', label: 'Winter', emoji: '❄️' },
  { id: 'christmas', label: 'Christmas', emoji: '🎄' },
];

export const isSeason = (v: unknown): v is Season => SEASONS.some((s) => s.id === v);

export interface AvatarItem {
  id: string;
  slot: Slot;
  label: string;
  stars: number; // what it costs in the Star Store; 0 = everyone owns it
  season?: Season;
}

export const AVATAR_ITEMS: AvatarItem[] = [
  { id: 'color-sky', slot: 'color', label: 'Sky', stars: 0 },
  { id: 'color-mint', slot: 'color', label: 'Mint', stars: 0 },
  { id: 'color-peach', slot: 'color', label: 'Peach', stars: 10 },
  { id: 'color-lavender', slot: 'color', label: 'Lavender', stars: 25 },
  { id: 'color-gold', slot: 'color', label: 'Gold', stars: 120 },
  { id: 'color-galaxy', slot: 'color', label: 'Galaxy', stars: 250 },
  { id: 'hat-none', slot: 'hat', label: 'No hat', stars: 0 },
  { id: 'hat-headband', slot: 'hat', label: 'Headband', stars: 10 },
  { id: 'hat-bow', slot: 'hat', label: 'Bow', stars: 5 },
  { id: 'hat-cap', slot: 'hat', label: 'Cap', stars: 20 },
  { id: 'hat-beret', slot: 'hat', label: 'Beret', stars: 35 },
  { id: 'hat-crown', slot: 'hat', label: 'Crown', stars: 75 },
  { id: 'hat-wizard', slot: 'hat', label: 'Wizard hat', stars: 150 },
  { id: 'hat-astronaut', slot: 'hat', label: 'Astronaut helmet', stars: 175 },
  { id: 'face-smile', slot: 'face', label: 'Smile', stars: 0 },
  { id: 'face-glasses', slot: 'face', label: 'Glasses', stars: 15 },
  { id: 'face-shades', slot: 'face', label: 'Sunglasses', stars: 40 },
  { id: 'face-star', slot: 'face', label: 'Star eyes', stars: 100 },
  { id: 'extra-none', slot: 'extra', label: 'Nothing', stars: 0 },
  { id: 'extra-backpack', slot: 'extra', label: 'Backpack', stars: 20 },
  { id: 'extra-headphones', slot: 'extra', label: 'Headphones', stars: 30 },
  { id: 'extra-cape', slot: 'extra', label: 'Hero cape', stars: 60 },
  { id: 'extra-wings', slot: 'extra', label: 'Butterfly wings', stars: 120 },
  { id: 'extra-rainbow', slot: 'extra', label: 'Rainbow', stars: 200 },
  // Math helper: which animal (the dragon and unicorn cost stars), then its look (fur colors, hats and extras fit every helper)
  { id: 'helper-fox', slot: 'helper', label: 'Pip the fox', stars: 0 },
  { id: 'helper-wolf', slot: 'helper', label: 'Luna the wolf', stars: 0 },
  { id: 'helper-horse', slot: 'helper', label: 'Maple the horse', stars: 0 },
  { id: 'helper-bear', slot: 'helper', label: 'Popsicle the polar bear', stars: 0 },
  { id: 'helper-dragon', slot: 'helper', label: 'Ember the dragon', stars: 750 },
  { id: 'helper-unicorn', slot: 'helper', label: 'Stardust the unicorn', stars: 750 },
  { id: 'hfur-classic', slot: 'helperFur', label: 'Classic', stars: 0 },
  { id: 'hfur-arctic', slot: 'helperFur', label: 'Arctic', stars: 15 },
  { id: 'hfur-silver', slot: 'helperFur', label: 'Silver', stars: 35 },
  { id: 'hfur-ruby', slot: 'helperFur', label: 'Ruby', stars: 70 },
  { id: 'hfur-lilac', slot: 'helperFur', label: 'Lilac', stars: 110 },
  { id: 'hfur-galaxy', slot: 'helperFur', label: 'Galaxy', stars: 220 },
  { id: 'hhat-none', slot: 'helperHat', label: 'No hat', stars: 0 },
  { id: 'hhat-party', slot: 'helperHat', label: 'Party hat', stars: 8 },
  { id: 'hhat-beanie', slot: 'helperHat', label: 'Beanie', stars: 25 },
  { id: 'hhat-chef', slot: 'helperHat', label: 'Chef hat', stars: 40 },
  { id: 'hhat-top', slot: 'helperHat', label: 'Top hat', stars: 55 },
  { id: 'hhat-grad', slot: 'helperHat', label: 'Graduation cap', stars: 65 },
  { id: 'hhat-pirate', slot: 'helperHat', label: 'Pirate hat', stars: 95 },
  { id: 'hhat-flowers', slot: 'helperHat', label: 'Flower crown', stars: 130 },
  { id: 'hhat-crown', slot: 'helperHat', label: 'Crown', stars: 180 },
  { id: 'hextra-none', slot: 'helperExtra', label: 'Nothing', stars: 0 },
  { id: 'hextra-scarf', slot: 'helperExtra', label: 'Scarf', stars: 12 },
  { id: 'hextra-bowtie', slot: 'helperExtra', label: 'Bow tie', stars: 30 },
  { id: 'hextra-glasses', slot: 'helperExtra', label: 'Smart glasses', stars: 45 },
  { id: 'hextra-calculator', slot: 'helperExtra', label: 'Calculator', stars: 60 },
  { id: 'hextra-cape', slot: 'helperExtra', label: 'Hero cape', stars: 85 },
  { id: 'hextra-medal', slot: 'helperExtra', label: 'Gold medal', stars: 150 },
  // Halloween set
  { id: 'color-ghost', slot: 'color', label: 'Ghost', stars: 40, season: 'halloween' },
  { id: 'hat-witch', slot: 'hat', label: 'Witch hat', stars: 60, season: 'halloween' },
  { id: 'face-fangs', slot: 'face', label: 'Vampire fangs', stars: 30, season: 'halloween' },
  { id: 'extra-batwings', slot: 'extra', label: 'Bat wings', stars: 80, season: 'halloween' },
  { id: 'hfur-moonlight', slot: 'helperFur', label: 'Moonlight', stars: 50, season: 'halloween' },
  { id: 'hhat-witch', slot: 'helperHat', label: 'Witch hat', stars: 60, season: 'halloween' },
  { id: 'hextra-pumpkin', slot: 'helperExtra', label: 'Pumpkin pail', stars: 40, season: 'halloween' },
  // Fall set
  { id: 'color-maple', slot: 'color', label: 'Maple', stars: 30, season: 'fall' },
  { id: 'hat-acorn', slot: 'hat', label: 'Acorn cap', stars: 35, season: 'fall' },
  { id: 'hat-leaves', slot: 'hat', label: 'Leaf crown', stars: 55, season: 'fall' },
  { id: 'extra-scarf', slot: 'extra', label: 'Cozy scarf', stars: 25, season: 'fall' },
  { id: 'hfur-maple', slot: 'helperFur', label: 'Maple', stars: 40, season: 'fall' },
  { id: 'hhat-leaves', slot: 'helperHat', label: 'Leaf crown', stars: 55, season: 'fall' },
  { id: 'hextra-cocoa', slot: 'helperExtra', label: 'Hot cocoa', stars: 30, season: 'fall' },
  // Thanksgiving set
  { id: 'color-cranberry', slot: 'color', label: 'Cranberry', stars: 35, season: 'thanksgiving' },
  { id: 'hat-pilgrim', slot: 'hat', label: 'Pilgrim hat', stars: 50, season: 'thanksgiving' },
  { id: 'extra-turkey', slot: 'extra', label: 'Turkey feathers', stars: 80, season: 'thanksgiving' },
  { id: 'hfur-harvest', slot: 'helperFur', label: 'Golden harvest', stars: 45, season: 'thanksgiving' },
  { id: 'hhat-pilgrim', slot: 'helperHat', label: 'Pilgrim hat', stars: 50, season: 'thanksgiving' },
  { id: 'hextra-pie', slot: 'helperExtra', label: 'Pumpkin pie', stars: 35, season: 'thanksgiving' },
  // Winter set
  { id: 'color-frost', slot: 'color', label: 'Frost', stars: 35, season: 'winter' },
  { id: 'hat-pompom', slot: 'hat', label: 'Pom-pom hat', stars: 30, season: 'winter' },
  { id: 'hat-earmuffs', slot: 'hat', label: 'Earmuffs', stars: 40, season: 'winter' },
  { id: 'extra-snowflakes', slot: 'extra', label: 'Snowflakes', stars: 70, season: 'winter' },
  { id: 'hfur-frost', slot: 'helperFur', label: 'Frost', stars: 45, season: 'winter' },
  { id: 'hhat-earmuffs', slot: 'helperHat', label: 'Earmuffs', stars: 40, season: 'winter' },
  { id: 'hextra-snowman', slot: 'helperExtra', label: 'Little snowman', stars: 45, season: 'winter' },
  // Christmas set
  { id: 'color-evergreen', slot: 'color', label: 'Evergreen', stars: 40, season: 'christmas' },
  { id: 'hat-santa', slot: 'hat', label: 'Santa hat', stars: 60, season: 'christmas' },
  { id: 'hat-antlers', slot: 'hat', label: 'Reindeer antlers', stars: 50, season: 'christmas' },
  { id: 'face-rudolph', slot: 'face', label: 'Red nose', stars: 30, season: 'christmas' },
  { id: 'extra-lights', slot: 'extra', label: 'Twinkle lights', stars: 75, season: 'christmas' },
  { id: 'hfur-gingerbread', slot: 'helperFur', label: 'Gingerbread', stars: 55, season: 'christmas' },
  { id: 'hhat-santa', slot: 'helperHat', label: 'Santa hat', stars: 60, season: 'christmas' },
  { id: 'hextra-present', slot: 'helperExtra', label: 'Present', stars: 40, season: 'christmas' },
  // Celebration style
  { id: 'mode-normal', slot: 'mode', label: 'Normal', stars: 0 },
  { id: 'mode-crazy', slot: 'mode', label: 'Crazy Mode', stars: 75 },
  { id: 'mode-flood', slot: 'mode', label: 'Flood Mode', stars: 500 },
  { id: 'mode-retro', slot: 'mode', label: 'Retro Mode', stars: 500 },
  { id: 'mode-disco', slot: 'mode', label: 'Disco Mode', stars: 500 },
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

export const HELPER_NAMES: Record<string, string> = { 'helper-fox': 'Pip', 'helper-wolf': 'Luna', 'helper-horse': 'Maple', 'helper-bear': 'Popsicle', 'helper-dragon': 'Ember', 'helper-unicorn': 'Stardust' };
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
