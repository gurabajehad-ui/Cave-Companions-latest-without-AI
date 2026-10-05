/**
 * Phase 5 Advanced Multilingual & Roman-Bangla Normalization Engine
 * 
 * Preserves Native Bengali and Arabic Unicode, strips hidden zero-width obfuscation,
 * de-obfuscates letter spacing, punctuation insertion, character elongation,
 * leetspeak homoglyphs, and computes phonetic Roman-Bengali projection for dual AI analysis.
 */

export interface NormalizedTextResult {
  original: string;
  cleaned: string;
  normalizedForAnalysis: string;
  phoneticProjection: string;
  hasBengaliScript: boolean;
  hasObfuscation: boolean;
  isValid: boolean;
  rejectReason?: string;
}

export const MAX_TEXT_MESSAGE_LENGTH = 2000;

// Bengali Unicode to Roman phonetic mapping table
const BENGALI_TO_ROMAN_MAP: Record<string, string> = {
  // Independent Vowels
  'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u', 'ঊ': 'u', 'ঋ': 'ri',
  'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou',
  // Vowel signs (Kar)
  'া': 'a', 'ি': 'i', 'ী': 'i', 'ু': 'u', 'ূ': 'u', 'ৃ': 'ri',
  'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou',
  // Modifiers
  '্': '', 'ৎ': 't', 'ং': 'ng', 'ঃ': 'h', 'ঁ': '',
  // Consonants
  'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
  'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'n',
  'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
  'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
  'প': 'p', 'ফ': 'ph', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
  'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h',
  'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y'
};

/**
 * Phonetically transliterate native Bengali script to Roman-Bengali
 */
export function transliterateBengaliToRoman(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    result += BENGALI_TO_ROMAN_MAP[ch] !== undefined ? BENGALI_TO_ROMAN_MAP[ch] : ch;
  }
  return result;
}

/**
 * De-obfuscate spaced characters and punctuation insertion inside words
 * e.g., "m a r b o" -> "marbo", "k-u-t-t-a" -> "kutta", "কু ত্ত া" -> "কুত্তা"
 */
export function collapseSpacedAndPunctuationWords(text: string): string {
  let s = text;

  // 1. Remove punctuation inserted between characters within words (e.g. "k-u-t-t-a", "m_a_r_b_o", "s.h.u.o.r", "ম_ে_র_ে")
  s = s.replace(/([a-zA-Z0-9@\$!\u0980-\u09FF])[-._*~/|\\]+(?=[a-zA-Z0-9@\$!\u0980-\u09FF])/g, '$1');

  // 2. Collapse detached Bengali vowel signs / hasant: "কু ্ত া" or "কু া"
  s = s.replace(/([\u0980-\u09FF])\s+([\u09BE-\u09CD\u09D7])/g, '$1$2');

  // 3. Handle intentionally spaced single characters while preserving word boundaries
  // If words are separated by double/multiple spaces (e.g. 'ম ে র ে  ফ ে ল ব' or 'm a r b o  t o r e')
  if (/ {2,}/.test(s)) {
    const parts = s.split(/ {2,}/);
    s = parts.map(p => {
      return p.replace(/\s+/g, '');
    }).join(' ');
  } else {
    // Join spaced Latin single letters: "m a r b o" -> "marbo"
    s = s.replace(/\b([a-zA-Z0-9@\$!])(?:\s+([a-zA-Z0-9@\$!]))+\b/g, (match) => {
      return match.replace(/\s+/g, '');
    });
    // Join spaced Bengali syllables: "কু ত্ত া" -> "কুত্তা", "ম ে র ে" -> "মেরে"
    s = s.replace(/(?:^|\s)([\u0980-\u09FF]{1,2})\s+([\u0980-\u09FF]{1,4})(?=\s|$)/g, (m, a, b) => ' ' + a + b).trim();
  }

  return s;
}

/**
 * Collapse excessive character repetitions (elongation de-duplication)
 * e.g., "baaaaje" -> "baje", "maaaarbo" -> "marbo", "কুউউত্তা" -> "কুত্তা", "গাআআলি" -> "গালি"
 */
export function collapseRepeatedCharacters(text: string): string {
  // Replace 3 or more consecutive identical characters with at most 1 (preserves double letters where legitimate)
  const s = text.replace(/(.)\1{2,}/gu, '$1');
  return s;
}

/**
 * Decode leetspeak and normalize common Roman-Bengali spelling variants
 */
