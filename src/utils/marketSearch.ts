import { Product } from '../types';

/**
 * Normalizes Bangla and English text for forgiving, partial, and fuzzy matching.
 * Converts characters to simplified base forms (e.g. interchangeable vowels and consonants).
 */
export function normalizeSearchText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    // Remove zero-width characters and invisible unicode marks
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Normalize special punctuation, symbols, brackets, and extra spaces
    .replace(/[।,\-_:;!?'"`()[\]{}|/\\#@$%^&*+=~<>]/g, ' ')
    // Normalize interchangeable Bengali vowels, consonants, and diacritics
    .replace(/ী/g, 'ি')
    .replace(/ূ/g, 'ু')
    .replace(/ণ/g, 'ন')
    .replace(/ষ/g, 'স')
    .replace(/শ/g, 'স')
    .replace(/ড়/g, 'র')
    .replace(/ঢ়/g, 'র')
    .replace(/য়/g, 'য')
    .replace(/ৎ/g, 'ত')
    .replace(/ঁ/g, '') // Chandrabindu normalization (e.g. খাঁটি -> খাটি)
    .replace(/ঃ/g, '') // Bishorgo normalization
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Phonetic / Semantic synonym dictionary mapping English words or transliterations
 * to Bengali concepts and vice-versa.
 */
const SYNONYMS_MAP: Record<string, string[]> = {
  // Books & Islamic
  'বই': ['book', 'books', 'boi', 'kitab', 'কিতাব', 'গ্রন্হ', 'গ্রন্থ', 'সাহিত্য', 'উপন্যাস', 'উপনাস', 'ইসলামিক'],
  'book': ['বই', 'boi', 'kitab', 'কিতাব', 'books'],
  'books': ['বই', 'boi', 'kitab', 'কিতাব', 'books'],
  'boi': ['বই', 'book', 'kitab', 'কিতাব'],
  'কুরআন': ['quran', 'koran', 'quranul', 'কোরআন', 'মুসহাফ', 'mushaf'],
  'quran': ['কুরআন', 'কোরআন', 'koran'],
  'হাদিস': ['hadith', 'hadis', 'bukhari', 'muslim', 'হাদীস'],
  'hadith': ['হাদিস', 'হাদীস', 'hadis'],
  'hadis': ['হাদিস', 'হাদীস'],
  'তাফসির': ['tafsir', 'tafseer', 'ব্যাখ্যা', 'তাফসীর'],
  'সিরাত': ['seerah', 'sirat', 'নবীর জীবনী'],

  // Food & Honey & Grocery
  'মধু': ['honey', 'modhu', 'modu', 'সুন্দরবন', 'খাটি মধু', 'খাঁটি'],
  'honey': ['মধু', 'modhu', 'modu'],
  'modhu': ['মধু', 'honey'],
  'খেজুর': ['date', 'dates', 'khejur', 'কেজুর', 'মরিয়ম', 'আজওয়া', 'ajwa', 'medjool', 'আম্বর'],
  'khejur': ['খেজুর', 'date', 'dates'],
  'dates': ['খেজুর', 'khejur'],
  'date': ['খেজুর', 'khejur'],
  'ঘি': ['ghee', 'ghi', 'ঘী', 'খাটি ঘি'],
  'ghee': ['ঘি', 'ghi', 'ঘী'],
  'তেল': ['oil', 'tel', 'সরিষা', 'সরিষার তেল', 'mustard', 'black seed', 'কালিজিরা', 'কালোজিরা'],
  'oil': ['তেল', 'tel'],
  'চাল': ['rice', 'chal', 'মিনিকেট', 'নাজিরশাইল', 'পোলাও'],
  'rice': ['চাল', 'chal', 'ভাত'],
  'খাবার': ['food', 'khabar', 'restaurant', 'বিরিয়ানি', 'বিরিয়ানি', 'বিরানি'],
  'food': ['খাবার', 'khabar', 'restaurant'],

  // Fashion & Attire
  'পোশাক': ['dress', 'cloth', 'clothes', 'clothing', 'fashion', 'poshak'],
  'পাঞ্জাবি': ['panjabi', 'punjabi', 'পাঞ্জাবী', 'পাঞ্জাব', 'পাঞ্জাবি'],
  'panjabi': ['পাঞ্জাবি', 'পাঞ্জাবী', 'punjabi'],
  'punjabi': ['পাঞ্জাবি', 'পাঞ্জাবী', 'panjabi'],
  'টুপি': ['tupi', 'topi', 'cap', 'namaj cap', 'নামাজের টুপি'],
  'tupi': ['টুপি', 'topi', 'cap'],
  'আতর': ['attar', 'ator', 'itor', 'perfume', 'সুগন্ধি', 'fragrance', 'oud', 'উদ'],
  'attar': ['আতর', 'ator', 'perfume', 'fragrance'],
  'ator': ['আতর', 'attar', 'perfume'],
  'perfume': ['আতর', 'attar', 'সুগন্ধি'],
  'বোরকা': ['burqa', 'borka', 'borqa', 'abaya', 'আবায়া', 'হিজাব', 'hijab'],
  'hijab': ['হিজাব', 'হিযাব', 'স্কার্ফ', 'হেডস্কার্ফ'],
  'তসবিহ': ['tasbih', 'tasbi', 'তাসবিহ', 'তাসবীহ'],
  'tasbih': ['তসবিহ', 'তাসবিহ', 'তাসবীহ'],

  // Electronics & Mobile
  'মোবাইল': ['mobile', 'phone', 'smartphone', 'স্মার্টফোন'],
  'ঘড়ি': ['watch', 'clock', 'ঘড়ি', 'smartwatch'],
  'ইলেকট্রনিক্স': ['electronics', 'gadget', 'চার্জার', 'হেডফোন', 'powerbank'],

  // Health & Medicine
  'ঔষধ': ['medicine', 'pharmacy', 'oushodh', 'ওষুধ', 'মেডিসিন', 'ড্রাগ'],
  'medicine': ['ঔষধ', 'ওষুধ', 'মেডিসিন', 'pharmacy']
};

export interface SearchShopContext {
  name?: string;
  nameBn?: string;
  category?: string;
  businessType?: string;
  district?: string;
  upazila?: string;
  area?: string;
}

/**
 * Calculates a match score for a product given a search term query.
 * Returns { matches: boolean, score: number }
 * High score indicates greater relevance. Supports partial words and substrings.
 */
export function calculateProductRelevance(
  product: Product,
  query: string,
  shopContext?: SearchShopContext
): { matches: boolean; score: number } {
  if (!query || !query.trim()) {
    return { matches: true, score: 0 };
  }

  const rawQuery = query.toLowerCase().trim();
  const normalizedQuery = normalizeSearchText(query);

  const rawName = (product.name || '').toLowerCase();
  const normalizedName = normalizeSearchText(product.name || '');

  const shopNameVal = product.shopName || shopContext?.nameBn || shopContext?.name || '';
  const rawShop = shopNameVal.toLowerCase();
  const normalizedShop = normalizeSearchText(shopNameVal);

  const rawDesc = (product.description || '').toLowerCase();
  const normalizedDesc = normalizeSearchText(product.description || '');

  const shopCat = normalizeSearchText(product.shopCategory || shopContext?.category || '');
  const shopBiz = normalizeSearchText(product.shopBusinessType || shopContext?.businessType || '');
  const prodCat = normalizeSearchText(product.category || '');
  const district = product.shopDistrict || shopContext?.district || '';
  const upazila = product.shopUpazila || shopContext?.upazila || '';
  const area = shopContext?.area || '';
  const locationText = normalizeSearchText(`${district} ${upazila} ${area}`);

  // Query terms
  const terms = normalizedQuery.split(' ').filter(Boolean);
  const rawTerms = rawQuery.split(' ').filter(Boolean);

  let totalScore = 0;
  let matchesCount = 0;

  // Gather synonyms for the terms
  const expandedTerms = terms.map((term, i) => {
    const rawT = rawTerms[i] || term;
    const syns = SYNONYMS_MAP[term] || SYNONYMS_MAP[rawT] || [];
    return [term, rawT, ...syns.map(s => normalizeSearchText(s))];
  });

  for (const termGroup of expandedTerms) {
    let termMatched = false;
    let bestTermScore = 0;

    for (const term of termGroup) {
      if (!term) continue;

      // 1. Direct match on Product Name (Highest Priority)
      if (normalizedName === term || rawName === term) {
        bestTermScore = Math.max(bestTermScore, 1000);
        termMatched = true;
      } else if (normalizedName.startsWith(term) || rawName.startsWith(term)) {
        bestTermScore = Math.max(bestTermScore, 600);
        termMatched = true;
      } else {
        // Check if any word inside product name starts with term
        const nameWords = normalizedName.split(' ');
        const wordStartsWith = nameWords.some(w => w.startsWith(term));
        if (wordStartsWith) {
          bestTermScore = Math.max(bestTermScore, 400);
          termMatched = true;
        } else if (normalizedName.includes(term) || rawName.includes(term)) {
          // Partial substring match anywhere in product name
          bestTermScore = Math.max(bestTermScore, 250);
          termMatched = true;
        }
      }

      // 2. Match on Product Description (Partial & full substring)
      if (normalizedDesc.includes(term) || rawDesc.includes(term)) {
        bestTermScore = Math.max(bestTermScore, 140);
        termMatched = true;
      }

      // 3. Match on Category / Business Type
      if (prodCat.includes(term) || shopCat.includes(term) || shopBiz.includes(term)) {
        bestTermScore = Math.max(bestTermScore, 120);
        termMatched = true;
      }

      // 4. Match on Shop Name
      if (normalizedShop.startsWith(term)) {
        bestTermScore = Math.max(bestTermScore, 100);
        termMatched = true;
      } else if (normalizedShop.includes(term) || rawShop.includes(term)) {
        bestTermScore = Math.max(bestTermScore, 70);
        termMatched = true;
      }

      // 5. Match on Location (District / Upazila / Area)
      if (locationText.includes(term)) {
        bestTermScore = Math.max(bestTermScore, 40);
        termMatched = true;
      }
    }

    if (termMatched) {
      matchesCount++;
      totalScore += bestTermScore;
    }
  }

  // If there are multiple terms, require all terms to match for strict multi-word queries,
  // or at least 1 term if query is partially satisfied
  const isMatch = terms.length === 1 ? matchesCount >= 1 : matchesCount === terms.length;

  return {
    matches: isMatch,
    score: isMatch ? totalScore : 0
  };
}

