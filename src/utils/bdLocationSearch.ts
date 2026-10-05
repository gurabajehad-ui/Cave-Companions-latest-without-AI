// Bangladesh Location Search & Autocomplete Service
// Supports Bengali & English query autocomplete, fuzzy matching, Nominatim geocoding, and reverse geocoding.

export interface LocationSearchResult {
  id: string;
  name: string;
  nameBn?: string;
  address: string;
  district?: string;
  area?: string;
  lat: number;
  lng: number;
  type?: 'landmark' | 'area' | 'college' | 'station' | 'hospital' | 'general';
}

// Curated list of prominent Bangladesh landmarks, colleges, universities, and areas
export const POPULAR_BD_LANDMARKS: LocationSearchResult[] = [
  {
    id: 'adamjee-cantonment-college',
    name: 'Adamjee Cantonment College',
    nameBn: 'আদমজী ক্যান্টনমেন্ট কলেজ',
    address: 'ঢাকা সেনানিবাস, ঢাকা ১২০৬',
    area: 'ঢাকা সেনানিবাস',
    district: 'ঢাকা',
    lat: 23.8052,
    lng: 90.3927,
    type: 'college'
  },
  {
    id: 'adamjee-epz-narayanganj',
    name: 'Adamjee EPZ / Adamjee Nagar',
    nameBn: 'আদমজী ইপিজেড / আদমজী নগর',
    address: 'সিদ্ধিরগঞ্জ, নারায়ণগঞ্জ',
    area: 'সিদ্ধিরগঞ্জ',
    district: 'নারায়ণগঞ্জ',
    lat: 23.6883,
    lng: 90.5283,
    type: 'area'
  },
  {
    id: 'ecb-chattar-cantonment',
    name: 'ECB Chattar Cantonment',
    nameBn: 'ইসিবি চত্বর, ঢাকা ক্যান্টনমেন্ট',
    address: 'ইসিবি চত্বর, ঢাকা সেনানিবাস, ঢাকা',
    area: 'ক্যান্টনমেন্ট',
    district: 'ঢাকা',
    lat: 23.8225,
    lng: 90.3931,
    type: 'area'
  },
  {
    id: 'dhaka-cantonment',
    name: 'Dhaka Cantonment',
    nameBn: 'ঢাকা সেনানিবাস',
    address: 'ঢাকা সেনানিবাস, ঢাকা',
    area: 'ক্যান্টনমেন্ট',
    district: 'ঢাকা',
    lat: 23.8090,
    lng: 90.3980,
    type: 'area'
  },
  {
    id: 'mirpur-10',
    name: 'Mirpur 10 Circle',
    nameBn: 'মিরপুর ১০ গোলচত্বর',
    address: 'মিরপুর-১০, ঢাকা ১২১৬',
    area: 'মিরপুর',
    district: 'ঢাকা',
    lat: 23.8069,
    lng: 90.3687,
    type: 'area'
  },
  {
    id: 'mirpur-12',
    name: 'Mirpur 12 Bus Stand',
    nameBn: 'মিরপুর ১২ বাস স্ট্যান্ড',
    address: 'মিরপুর-১২, ঢাকা ১২১৬',
    area: 'মিরপুর',
    district: 'ঢাকা',
    lat: 23.8233,
    lng: 90.3644,
    type: 'area'
  },
  {
    id: 'dhanmondi-32',
    name: 'Dhanmondi 32',
    nameBn: 'ধানমন্ডি ৩২',
    address: 'ধানমন্ডি, ঢাকা ১২০৯',
    area: 'ধানমন্ডি',
    district: 'ঢাকা',
    lat: 23.7516,
    lng: 90.3770,
    type: 'area'
  },
  {
    id: 'dhanmondi-27',
    name: 'Dhanmondi 27',
    nameBn: 'ধানমন্ডি ২৭',
    address: 'মিরপুর রোড, ধানমন্ডি, ঢাকা',
    area: 'ধানমন্ডি',
    district: 'ঢাকা',
    lat: 23.7565,
    lng: 90.3762,
    type: 'area'
  },
  {
    id: 'gulshan-1',
    name: 'Gulshan 1 Circle',
    nameBn: 'গুলশান ১ সার্কেল',
    address: 'গুলশান-১, ঢাকা ১২১২',
    area: 'গুলশান',
    district: 'ঢাকা',
    lat: 23.7806,
    lng: 90.4167,
    type: 'area'
  },
  {
    id: 'gulshan-2',
    name: 'Gulshan 2 Circle',
    nameBn: 'গুলশান ২ সার্কেল',
    address: 'গুলশান-২, ঢাকা ১২১২',
    area: 'গুলশান',
    district: 'ঢাকা',
    lat: 23.7949,
    lng: 90.4143,
    type: 'area'
  },
  {
    id: 'uttara-sector-7',
    name: 'Uttara Sector 7',
    nameBn: 'উত্তরা সেক্টর ৭',
    address: 'উত্তরা, ঢাকা ১২৩০',
    area: 'উত্তরা',
    district: 'ঢাকা',
    lat: 23.8722,
    lng: 90.3986,
    type: 'area'
  },
  {
    id: 'uttara-house-building',
    name: 'Uttara House Building',
    nameBn: 'উত্তরা হাউজ বিল্ডিং',
    address: 'ঢাকা-ময়মনসিংহ হাইওয়ে, উত্তরা, ঢাকা',
    area: 'উত্তরা',
    district: 'ঢাকা',
    lat: 23.8685,
    lng: 90.4002,
    type: 'station'
  },
  {
    id: 'farmgate',
    name: 'Farmgate Bus Stop',
    nameBn: 'ফার্মগেট',
    address: 'ফার্মগেট, তেজগাঁও, ঢাকা',
    area: 'তেজগাঁও',
    district: 'ঢাকা',
    lat: 23.7561,
    lng: 90.3872,
    type: 'station'
  },
  {
    id: 'karwan-bazar',
    name: 'Karwan Bazar',
    nameBn: 'কারওয়ান বাজার',
    address: 'কারওয়ান বাজার, ঢাকা ১২১৫',
    area: 'তেজগাঁও',
    district: 'ঢাকা',
    lat: 23.7511,
    lng: 90.3934,
    type: 'area'
  },
  {
    id: 'shahbagh',
    name: 'Shahbagh Square',
    nameBn: 'শাহবাগ মোড়',
    address: 'শাহবাগ, ঢাকা ১০০০',
    area: 'শাহবাগ',
    district: 'ঢাকা',
    lat: 23.7389,
    lng: 90.3958,
    type: 'area'
  },
  {
    id: 'motijheel',
    name: 'Shapla Chattar Motijheel',
    nameBn: 'শাপলা চত্বর, মতিঝিল',
    address: 'মতিঝিল, ঢাকা ১০০০',
    area: 'মতিঝিল',
    district: 'ঢাকা',
    lat: 23.7289,
    lng: 90.4125,
    type: 'area'
  },
  {
    id: 'bashundhara-residential',
    name: 'Bashundhara Residential Area',
    nameBn: 'বসুন্ধরা আবাসিক এলাকা',
    address: 'বসুন্ধরা, ঢাকা ১২২৯',
    area: 'বসুন্ধরা',
    district: 'ঢাকা',
    lat: 23.8182,
    lng: 90.4300,
    type: 'area'
  },
  {
    id: 'jamuna-future-park',
    name: 'Jamuna Future Park',
    nameBn: 'যমুনা ফিউচার পার্ক',
    address: 'কুরিল, প্রগতি সরণি, ঢাকা',
    area: 'কুরিল',
    district: 'ঢাকা',
    lat: 23.8135,
    lng: 90.4242,
    type: 'landmark'
  },
  {
    id: 'dhaka-university',
    name: 'University of Dhaka',
    nameBn: 'ঢাকা বিশ্ববিদ্যালয়',
    address: 'শাহবাগ, ঢাকা ১০০০',
    area: 'শাহবাগ',
    district: 'ঢাকা',
    lat: 23.7325,
    lng: 90.3938,
    type: 'college'
  },
  {
    id: 'buet',
    name: 'BUET Campus',
    nameBn: 'বুয়েট ক্যাম্পাস',
    address: 'পলাশী, ঢাকা ১০০০',
    area: 'পলাশী',
    district: 'ঢাকা',
    lat: 23.7262,
    lng: 90.3920,
    type: 'college'
  },
  {
    id: 'dmc',
    name: 'Dhaka Medical College',
    nameBn: 'ঢাকা মেডিকেল কলেজ হাসপাতাল',
    address: 'বকশীবাজার, ঢাকা ১০০০',
    area: 'শাহবাগ',
    district: 'ঢাকা',
    lat: 23.7258,
    lng: 90.3980,
    type: 'hospital'
  },
  {
    id: 'mohakhali-bus-terminal',
    name: 'Mohakhali Bus Terminal',
    nameBn: 'মহাখালী বাস টার্মিনাল',
    address: 'মহাখালী, ঢাকা ১২১২',
    area: 'মহাখালী',
    district: 'ঢাকা',
    lat: 23.7778,
    lng: 90.4005,
    type: 'station'
  },
  {
    id: 'gabtoli',
    name: 'Gabtoli Bus Terminal',
    nameBn: 'গাবতলী বাস টার্মিনাল',
    address: 'গাবতলী, ঢাকা ১২১৬',
    area: 'মিরপুর',
    district: 'ঢাকা',
    lat: 23.7844,
    lng: 90.3428,
    type: 'station'
  },
  {
    id: 'kamalapur',
    name: 'Kamalapur Railway Station',
    nameBn: 'কমলাপুর রেলওয়ে স্টেশন',
    address: 'কমলাপুর, ঢাকা ১০০০',
    area: 'মতিঝিল',
    district: 'ঢাকা',
    lat: 23.7328,
    lng: 90.4258,
    type: 'station'
  },
  {
    id: 'chittagong-gop',
    name: 'GEC Circle Chattogram',
    nameBn: 'জিইসি মোড়, চট্টগ্রাম',
    address: 'জিইসি, চট্টগ্রাম',
    area: 'জিইসি',
    district: 'চট্টগ্রাম',
    lat: 22.3587,
    lng: 91.8215,
    type: 'area'
  },
  {
    id: 'sylhet-zindabazar',
    name: 'Zindabazar Sylhet',
    nameBn: 'জিন্দাবাজার, সিলেট',
    address: 'জিন্দাবাজার, সিলেট',
    area: 'জিন্দাবাজার',
    district: 'সিলেট',
    lat: 24.8949,
    lng: 91.8687,
    type: 'area'
  }
];

