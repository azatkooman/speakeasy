import { AppLanguage } from '../types';

/**
 * The starter vocabulary a new board is seeded with.
 *
 * ── Why this file exists, and what it is not ──────────────────────────────────
 *
 * This is clinical content sitting in a code file. It is a defensible starting
 * point, not a finished vocabulary, and it is deliberately kept in one place so
 * a speech and language therapist can revise every word without touching any
 * code around it.
 *
 * The word set is not invented. It is drawn from the published consensus on
 * core vocabulary — the small, mostly non-noun set that accounts for the large
 * majority of what anyone says, and which converges strongly across the usual
 * sources (Banajee, DiCarlo & Stricklin 2003 on toddler core; the ~36-word
 * universal core used by Project Core; Fried-Oken & More). Where those lists
 * agree, that agreement is what is seeded here. The fringe words per folder are
 * ordinary high-frequency items for a young child's day and carry no such
 * pedigree; they are the part most worth an SLP replacing first.
 *
 * ── The property that must not be broken ──────────────────────────────────────
 *
 * `id` is the stable identity and `vocab.<id>` is the translation key. Position
 * comes from the order in these arrays, and neither depends on language. That
 * is what lets a board switch between English, Russian, French and Spanish and
 * re-label every cell *in place* — the same word stays under the same finger.
 * A bilingual child, or one moving between home and school languages, keeps
 * their motor plan. Reorder these arrays and you move cards for existing users;
 * add to the end instead.
 *
 * ── Translations ──────────────────────────────────────────────────────────────
 *
 * Single words, in the register a child would use, not literal dictionary
 * glosses. Three known compromises a native-speaking SLP should settle:
 *
 *  - Verbs are infinitives in ru/fr/es, which is the common AAC convention but
 *    reads less naturally than a first-person or imperative form would.
 *  - Adjectives are masculine singular in ru/fr/es. A girl's board says
 *    `счастливый`, not `счастливая`. The word-forms feature on each card is
 *    where that gets fixed per child.
 *  - `mañana` is both "tomorrow" and "morning" in Spanish, so morning is
 *    `por la mañana` to keep the two cells distinct.
 */

export interface VocabEntry {
  /** Stable identity. Also the translation key suffix. Never change or reuse. */
  id: string;
  /** ARASAAC pictogram id. Bundled at build time by scripts/fetch-pictograms.mjs. */
  arasaac: number;
  /** Fitzgerald colour. Omitted inside a folder, where the folder's colour applies. */
  color?: string;
  labels: Record<AppLanguage, string>;
}

const e = (
  id: string,
  arasaac: number,
  en: string, ru: string, fr: string, es: string,
  color?: string,
): VocabEntry => ({ id, arasaac, color, labels: { en, ru, fr, es } });

/**
 * The core rail: on screen in every folder. These are the words a child needs
 * most often and should never have to navigate to. Around 80% of what anyone
 * says comes from a set this size, which is the whole argument for the rail.
 */
export const CORE_RAIL: VocabEntry[] = [
  e('i_want', 5441, 'I want',      'Я хочу',      'Je veux',      'Quiero',       'green'),
  e('more', 5508, 'more',        'ещё',         'encore',       'más',          'blue'),
  e('help', 32648, 'help',        'помоги',      'aide',         'ayuda',        'green'),
  e('like', 37826, 'I like',      'нравится',    "J'aime",       'Me gusta',     'green'),
  e('dont_like', 37825, "I don't like",'не нравится', "J'aime pas",   'No me gusta',  'red'),
  e('finished', 28429, 'finished',    'всё',         'fini',         'terminado',    'blue'),
  e('again', 37163, 'again',       'ещё раз',     'encore',       'otra vez',     'blue'),
  e('yes', 5584, 'Yes',         'Да',          'Oui',          'Sí',           'green'),
  e('no', 5526, 'No',          'Нет',         'Non',          'No',           'red'),
  e('stop', 7196, 'Stop',        'Стоп',        'Arrête',       'Para',         'red'),
];

