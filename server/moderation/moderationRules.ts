import { ModerationCategory } from './moderationTypes.js';

export interface DeterministicRule {
  id: string;
  category: ModerationCategory;
  pattern: RegExp;
  weight: number; // 0.1 to 1.0 (Contribution to risk score)
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Islamic Fiqh, Jurisprudence, Education & Religious Context Terms
 * When these contextual markers are present, ambiguous terms must NOT result in a severe BLOCK.
 */
export const ISLAMIC_FIQH_EDUCATIONAL_MARKERS: RegExp[] = [
  /(গোসল|পবিত্রতা|তাহারা|তাহরাত|তায়াম্মুম|অজু|ওযু)/i,
  /\b(ghusl|taharah|taharat|wudu|tayammum|purification)\b/i,
  /(নিকাহ|বিবাহ|মোহরানা|দেনমোহর|মহর|তালাক|ইদ্দত|খোলা)/i,
  /\b(nikah|marriage|mahr|dowry|talaq|divorce|iddah|khula)\b/i,
  /(আওরাত|সতর|পর্দা|হায়া|লজ্জাশীলতা|শালীনতা)/i,
  /\b(awrah|satr|hijab|haya|modesty)\b/i,
  /(হায়েয|হায়েজ|নেফাস|ইস্তেহাজা|স্বপ্নদোষ|বীর্যপাত|ফরজ গোসল)/i,
  /\b(haidh|nifas|menstruation|wet dream|janabah|impurity)\b/i,
  /(মাসআলা|মাসয়ালা|মাসলা|ফতোয়া|ফতওয়া|শরীয়ত|শরিয়াহ|বিধান|হুকুম|ফুকাহা)/i,
  /\b(masala|mas'ala|fatwa|shariah|shariat|fiqh|jurisprudence|ruling|hukum)\b/i,
  /(কুরআন|হাদিস|সুন্নাহ|তাফসির|বুখারী|মুসলিম|তিরমিযী|আবু দাউদ|ইবনে মাজাহ|নাসায়ী)/i,
  /\b(quran|hadith|sunnah|tafsir|bukhari|muslim|tirmidhi|abu dawud|ibn majah)\b/i,
  /(হালাল|হারাম|মাকরূহ|মুস্তাহাব|ওয়াজিব|ফরজ|জায়েয|নাজায়েয)/i,
  /\b(halal|haram|makruh|mustahabb|wajib|fard|permissible|impermissible)\b/i,
  /(জানতে চাই|প্রশ্ন ছিল|অনুরোধ|শিক্ষামূলক|আলোচনা|সাহায্য চাই|ব্যাখ্যা)/i,
  /\b(question|inquiry|educational|clarification|ruling on|hadith regarding)\b/i,
  /(আসসালামু\s*আলাইকুম|সালাম|জাযাকাল্লাহ|সুবহানাল্লাহ|আলহামদুলিল্লাহ|মাশাল্লাহ)/i,
  /\b(assalamu\s*alaikum|salam|jazakallah|alhamdulillah|subhanallah|mashaallah)\b/i
];

/**
 * Deterministic Rules Database for Phase 2 Moderation
 */
export const DETERMINISTIC_RULES: DeterministicRule[] = [
  // -------------------------------------------------------------
  // 1. EXPLICIT SEXUAL CONTENT / PORNOGRAPHY / EXTREME VULGARITY
  // -------------------------------------------------------------
  {
    id: 'SEX_01_PORN_SITES',
    category: 'EXPLICIT_SEXUAL',
    pattern: /(pornhub|xvideos|xnxx|xhamster|redtube|youporn|brazzers|onlyfans|cam4|chaturbate|erome)/i,
    weight: 0.95,
    description: 'Explicit adult entertainment website link or reference',
    severity: 'CRITICAL'
  },
  {
    id: 'SEX_02_HARDCORE_EXPLICIT_EN',
    category: 'EXPLICIT_SEXUAL',
    pattern: /\b(hardcore porn|watch porn|sex video link|nude video|free nudes|send nudes|cumshot|gangbang|creampie video)\b/i,
    weight: 0.90,
    description: 'Explicit pornography solicitation or sharing',
    severity: 'CRITICAL'
  },
  {
    id: 'SEX_03_HARDCORE_EXPLICIT_BN',
    category: 'EXPLICIT_SEXUAL',
    pattern: /(চটি গল্প|চটি বই|পর্ন ভিডিও|নগ্ন ভিডিও|সেক্স ভিডিও লিংক|পর্নোগ্রাফি|নগ্ন ছবি চাই)/i,
    weight: 0.90,
    description: 'Explicit adult pornography terms in Bengali',
    severity: 'CRITICAL'
  },
  {
    id: 'SEX_04_HARDCORE_ROMAN_BN',
    category: 'EXPLICIT_SEXUAL',
    pattern: /\b(choti golpo|choti boi|nude chobi|sex video link|porn video bd|hot boudi sex)\b/i,
    weight: 0.90,
    description: 'Explicit adult pornography terms in Roman Bengali',
    severity: 'CRITICAL'
  },

  // -------------------------------------------------------------
  // 2. HARASSMENT / DIRECT THREATS / PERSONAL ATTACKS
  // -------------------------------------------------------------
  {
    id: 'HARASS_01_DEATH_THREAT_EN',
    category: 'HARASSMENT',
    pattern: /\b(kill you|murder you|slit your throat|stab you|hunt down.*kill|beat you to death)\b/i,
    weight: 0.95,
    description: 'Direct physical violence or death threat in English',
    severity: 'CRITICAL'
  },
  {
    id: 'HARASS_02_DEATH_THREAT_BN',
    category: 'HARASSMENT',
    pattern: /(মেরে ফেলব|খুন করব|গলা কেটে|জবাই করে|জবাই করে দেব|লাশ গুম|বাড়ি গিয়ে মারব|তোরে শেষ করে|তোকে শেষ করে|জ্যান্ত কবর)/i,
    weight: 0.95,
    description: 'Direct physical violence or death threat in Bengali',
    severity: 'CRITICAL'
  },
  {
    id: 'HARASS_03_DOXXING_INTENT',
    category: 'HARASSMENT',
    pattern: /(\bdoxx you\b|\bleak your personal info\b|\bleak your address\b|ভাইরাল করে দেব|তোর ঠিকানা ফাঁস করব)/i,
    weight: 0.85,
    description: 'Doxxing or blackmailing threat',
    severity: 'HIGH'
  },
  {
    id: 'HARASS_04_THREAT_ROMAN_BN',
    category: 'HARASSMENT',
    pattern: /\b(tore|toke|tomare)?\s*.*(mere phelbo|mere felbo|gala kete|jobai|khun|shesh korbo|marbo tore|marbo toke|toke marbo|marbo)\b/i,
    weight: 0.95,
    description: 'Direct physical violence or death threat in Roman Bengali',
    severity: 'CRITICAL'
  },
  {
    id: 'HARASS_05_DEATH_THREAT_AR',
    category: 'HARASSMENT',
    pattern: /(سأقتلك|أقتلك|ابن الكلب)/i,
    weight: 0.95,
    description: 'Direct threat in Arabic',
    severity: 'CRITICAL'
  },

  // -------------------------------------------------------------
  // 3. HATE & ABUSIVE LANGUAGE
  // -------------------------------------------------------------
  {
    id: 'HATE_01_SLURS_ABUSE_EN',
    category: 'HATE_ABUSE',
    pattern: /\b(retarded bastard|motherfucker|fucking whore|die in hell bitch|subhuman scum|shut up idiot)\b/i,
    weight: 0.85,
    description: 'Severe abusive and derogatory harassment',
    severity: 'HIGH'
  },
  {
    id: 'HATE_02_SLURS_ABUSE_BN',
    category: 'HATE_ABUSE',
    pattern: /(খানকির পোলা|মাদারচোদ|বেশ্যা মাগী|চুদানির পোলা|শুয়োরের বাচ্চা|জারজ সন্তান|কুত্তা)/i,
    weight: 0.88,
    description: 'Severe abusive Bengali vulgarity/slurs',
    severity: 'HIGH'
  },
  {
    id: 'HATE_03_SLURS_ABUSE_ROMAN_BN',
    category: 'HATE_ABUSE',
    pattern: /\b(khankir pola|madarchod|chudanir pola|shuorer bachcha|suorer bachcha|beshya magi|harami kutta|kuttar baccha|kutta|magir pola|bokachoda)\b/i,
    weight: 0.88,
    description: 'Severe abusive Roman Bengali vulgarity/slurs',
    severity: 'HIGH'
  },

  // -------------------------------------------------------------
  // 4. MALICIOUS LINKS / IP LOGGERS / PHISHING
  // -------------------------------------------------------------
  {
    id: 'MAL_01_IP_LOGGER',
    category: 'MALICIOUS_LINK',
    pattern: /(grabify|iplogger|2no\.co|blasze|yip\.su|iplis\.ru)/i,
    weight: 0.95,
    description: 'Known IP logger or tracking phishing service',
    severity: 'CRITICAL'
  },
  {
    id: 'MAL_02_SUSPICIOUS_SHORTENER',
    category: 'MALICIOUS_LINK',
    pattern: /\b(bit\.do|cutt\.us|tiny\.cc\/[a-z0-9_\-]+|adf\.ly|shorte\.st)\b/i,
    weight: 0.65,
    description: 'High-risk ad/malware redirection URL shortener',
    severity: 'MEDIUM'
  },
  {
    id: 'MAL_03_LOGIN_PHISH',
    category: 'MALICIOUS_LINK',
    pattern: /(free[-_ ]*cash|free[-_ ]*bkash|free[-_ ]*recharge|freebkash|free-crypto|babu88|babubb|hack\.xyz|\.xyz)/i,
    weight: 0.90,
    description: 'Known financial or credential phishing URL pattern',
    severity: 'CRITICAL'
  },

  // -------------------------------------------------------------
  // 5. SPAM / FLOODING / CRYPTO & CASINO SCAMS
  // -------------------------------------------------------------
  {
    id: 'SPAM_01_CASINO_GAMBLING',
    category: 'SPAM',
    pattern: /\b(babu88|1xbet|melbet|jeetbuzz|bet365|online casino|জুয়া সাইট|অনলাইন ক্যাসিনো|বাজি ধরুন)\b/i,
    weight: 0.85,
    description: 'Online betting, casino, and gambling promotion',
    severity: 'HIGH'
  },
  {
    id: 'SPAM_02_EARN_MONEY_QUICK',
    category: 'SPAM',
    pattern: /\b(ঘরে বসে প্রতিদিন \d+ টাকা আয়|বিনা পুঁজিতে দৈনিক ইনকাম|ক্লিক করলেই টাকা|guaranteed \d+x profit|double your crypto|daily \d+ taka income|income guaranteed)\b/i,
    weight: 0.80,
    description: 'Get-rich-quick financial scam spam',
    severity: 'HIGH'
  },
  {
    id: 'SPAM_03_EXCESSIVE_REPETITION',
    category: 'SPAM',
    pattern: /(.)\1{12,}/i,
    weight: 0.40,
    description: 'Excessive single-character repetition flooding',
    severity: 'LOW'
  },
  {
    id: 'SPAM_04_CASINO_ROMAN_BN',
    category: 'SPAM',
    pattern: /\b(babu88|jeetbuzz|1xbet|melbet|bina pujite income|ghore boshe taka ay|daily \d+ taka income)\b/i,
    weight: 0.85,
    description: 'Online betting, casino, and get-rich-quick scams in Roman Bengali',
    severity: 'HIGH'
  },

  // -------------------------------------------------------------
  // 6. INAPPROPRIATE SOLICITATION
  // -------------------------------------------------------------
  {
    id: 'SOLICIT_01_COMMERCIAL_ESCORT',
    category: 'INAPPROPRIATE_SOLICITATION',
    pattern: /\b(escort service|call girls dhaka|call girl bd|রুম ডেট|নাইট ডেট|এসকর্ট সার্ভিস)\b/i,
    weight: 0.95,
    description: 'Prostitution or escort service solicitation',
    severity: 'CRITICAL'
  },
  {
    id: 'SOLICIT_02_ESCORT_ROMAN_BN',
    category: 'INAPPROPRIATE_SOLICITATION',
    pattern: /\b(call girl dhaka|call girl bd|room date|night date|escort dhaka)\b/i,
    weight: 0.95,
    description: 'Prostitution or escort service solicitation in Roman Bengali',
    severity: 'CRITICAL'
  }
];