// Search location suggestions locally + via Nominatim API with debounce support
export async function searchBDLocations(query: string): Promise<LocationSearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  // 1. Local Landmark Fuzzy Matching
  const localMatches = POPULAR_BD_LANDMARKS.filter((item) => {
    const nameMatch = item.name.toLowerCase().includes(q);
    const nameBnMatch = item.nameBn ? item.nameBn.includes(q) : false;
    const addrMatch = item.address.toLowerCase().includes(q);
    const areaMatch = item.area ? item.area.toLowerCase().includes(q) : false;
    return nameMatch || nameBnMatch || addrMatch || areaMatch;
  });

  // 2. OpenStreetMap / Google Geocoding API search
  let remoteResults: LocationSearchResult[] = [];
  try {
    const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query.trim() + ', Bangladesh'
    )}&countrycodes=bd&limit=6&addressdetails=1`;

    const res = await fetch(searchUrl, {
      headers: {
        'Accept-Language': 'bn,en',
        'User-Agent': 'CaveLocalApp/1.0'
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        remoteResults = data.map((item: any, idx: number) => {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          const name = item.display_name.split(',')[0] || item.display_name;
          const address = item.display_name;
          const district = item.address?.state || item.address?.city || item.address?.district || 'বাংলাদেশ';
          const area = item.address?.suburb || item.address?.neighbourhood || item.address?.town || '';

          return {
            id: `osm-${item.place_id || idx}`,
            name: name,
            nameBn: name,
            address: address,
            district: district,
            area: area,
            lat: lat,
            lng: lng,
            type: 'general' as const
          };
        });
      }
    }
  } catch (err) {
    console.warn('Remote location search fallback:', err);
  }

  // Merge local matches with remote results, avoiding duplicates
  const merged: LocationSearchResult[] = [...localMatches];
  for (const remote of remoteResults) {
    const isDuplicate = merged.some(
      (existing) =>
        Math.abs(existing.lat - remote.lat) < 0.005 &&
        Math.abs(existing.lng - remote.lng) < 0.005
    );
    if (!isDuplicate) {
      merged.push(remote);
    }
  }

  return merged.slice(0, 8);
}

// Reverse Geocoding helper with fallback nearest landmark matching
export async function reverseGeocodeBD(lat: number, lng: number, language: string = 'bn'): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': language === 'bn' ? 'bn,en' : 'en,bn',
        'User-Agent': 'CaveLocalApp/1.0'
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        return data.display_name;
      }
    }
  } catch (err) {
    console.warn('Reverse geocode error:', err);
  }

  // Fallback: Find nearest landmark in POPULAR_BD_LANDMARKS
  let closest: LocationSearchResult | null = null;
  let minDistanceKm = 999;
  for (const lm of POPULAR_BD_LANDMARKS) {
    const dLat = (lm.lat - lat) * 111;
    const dLng = (lm.lng - lng) * 111 * Math.cos((lat * Math.PI) / 180);
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    if (dist < minDistanceKm) {
      minDistanceKm = dist;
      closest = lm;
    }
  }

  if (closest && minDistanceKm <= 10) {
    const name = (language === 'bn' ? closest.nameBn : closest.name) || closest.name;
    const district = closest.district || '';
    return `${name} এলাকা${district ? `, ${district}` : ''}`;
  }

  return language === 'bn'
    ? `অক্ষাংশ: ${lat.toFixed(4)}, দ্রাঘিমাংশ: ${lng.toFixed(4)}`
    : `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
}