export function normalizeLeetspeakAndVariants(text: string): string {
  let s = text.toLowerCase();

  // Leetspeak & homoglyph conversions
  s = s
    .replace(/[@4]/g, 'a')
    .replace(/[\$5]/g, 's')
    .replace(/[0]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[7]/g, 't')
    .replace(/[8]/g, 'b')
    .replace(/[9]/g, 'g');

  // Roman-Bengali phonetic variant harmonizations (without destroying common English words)
  // e.g., "maarbo" -> "marbo", "gaali" -> "gali", "baaje" -> "baje"
  s = s
    .replace(/\b([a-z]+)aa([a-z]+)\b/g, '$1a$2')
    .replace(/\bkhoon\b/g, 'khun')
    .replace(/\bshoo+or\b/g, 'shuor')
    .replace(/\bsuor\b/g, 'shuor')
    .replace(/\bsoo+or\b/g, 'shuor')
    .replace(/\bfelbo\b/g, 'phelbo')
    .replace(/\bmaarbo\b/g, 'marbo')
    .replace(/\bgaali\b/g, 'gali')
    .replace(/\bbaaje\b/g, 'baje')
    .replace(/\bmaderchod\b/g, 'madarchod')
    .replace(/\bmodarchod\b/g, 'madarchod')
    .replace(/\bkhankir\b/g, 'khankir')
    .replace(/\bkuttar?\b/g, 'kutta')
    .replace(/\bbaccha\b/g, 'bachcha')
    .replace(/\bbaacha\b/g, 'bachcha')
    .replace(/\bchutya\b/g, 'chutiya')
    .replace(/\bshala\b/g, 'shala')
    .replace(/\bsala\b/g, 'shala')
    .replace(/\bharaami\b/g, 'harami');

  // Harmonize Bengali distorted spelling variants
  s = s
    .replace(/শূয়োর|শূওর|শুওর/g, 'শুয়োর')
    .replace(/মাদারচুদ/g, 'মাদারচোদ')
    .replace(/খানকী/g, 'খানকি')
    .replace(/বেশ্যামাগী/g, 'বেশ্যা মাগী');

  return s;
}

/**
 * Main Text Sanitization & Normalization function
 */
export function sanitizeAndNormalizeText(rawText: any): NormalizedTextResult {
  if (rawText === undefined || rawText === null) {
    return {
      original: '',
      cleaned: '',
      normalizedForAnalysis: '',
      phoneticProjection: '',
      hasBengaliScript: false,
      hasObfuscation: false,
      isValid: false,
      rejectReason: 'মেসেজ খালি বা অনুপস্থিত (Message is empty)'
    };
  }

  if (typeof rawText !== 'string') {
    return {
      original: String(rawText),
      cleaned: '',
      normalizedForAnalysis: '',
      phoneticProjection: '',
      hasBengaliScript: false,
      hasObfuscation: false,
      isValid: false,
      rejectReason: 'মেসেজের ফরম্যাট সঠিক নয় (Invalid message format)'
    };
  }

  const original = rawText;

  // 1. Remove dangerous unprintable ASCII and zero-width obfuscation characters
  // Preserves \n, \r, \t, but removes zero-width spaces (\u200B-\u200D), BOM (\uFEFF)
  const strippedControlChars = original.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\uFEFF]/g, '');

  // 2. Unicode NFKC normalization
  let normalizedNfkc = '';
  try {
    normalizedNfkc = strippedControlChars.normalize('NFKC');
  } catch {
    normalizedNfkc = strippedControlChars;
  }

  // 3. Trim and length validation
  const cleaned = normalizedNfkc.trim();

  if (cleaned.length === 0) {
    return {
      original,
      cleaned: '',
      normalizedForAnalysis: '',
      phoneticProjection: '',
      hasBengaliScript: false,
      hasObfuscation: false,
      isValid: false,
      rejectReason: 'মেসেজে কোনো দৃশ্যমান অক্ষর নেই (Message cannot be empty or whitespace only)'
    };
  }

  if (cleaned.length > MAX_TEXT_MESSAGE_LENGTH) {
    return {
      original,
      cleaned: cleaned.slice(0, MAX_TEXT_MESSAGE_LENGTH),
      normalizedForAnalysis: '',
      phoneticProjection: '',
      hasBengaliScript: false,
      hasObfuscation: false,
      isValid: false,
      rejectReason: `মেসেজটি অত্যধিক দীর্ঘ (সর্বোচ্চ ${MAX_TEXT_MESSAGE_LENGTH} অক্ষর অনুমোদিত)`
    };
  }

  // Detect script presence
  const hasBengaliScript = /[\u0980-\u09FF]/.test(cleaned);

  // 4. Build de-obfuscated text for deterministic and AI analysis
  let deobfuscated = collapseSpacedAndPunctuationWords(cleaned);
  deobfuscated = collapseRepeatedCharacters(deobfuscated);
  const normalizedForAnalysis = normalizeLeetspeakAndVariants(deobfuscated);

  const hasObfuscation = cleaned.length !== normalizedForAnalysis.length || deobfuscated !== cleaned;

  // 5. Build Phonetic Roman projection if Bengali script is detected
  let phoneticProjection = '';
  if (hasBengaliScript) {
    const rawPhonetic = transliterateBengaliToRoman(normalizedForAnalysis);
    phoneticProjection = collapseRepeatedCharacters(normalizeLeetspeakAndVariants(rawPhonetic));
  }

  return {
    original,
    cleaned,
    normalizedForAnalysis,
    phoneticProjection,
    hasBengaliScript,
    hasObfuscation,
    isValid: true
  };
}