/** Folder contents, keyed by the folder ids in DEFAULT_CATEGORIES_TEMPLATE. */
export const FOLDER_VOCAB: Record<string, VocabEntry[]> = {
  PEOPLE: [
    e('i', 6632, 'I',        'я',        'je',          'yo'),
    e('you', 6625, 'you',      'ты',       'tu',          'tú'),
    e('we', 7185, 'we',       'мы',       'nous',        'nosotros'),
    e('mum', 2458, 'mum',      'мама',     'maman',       'mamá'),
    e('dad', 2497, 'dad',      'папа',     'papa',        'papá'),
    e('baby', 6060, 'baby',     'малыш',    'bébé',        'bebé'),
    e('friend', 25790, 'friend',   'друг',     'ami',         'amigo'),
    e('teacher', 6556, 'teacher',  'учитель',  'enseignant',  'profesor'),
    e('boy', 7176, 'boy',      'мальчик',  'garçon',      'niño'),
    e('girl', 27509, 'girl',     'девочка',  'fille',       'niña'),
  ],
  VERB: [
    e('go', 8142, 'go',       'идти',     'aller',       'ir'),
    e('come', 32669, 'come',     'прийти',   'venir',       'venir'),
    e('eat', 6456, 'eat',      'есть',     'manger',      'comer'),
    e('drink', 6061, 'drink',    'пить',     'boire',       'beber'),
    e('play', 23392, 'play',     'играть',   'jouer',       'jugar'),
    e('look', 6564, 'look',     'смотреть', 'regarder',    'mirar'),
    e('open', 24825, 'open',     'открыть',  'ouvrir',      'abrir'),
    e('give', 28431, 'give',     'дать',     'donner',      'dar'),
    e('make', 32751, 'make',     'делать',   'faire',       'hacer'),
    e('sleep', 6479, 'sleep',    'спать',    'dormir',      'dormir'),
  ],
  NOUN: [
    e('toy', 9813, 'toy',      'игрушка',  'jouet',       'juguete'),
    e('ball', 3241, 'ball',     'мяч',      'ballon',      'pelota'),
    e('book', 25191, 'book',     'книга',    'livre',       'libro'),
    e('car', 2339, 'car',      'машина',   'voiture',     'coche'),
    e('phone', 26479, 'phone',    'телефон',  'téléphone',   'teléfono'),
    e('shoes', 2775, 'shoes',    'обувь',    'chaussures',  'zapatos'),
    e('bed', 25900, 'bed',      'кровать',  'lit',         'cama'),
    e('chair', 3155, 'chair',    'стул',     'chaise',      'silla'),
    e('tv', 25498, 'TV',       'телевизор','télé',        'televisión'),
    e('bag', 23849, 'bag',      'сумка',    'sac',         'bolsa'),
  ],
  ADJECTIVE: [
    e('big', 4658, 'big',      'большой',  'grand',       'grande'),
    e('little', 4716, 'little',   'маленький','petit',       'pequeño'),
    e('hot', 2300, 'hot',      'горячий',  'chaud',       'caliente'),
    e('cold', 4652, 'cold',     'холодный', 'froid',       'frío'),
    e('good', 4581, 'good',     'хороший',  'bon',         'bueno'),
    e('bad', 5504, 'bad',      'плохой',   'mauvais',     'malo'),
    e('happy', 35533, 'happy',    'счастливый','content',    'contento'),
    e('sad', 35545, 'sad',      'грустный', 'triste',      'triste'),
    e('tired', 35537, 'tired',    'усталый',  'fatigué',     'cansado'),
    e('hurt', 30620, 'it hurts', 'больно',   'mal',         'duele'),
  ],
  SOCIAL: [
    e('hello', 6522, 'hello',      'привет',        'bonjour',        'hola'),
    e('goodbye', 6028, 'goodbye',    'пока',          'au revoir',      'adiós'),
    e('please', 8195, 'please',     'пожалуйста',    "s'il te plaît",  'por favor'),
    e('thanks', 8129, 'thank you',  'спасибо',       'merci',          'gracias'),
    e('sorry', 11625, 'sorry',      'извини',        'pardon',         'perdón'),
    e('my_turn', 7158, 'my turn',    'моя очередь',   'à moi',          'me toca'),
    e('your_turn', 6006, 'your turn',  'твоя очередь',  'à toi',          'te toca'),
    e('love_you', 11519, 'I love you', 'я тебя люблю',  "je t'aime",      'te quiero'),
    e('funny', 24733, 'funny',      'смешно',        'drôle',          'divertido'),
    e('what', 22620, 'what?',      'что?',          'quoi ?',         '¿qué?'),
  ],
  PLACES: [
    e('home', 6964, 'home',     'дом',      'maison',      'casa'),
    e('school', 32446, 'school',   'школа',    'école',       'escuela'),
    e('outside', 5475, 'outside',  'на улице', 'dehors',      'fuera'),
    e('inside', 5439, 'inside',   'внутри',   'dedans',      'dentro'),
    e('toilet', 5921, 'toilet',   'туалет',   'toilettes',   'baño'),
    e('park', 5379, 'park',     'парк',     'parc',        'parque'),
    e('shop', 35695, 'shop',     'магазин',  'magasin',     'tienda'),
    e('bedroom', 5988, 'bedroom',  'спальня',  'chambre',     'dormitorio'),
    e('kitchen', 10752, 'kitchen',  'кухня',    'cuisine',     'cocina'),
    e('garden', 2974, 'garden',   'сад',      'jardin',      'jardín'),
  ],
  FOOD: [
    e('water', 32464, 'water',     'вода',      'eau',        'agua'),
    e('milk', 2445, 'milk',      'молоко',    'lait',       'leche'),
    e('juice', 11461, 'juice',     'сок',       'jus',        'zumo'),
    e('apple', 2462, 'apple',     'яблоко',    'pomme',      'manzana'),
    e('banana', 2530, 'banana',    'банан',     'banane',     'plátano'),
    e('bread', 2494, 'bread',     'хлеб',      'pain',       'pan'),
    e('biscuit', 8312, 'biscuit',   'печенье',   'biscuit',    'galleta'),
    e('cheese', 2541, 'cheese',    'сыр',       'fromage',    'queso'),
    e('pasta', 8652, 'pasta',     'макароны',  'pâtes',      'pasta'),
    e('ice_cream', 3348, 'ice cream', 'мороженое', 'glace',      'helado'),
  ],
  TIME: [
    e('now', 32747, 'now',      'сейчас',   'maintenant',  'ahora'),
    e('later', 13080, 'later',    'потом',    'plus tard',   'luego'),
    e('today', 7131, 'today',    'сегодня',  "aujourd'hui", 'hoy'),
    e('tomorrow', 38278, 'tomorrow', 'завтра',   'demain',      'mañana'),
    e('morning', 25704, 'morning',  'утро',     'matin',       'por la mañana'),
    e('night', 26997, 'night',    'ночь',     'nuit',        'noche'),
    e('wait', 36914, 'wait',     'ждать',    'attendre',    'esperar'),
    e('soon', 33044, 'soon',     'скоро',    'bientôt',     'pronto'),
    e('before', 32745, 'before',   'до',       'avant',       'antes'),
    e('after', 7818, 'after',    'после',    'après',       'después'),
  ],
};

/** Every entry, rail and folders alike. */
export const ALL_VOCAB: VocabEntry[] = [
  ...CORE_RAIL,
  ...Object.values(FOLDER_VOCAB).flat(),
];

/** `vocab.<id>` → label, for the language asked for. Used by getTranslation. */
export const vocabLabel = (key: string, lang: AppLanguage): string | undefined => {
  const id = key.startsWith('vocab.') ? key.slice('vocab.'.length) : undefined;
  if (!id) return undefined;
  const entry = ALL_VOCAB.find(v => v.id === id);
  return entry?.labels[lang] ?? entry?.labels.en;
};
