import express from 'express';
import axios from 'axios';

export const mapRoutes = express.Router();

const getApiKey = (): string => {
  return (
    process.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.MAPS_API_KEY?.trim() ||
    ''
  );
};

// Map configuration
mapRoutes.get('/config', (req, res) => {
  const apiKey = getApiKey();
  res.json({
    success: true,
    hasKey: Boolean(apiKey),
    apiKey: apiKey || ''
  });
});

// Reverse Geocoding: Coordinates -> Full Address, District, Thana/Upazila
mapRoutes.get('/reverse-geocode', async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ success: false, message: 'Invalid latitude or longitude' });
  }

  const apiKey = getApiKey();

  // Try Google Geocoding REST API first if key is present
  if (apiKey) {
    try {
      const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=bn`;
      const response = await axios.get(gUrl, { timeout: 6000 });

      if (response.data && response.data.status === 'OK' && response.data.results?.length > 0) {
        const result = response.data.results[0];
        let upazilaThana = '';
        let district = '';
        let division = '';
        let postalCode = '';
        let street = '';

        for (const comp of result.address_components || []) {
          const types: string[] = comp.types || [];
          if (types.includes('sublocality') || types.includes('sublocality_level_1') || types.includes('neighborhood') || types.includes('administrative_area_level_3')) {
            if (!upazilaThana) upazilaThana = comp.long_name;
          }
          if (types.includes('administrative_area_level_2') || types.includes('locality')) {
            if (!district) district = comp.long_name;
          }
          if (types.includes('administrative_area_level_1')) {
            division = comp.long_name;
          }
          if (types.includes('postal_code')) {
            postalCode = comp.long_name;
          }
          if (types.includes('route') || types.includes('street_address') || types.includes('premise')) {
            street = comp.long_name;
          }
        }

        return res.json({
          success: true,
          source: 'google',
          formattedAddress: result.formatted_address || '',
          upazilaThana: upazilaThana || '',
          district: district || '',
          division: division || '',
          postalCode: postalCode || '',
          lat,
          lng
        });
      }
    } catch (err: any) {
      console.warn('Google Reverse Geocoding failed, falling back to OSM:', err.message);
    }
  }

  // Graceful Fallback: OpenStreetMap Nominatim
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=bn,en&zoom=18&addressdetails=1`;
    const osmResp = await axios.get(osmUrl, {
      headers: { 'User-Agent': 'CaveCompanionsApp/2.0' },
      timeout: 5000
    });

    if (osmResp.data && osmResp.data.display_name) {
      const addr = osmResp.data.address || {};
      const upazila = addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter || addr.town || addr.village || '';
      const dist = addr.state_district || addr.city || addr.county || addr.district || '';

      return res.json({
        success: true,
        source: 'osm',
        formattedAddress: osmResp.data.display_name,
        upazilaThana: upazila,
        district: dist,
        division: addr.state || '',
        postalCode: addr.postcode || '',
        lat,
        lng
      });
    }
  } catch (osmErr: any) {
    console.warn('OSM reverse geocode fallback failed:', osmErr.message);
  }

  // Final static fallback
  res.json({
    success: true,
    source: 'local',
    formattedAddress: `দোকানের অবস্থান (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
    upazilaThana: '',
    district: '',
    lat,
    lng
  });
});

// Forward Geocoding / Search
mapRoutes.get('/search', async (req, res) => {
  const query = String(req.query.q || '').trim();
  if (!query || query.length < 2) {
    return res.json({ success: true, results: [] });
  }

  const apiKey = getApiKey();

  if (apiKey) {
    try {
      const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}&components=country:BD&language=bn`;
      const response = await axios.get(gUrl, { timeout: 6000 });

      if (response.data && response.data.status === 'OK' && response.data.results?.length > 0) {
        const results = response.data.results.map((r: any, idx: number) => ({
          id: `g-${idx}-${r.place_id || idx}`,
          name: r.formatted_address,
          nameBn: r.formatted_address,
          address: r.formatted_address,
          lat: r.geometry?.location?.lat,
          lng: r.geometry?.location?.lng
        }));

        return res.json({ success: true, source: 'google', results });
      }
    } catch (err: any) {
      console.warn('Google search failed:', err.message);
    }
  }

  // Fallback to OSM search
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=bd&limit=6&accept-language=bn,en&addressdetails=1`;
    const osmResp = await axios.get(osmUrl, {
      headers: { 'User-Agent': 'CaveCompanionsApp/2.0' },
      timeout: 5000
    });

    if (osmResp.data && Array.isArray(osmResp.data)) {
      const results = osmResp.data.map((r: any, idx: number) => ({
        id: `osm-${idx}-${r.place_id || idx}`,
        name: r.display_name,
        nameBn: r.display_name,
        address: r.display_name,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon)
      }));

      return res.json({ success: true, source: 'osm', results });
    }
  } catch (osmErr: any) {
    console.warn('OSM search failed:', osmErr.message);
  }

  res.json({ success: true, results: [] });
});
