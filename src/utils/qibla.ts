// Qibla calculation and coordinate utilities

export const KAABA_COORDINATES = {
  latitude: 21.422487,
  longitude: 39.826206,
  name: 'পবিত্র কাবা শরিফ (মক্কা মুকাররমা)'
};

// District center coordinates for all 64 Bangladesh districts (fallback if GPS is disabled)
export const DISTRICT_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Dhaka': { lat: 23.8103, lng: 90.4125 },
  'Chattogram': { lat: 22.3569, lng: 91.7832 },
  'Sylhet': { lat: 24.8949, lng: 91.8687 },
  'Rajshahi': { lat: 24.3745, lng: 88.6042 },
  'Khulna': { lat: 22.8456, lng: 89.5403 },
  'Barishal': { lat: 22.7010, lng: 90.3535 },
  'Rangpur': { lat: 25.7439, lng: 89.2752 },
  'Mymensingh': { lat: 24.7471, lng: 90.4203 },
  'Cumilla': { lat: 23.4682, lng: 91.1788 },
  'Bogura': { lat: 24.8465, lng: 89.3777 },
  'Kushtia': { lat: 23.9013, lng: 89.1205 },
  'Jashore': { lat: 23.1664, lng: 89.2081 },
  'Dinajpur': { lat: 25.6217, lng: 88.6355 },
  'Faridpur': { lat: 23.6071, lng: 89.8429 },
  'Tangail': { lat: 24.2513, lng: 89.9167 },
  'Pabna': { lat: 24.0064, lng: 89.2372 },
  'Noakhali': { lat: 22.8696, lng: 91.0997 },
  'Cox\'s Bazar': { lat: 21.4272, lng: 92.0058 },
  'Brahmanbaria': { lat: 23.9571, lng: 91.1119 },
  'Gazipur': { lat: 23.9999, lng: 90.4203 },
  'Narayanganj': { lat: 23.6238, lng: 90.5000 },
  'Narsingdi': { lat: 23.9197, lng: 90.7176 },
  'Jamalpur': { lat: 24.9375, lng: 89.9378 },
  'Sirajganj': { lat: 24.4534, lng: 89.7008 },
  'Naogaon': { lat: 24.7936, lng: 88.9318 },
  'Chandpur': { lat: 23.2333, lng: 90.6667 },
  'Feni': { lat: 23.0159, lng: 91.3976 },
  'Lakshmipur': { lat: 22.9425, lng: 90.8412 },
  'Patuakhali': { lat: 22.3596, lng: 90.3299 },
  'Bhola': { lat: 22.6859, lng: 90.6482 },
  'Barguna': { lat: 22.1570, lng: 90.1256 },
  'Pirojpur': { lat: 22.5841, lng: 89.9720 },
  'Jhalokathi': { lat: 22.6406, lng: 90.1987 },
  'Satkhira': { lat: 22.7185, lng: 89.0705 },
  'Bagerhat': { lat: 22.6516, lng: 89.7859 },
  'Chuadanga': { lat: 23.6402, lng: 88.8418 },
  'Meherpur': { lat: 23.7622, lng: 88.6318 },
  'Jhenaidah': { lat: 23.5450, lng: 89.1726 },
  'Magura': { lat: 23.4873, lng: 89.4198 },
  'Narail': { lat: 23.1725, lng: 89.5127 },
  'Gopalganj': { lat: 23.0051, lng: 89.8266 },
  'Madaripur': { lat: 23.1641, lng: 90.1897 },
  'Shariatpur': { lat: 23.2423, lng: 90.3541 },
  'Rajbari': { lat: 23.7574, lng: 89.6445 },
  'Manikganj': { lat: 23.8617, lng: 90.0003 },
  'Munshiganj': { lat: 23.5422, lng: 90.5305 },
  'Kishoreganj': { lat: 24.4449, lng: 90.7766 },
  'Netrokona': { lat: 24.8709, lng: 90.7279 },
  'Sherpur': { lat: 25.0205, lng: 90.0153 },
  'Sunamganj': { lat: 25.0658, lng: 91.3950 },
  'Habiganj': { lat: 24.3750, lng: 91.4167 },
  'Moulvibazar': { lat: 24.4829, lng: 91.7774 },
  'Natore': { lat: 24.4206, lng: 88.9324 },
  'Chapai Nawabganj': { lat: 24.5965, lng: 88.2775 },
  'Joypurhat': { lat: 25.1015, lng: 89.0270 },
  'Gaibandha': { lat: 25.3288, lng: 89.5403 },
  'Kurigram': { lat: 25.8054, lng: 89.6362 },
  'Lalmonirhat': { lat: 25.9923, lng: 89.2847 },
  'Nilphamari': { lat: 25.9318, lng: 88.8560 },
  'Panchagarh': { lat: 26.3411, lng: 88.5542 },
  'Thakurgaon': { lat: 26.0337, lng: 88.4617 },
  'Khagrachhari': { lat: 23.1193, lng: 91.9847 },
  'Rangamati': { lat: 22.7324, lng: 92.2985 },
  'Bandarban': { lat: 22.1953, lng: 92.2184 }
};

/**
 * Calculates exact bearing from given coordinates to Kaaba (Makkah)
 * Returns degrees between 0° and 360° clockwise from True North (0° = North, 90° = East, 180° = South, 270° = West)
 */
export function calculateQiblaBearing(latitude: number, longitude: number): number {
  const phi1 = (latitude * Math.PI) / 180;
  const lambda1 = (longitude * Math.PI) / 180;
  const phi2 = (KAABA_COORDINATES.latitude * Math.PI) / 180;
  const lambda2 = (KAABA_COORDINATES.longitude * Math.PI) / 180;

  const deltaLambda = lambda2 - lambda1;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const qiblaRad = Math.atan2(y, x);
  const qiblaDeg = (qiblaRad * 180) / Math.PI;
  return Math.round(((qiblaDeg + 360) % 360) * 10) / 10;
}

/**
 * Returns descriptive direction for the Qibla (e.g., পশ্চিম-উত্তর-পশ্চিম / West-Northwest)
 */
export function getQiblaDirectionDescription(bearing: number, lang: 'bn' | 'en' = 'bn'): string {
  if (lang === 'en') {
    if (bearing >= 260 && bearing <= 285) {
      return 'West-Northwest (W-NW)';
    } else if (bearing > 285 && bearing <= 315) {
      return 'Northwest (NW)';
    } else if (bearing >= 240 && bearing < 260) {
      return 'West-Southwest (W-SW)';
    } else if (bearing >= 265 && bearing <= 275) {
      return 'Due West (W)';
    }
    return 'West (W)';
  }

  if (bearing >= 260 && bearing <= 285) {
    return 'পশ্চিম-উত্তর-পশ্চিম (W-NW)';
  } else if (bearing > 285 && bearing <= 315) {
    return 'উত্তর-পশ্চিম (NW)';
  } else if (bearing >= 240 && bearing < 260) {
    return 'পশ্চিম-দক্ষিণ-পশ্চিম (W-SW)';
  } else if (bearing >= 265 && bearing <= 275) {
    return 'প্রায় পুরোপুরি পশ্চিম (West)';
  }
  return 'পশ্চিম দিক (West)';
}

/**
 * Calculate Great Circle Distance in KM to Kaaba
 */
export function calculateKaabaDistanceKm(latitude: number, longitude: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((KAABA_COORDINATES.latitude - latitude) * Math.PI) / 180;
  const dLng = ((KAABA_COORDINATES.longitude - longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((latitude * Math.PI) / 180) *
      Math.cos((KAABA_COORDINATES.latitude * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
