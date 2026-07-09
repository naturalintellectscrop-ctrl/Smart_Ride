/**
 * Shared Kampala Places Database
 * ================================
 * Mapbox geocoding has poor POI coverage for Uganda (e.g. "Acacia Mall",
 * "Garden City" return zero results). Local ride-hailing apps (SafeBoda etc.)
 * solve this with a curated POI database. This module is the single source of
 * truth, consumed by both /api/mapbox/geocoding (merged into search results)
 * and /api/mapbox/kampala-places.
 *
 * All search results in the app use the UnifiedPlace shape so the frontend
 * never has to branch on the data source.
 */

export interface KampalaPlace {
  id: string;
  name: string;
  category:
    | 'neighborhood' | 'shopping' | 'restaurant' | 'landmark' | 'education'
    | 'hospital' | 'airport' | 'government' | 'hotel' | 'road' | 'religious';
  address: string;
  fullAddress: string;
  lat: number;
  lng: number;
  description?: string;
  popular?: boolean;
}

/**
 * Unified place shape returned by ALL search/geocoding endpoints.
 * Includes both the canonical fields (name/lat/lng) AND Mapbox-compatible
 * aliases (place_name/center) so any consumer works without transformation.
 */
export interface UnifiedPlace {
  id: string;
  name: string;
  address: string;
  fullAddress: string;
  lat: number;
  lng: number;
  place_name: string;        // alias of fullAddress (Mapbox v5 compat)
  center: [number, number];  // [lng, lat] (Mapbox v5 compat)
  category?: string;
  source: 'curated' | 'mapbox' | 'osm';
  relevance: number;
}

export const KAMPALA_PLACES: KampalaPlace[] = [
  // ---- Neighborhoods ----
  { id: 'kla-ntinda', name: 'Ntinda', category: 'neighborhood', address: 'Ntinda', fullAddress: 'Ntinda, Kampala, Uganda', lat: 0.3544, lng: 32.6136, description: 'Busy residential & commercial area', popular: true },
  { id: 'kla-kololo', name: 'Kololo', category: 'neighborhood', address: 'Kololo', fullAddress: 'Kololo, Kampala, Uganda', lat: 0.3290, lng: 32.5880, description: 'Upscale neighborhood, diplomatic area', popular: true },
  { id: 'kla-nakasero', name: 'Nakasero', category: 'neighborhood', address: 'Nakasero Hill', fullAddress: 'Nakasero, Kampala, Uganda', lat: 0.3150, lng: 32.5800, description: 'Central hill with government offices & markets', popular: true },
  { id: 'kla-bugolobi', name: 'Bugolobi', category: 'neighborhood', address: 'Bugolobi', fullAddress: 'Bugolobi, Kampala, Uganda', lat: 0.3139, lng: 32.6220, description: 'Residential area with Village Mall', popular: true },
  { id: 'kla-muyenga', name: 'Muyenga', category: 'neighborhood', address: 'Muyenga Hill', fullAddress: 'Muyenga, Kampala, Uganda', lat: 0.2960, lng: 32.5960, description: 'Upscale residential hill area', popular: true },
  { id: 'kla-makindye', name: 'Makindye', category: 'neighborhood', address: 'Makindye', fullAddress: 'Makindye, Kampala, Uganda', lat: 0.2840, lng: 32.5780, description: 'Suburban residential area' },
  { id: 'kla-kiswa', name: 'Kiswa', category: 'neighborhood', address: 'Kiswa', fullAddress: 'Kiswa, Bugolobi, Kampala, Uganda', lat: 0.3120, lng: 32.6270, description: 'Quiet residential neighborhood' },
  { id: 'kla-lugogo', name: 'Lugogo', category: 'neighborhood', address: 'Lugogo', fullAddress: 'Lugogo, Kampala, Uganda', lat: 0.3275, lng: 32.6000, description: 'Shopping and entertainment area', popular: true },
  { id: 'kla-kamwokya', name: 'Kamwokya', category: 'neighborhood', address: 'Kamwokya', fullAddress: 'Kamwokya, Kampala, Uganda', lat: 0.3340, lng: 32.5810, description: 'Busy market area' },
  { id: 'kla-wandegeya', name: 'Wandegeya', category: 'neighborhood', address: 'Wandegeya', fullAddress: 'Wandegeya, Kampala, Uganda', lat: 0.3400, lng: 32.5730, description: 'University-area commercial hub' },
  { id: 'kla-kabalagala', name: 'Kabalagala', category: 'neighborhood', address: 'Kabalagala', fullAddress: 'Kabalagala, Kampala, Uganda', lat: 0.3020, lng: 32.5900, description: 'Nightlife and expat area' },
  { id: 'kla-kansanga', name: 'Kansanga', category: 'neighborhood', address: 'Kansanga', fullAddress: 'Kansanga, Kampala, Uganda', lat: 0.2990, lng: 32.6050, description: 'Student and residential area' },
  { id: 'kla-munyonyo', name: 'Munyonyo', category: 'neighborhood', address: 'Munyonyo', fullAddress: 'Munyonyo, Kampala, Uganda', lat: 0.2400, lng: 32.6300, description: 'Lakeside area with resorts' },
  { id: 'kla-kawempe', name: 'Kawempe', category: 'neighborhood', address: 'Kawempe', fullAddress: 'Kawempe, Kampala, Uganda', lat: 0.3800, lng: 32.5550, description: 'Northern Kampala suburb' },
  { id: 'kla-naalya', name: 'Naalya', category: 'neighborhood', address: 'Naalya', fullAddress: 'Naalya, Kampala, Uganda', lat: 0.3710, lng: 32.6440, description: 'Growing residential area with Metroplex Mall' },
  { id: 'kla-namugongo', name: 'Namugongo', category: 'neighborhood', address: 'Namugongo', fullAddress: 'Namugongo, Kampala, Uganda', lat: 0.3710, lng: 32.6540, description: 'Home to Uganda Martyrs Shrine' },
  { id: 'kla-bweyogerere', name: 'Bweyogerere', category: 'neighborhood', address: 'Bweyogerere', fullAddress: 'Bweyogerere, Kampala, Uganda', lat: 0.3580, lng: 32.6700, description: 'Eastern suburb on Jinja Road' },
  { id: 'kla-kireka', name: 'Kireka', category: 'neighborhood', address: 'Kireka', fullAddress: 'Kireka, Kampala, Uganda', lat: 0.3510, lng: 32.6520, description: 'Busy junction on Jinja Road' },
  { id: 'kla-mpererwe', name: 'Mpererwe', category: 'neighborhood', address: 'Mpererwe', fullAddress: 'Mpererwe, Kampala, Uganda', lat: 0.3700, lng: 32.5800, description: 'Northern residential area' },
  { id: 'kla-lubowa', name: 'Lubowa', category: 'neighborhood', address: 'Lubowa', fullAddress: 'Lubowa, Entebbe Road, Uganda', lat: 0.2500, lng: 32.5600, description: 'Growing suburb on Entebbe Road' },
  { id: 'kla-old-kampala', name: 'Old Kampala', category: 'neighborhood', address: 'Old Kampala Hill', fullAddress: 'Old Kampala, Kampala, Uganda', lat: 0.3170, lng: 32.5680, description: 'Historic area with National Mosque' },
  { id: 'kla-mulago', name: 'Mulago', category: 'neighborhood', address: 'Mulago Hill', fullAddress: 'Mulago, Kampala, Uganda', lat: 0.3420, lng: 32.5730, description: 'Hospital and university area' },
  { id: 'kla-nakawa', name: 'Nakawa', category: 'neighborhood', address: 'Nakawa', fullAddress: 'Nakawa, Kampala, Uganda', lat: 0.3290, lng: 32.6190, description: 'Industrial and business division', popular: true },
  { id: 'kla-najjera', name: 'Najjera', category: 'neighborhood', address: 'Najjera', fullAddress: 'Najjera, Kampala, Uganda', lat: 0.3760, lng: 32.6320, description: 'Fast-growing residential suburb' },
  { id: 'kla-kyanja', name: 'Kyanja', category: 'neighborhood', address: 'Kyanja', fullAddress: 'Kyanja, Kampala, Uganda', lat: 0.3690, lng: 32.6160, description: 'Residential area north of Ntinda' },
  { id: 'kla-bukoto', name: 'Bukoto', category: 'neighborhood', address: 'Bukoto', fullAddress: 'Bukoto, Kampala, Uganda', lat: 0.3450, lng: 32.5990, description: 'Residential area near Kisaasi' },
  { id: 'kla-kisaasi', name: 'Kisaasi', category: 'neighborhood', address: 'Kisaasi', fullAddress: 'Kisaasi, Kampala, Uganda', lat: 0.3640, lng: 32.6090, description: 'Residential suburb' },

  // ---- Shopping ----
  { id: 'kla-acacia-mall', name: 'Acacia Mall', category: 'shopping', address: 'Kololo', fullAddress: 'Acacia Mall, Kololo, Kampala, Uganda', lat: 0.3328, lng: 32.5883, description: 'Premium shopping mall in Kololo', popular: true },
  { id: 'kla-garden-city', name: 'Garden City Mall', category: 'shopping', address: 'Yusuf Lule Road', fullAddress: 'Garden City Mall, Yusuf Lule Road, Kampala, Uganda', lat: 0.3175, lng: 32.5900, description: 'Popular mall on Yusuf Lule Road', popular: true },
  { id: 'kla-metroplex', name: 'Metroplex Shopping Mall', category: 'shopping', address: 'Naalya', fullAddress: 'Metroplex Shopping Mall, Naalya, Kampala, Uganda', lat: 0.3710, lng: 32.6440, description: 'Major mall on the eastern side', popular: true },
  { id: 'kla-freedom-city', name: 'Freedom City Mall', category: 'shopping', address: 'Entebbe Road', fullAddress: 'Freedom City Mall, Entebbe Road, Kampala, Uganda', lat: 0.2970, lng: 32.5690, description: 'Shopping on Entebbe Road', popular: true },
  { id: 'kla-village-mall', name: 'Village Mall Bugolobi', category: 'shopping', address: 'Bugolobi', fullAddress: 'Village Mall, Bugolobi, Kampala, Uganda', lat: 0.3110, lng: 32.6200, description: 'Neighborhood mall in Bugolobi', popular: true },
  { id: 'kla-oasis-mall', name: 'Oasis Mall', category: 'shopping', address: 'Kampala Road', fullAddress: 'Oasis Mall, Kampala Road, Kampala, Uganda', lat: 0.3170, lng: 32.5810, description: 'Downtown shopping mall' },
  { id: 'kla-lugogo-mall', name: 'Lugogo Mall', category: 'shopping', address: 'Lugogo Bypass', fullAddress: 'Lugogo Mall, Lugogo Bypass, Kampala, Uganda', lat: 0.3308, lng: 32.5990, description: 'Mall on Lugogo Bypass (Shoprite/Game complex)', popular: true },
  { id: 'kla-capital-shoppers', name: 'Capital Shoppers', category: 'shopping', address: 'Kampala Road', fullAddress: 'Capital Shoppers, Kampala Road, Kampala, Uganda', lat: 0.3172, lng: 32.5795, description: 'Supermarket on Kampala Road' },

  // ---- Restaurants ----
  { id: 'kla-cafe-javas', name: 'Cafe Javas', category: 'restaurant', address: 'Kampala Road', fullAddress: 'Cafe Javas, Kampala Road, Kampala, Uganda', lat: 0.3180, lng: 32.5815, description: 'Popular restaurant chain', popular: true },
  { id: 'kla-java-house', name: 'Java House', category: 'restaurant', address: 'Kampala Road', fullAddress: 'Java House, Kampala Road, Kampala, Uganda', lat: 0.3175, lng: 32.5810, description: 'Coffee house and restaurant' },

  // ---- Transport hubs ----
  { id: 'kla-old-taxi-park', name: 'Old Taxi Park', category: 'landmark', address: 'Downtown Kampala', fullAddress: 'Old Taxi Park, Ben Kiwanuka Street, Kampala, Uganda', lat: 0.3125, lng: 32.5772, description: 'Main downtown taxi terminal', popular: true },
  { id: 'kla-new-taxi-park', name: 'New Taxi Park', category: 'landmark', address: 'Downtown Kampala', fullAddress: 'New Taxi Park, Namirembe Road, Kampala, Uganda', lat: 0.3106, lng: 32.5741, description: 'Taxi terminal for western routes', popular: true },

  // ---- Landmarks ----
  { id: 'kla-parliament', name: 'Parliament of Uganda', category: 'landmark', address: 'Parliament Avenue', fullAddress: 'Parliament of Uganda, Parliament Avenue, Kampala, Uganda', lat: 0.3176, lng: 32.5825, description: 'National legislature', popular: true },
  { id: 'kla-independence-square', name: 'Independence Square', category: 'landmark', address: 'Kololo', fullAddress: 'Independence Square, Kololo, Kampala, Uganda', lat: 0.3290, lng: 32.5860, description: 'Historic ceremonial grounds' },
  { id: 'kla-uganda-museum', name: 'Uganda Museum', category: 'landmark', address: 'Kitante Road', fullAddress: 'Uganda Museum, Kitante Road, Kampala, Uganda', lat: 0.3310, lng: 32.5760, description: 'National museum of Uganda', popular: true },
  { id: 'kla-kasubi-tombs', name: 'Kasubi Tombs', category: 'landmark', address: 'Kasubi', fullAddress: 'Kasubi Tombs, Kasubi, Kampala, Uganda', lat: 0.3480, lng: 32.5550, description: 'UNESCO World Heritage Site', popular: true },

  // ---- Religious ----
  { id: 'kla-namugongo-shrine', name: 'Uganda Martyrs Shrine', category: 'religious', address: 'Namugongo', fullAddress: 'Uganda Martyrs Shrine, Namugongo, Kampala, Uganda', lat: 0.3710, lng: 32.6540, description: 'Major Catholic pilgrimage site', popular: true },
  { id: 'kla-national-mosque', name: 'Uganda National Mosque', category: 'religious', address: 'Old Kampala Hill', fullAddress: 'Uganda National Mosque, Old Kampala Hill, Kampala, Uganda', lat: 0.3170, lng: 32.5680, description: 'National mosque on Old Kampala Hill', popular: true },
  { id: 'kla-namirembe-cathedral', name: 'Namirembe Cathedral', category: 'religious', address: 'Namirembe Hill', fullAddress: 'Namirembe Cathedral, Namirembe Hill, Kampala, Uganda', lat: 0.3210, lng: 32.5650, description: 'Historic Anglican cathedral' },
  { id: 'kla-rubaga-cathedral', name: 'Rubaga Cathedral', category: 'religious', address: 'Rubaga Hill', fullAddress: 'Rubaga Cathedral, Rubaga Hill, Kampala, Uganda', lat: 0.3090, lng: 32.5570, description: 'Roman Catholic cathedral' },

  // ---- Education ----
  { id: 'kla-makerere', name: 'Makerere University', category: 'education', address: 'Makerere Hill', fullAddress: 'Makerere University, Makerere Hill, Kampala, Uganda', lat: 0.3350, lng: 32.5700, description: "Uganda's oldest and largest university", popular: true },
  { id: 'kla-mubs', name: 'Makerere University Business School', category: 'education', address: 'Nakawa', fullAddress: 'MUBS, Nakawa, Kampala, Uganda', lat: 0.3210, lng: 32.6190, description: 'Business school in Nakawa' },

  // ---- Hospital ----
  { id: 'kla-mulago-hospital', name: 'Mulago Hospital', category: 'hospital', address: 'Mulago Hill', fullAddress: 'Mulago National Referral Hospital, Mulago Hill, Kampala, Uganda', lat: 0.3420, lng: 32.5730, description: "Uganda's national referral hospital", popular: true },
  { id: 'kla-nakasero-hospital', name: 'Nakasero Hospital', category: 'hospital', address: 'Nakasero', fullAddress: 'Nakasero Hospital, Nakasero, Kampala, Uganda', lat: 0.3260, lng: 32.5790, description: 'Private hospital in Nakasero' },

  // ---- Airport ----
  { id: 'kla-entebbe-airport', name: 'Entebbe International Airport', category: 'airport', address: 'Entebbe', fullAddress: 'Entebbe International Airport, Entebbe, Uganda', lat: 0.0480, lng: 32.4430, description: "Uganda's main international airport", popular: true },

  // ---- Hotels ----
  { id: 'kla-serena-hotel', name: 'Kampala Serena Hotel', category: 'hotel', address: 'Kintu Road', fullAddress: 'Kampala Serena Hotel, Kintu Road, Kampala, Uganda', lat: 0.3190, lng: 32.5820, description: '5-star luxury hotel', popular: true },
  { id: 'kla-speke-hotel', name: 'Speke Hotel', category: 'hotel', address: 'Kampala Road', fullAddress: 'Speke Hotel, Kampala Road, Kampala, Uganda', lat: 0.3175, lng: 32.5800, description: 'Central hotel on Kampala Road' },
  { id: 'kla-munyonyo-resort', name: 'Speke Resort Munyonyo', category: 'hotel', address: 'Munyonyo', fullAddress: 'Speke Resort Munyonyo, Munyonyo, Kampala, Uganda', lat: 0.2400, lng: 32.6300, description: 'Lakeside conference resort' },

  // ---- Roads ----
  { id: 'kla-kampala-road', name: 'Kampala Road', category: 'road', address: 'Kampala CBD', fullAddress: 'Kampala Road, Kampala, Uganda', lat: 0.3175, lng: 32.5810, description: 'Main street in the city center', popular: true },
  { id: 'kla-jinja-road', name: 'Jinja Road', category: 'road', address: 'Kampala', fullAddress: 'Jinja Road, Kampala, Uganda', lat: 0.3210, lng: 32.6050, description: 'Major road heading east', popular: true },
  { id: 'kla-entebbe-road', name: 'Entebbe Road', category: 'road', address: 'Kampala', fullAddress: 'Entebbe Road, Kampala, Uganda', lat: 0.2900, lng: 32.5750, description: 'Road to Entebbe and the airport', popular: true },
  { id: 'kla-bombo-road', name: 'Bombo Road', category: 'road', address: 'Kawempe', fullAddress: 'Bombo Road, Kawempe, Kampala, Uganda', lat: 0.3700, lng: 32.5550, description: 'Road heading north' },
  { id: 'kla-gayaza-road', name: 'Gayaza Road', category: 'road', address: 'Kampala', fullAddress: 'Gayaza Road, Kampala, Uganda', lat: 0.3600, lng: 32.5750, description: 'Road heading north-east' },

  // ---- Government ----
  { id: 'kla-state-house', name: 'State House Entebbe', category: 'government', address: 'Entebbe', fullAddress: 'State House, Entebbe, Uganda', lat: 0.0550, lng: 32.4550, description: "President's official residence" },
];

export const CATEGORY_LABELS: Record<string, string> = {
  neighborhood: 'Neighborhood',
  shopping: 'Shopping',
  restaurant: 'Restaurant',
  landmark: 'Landmark',
  education: 'Education',
  hospital: 'Hospital',
  airport: 'Airport',
  government: 'Government',
  hotel: 'Hotel',
  road: 'Road',
  religious: 'Religious',
};

/** Convert a curated place into the unified search-result shape. */
export function toUnifiedPlace(p: KampalaPlace, relevance = 1): UnifiedPlace {
  return {
    id: p.id,
    name: p.name,
    address: p.address,
    fullAddress: p.fullAddress,
    lat: p.lat,
    lng: p.lng,
    place_name: p.fullAddress,
    center: [p.lng, p.lat],
    category: p.category,
    source: 'curated',
    relevance,
  };
}

/**
 * Search the curated database with word-based fuzzy matching and relevance
 * scoring. Exact name matches rank highest, then prefix matches, then any
 * word-contains match. Popular places get a small boost.
 */
export function searchKampalaPlaces(query: string, limit = 6): UnifiedPlace[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const words = q.split(/\s+/).filter((w) => w.length > 0);

  const scored: Array<{ place: KampalaPlace; score: number }> = [];

  for (const place of KAMPALA_PLACES) {
    const name = place.name.toLowerCase();
    const haystack = `${place.name} ${place.address} ${place.fullAddress} ${place.description || ''}`.toLowerCase();

    // Every search word must appear somewhere in the place
    const allWordsMatch = words.every((w) => haystack.includes(w));
    if (!allWordsMatch) continue;

    let score = 0;
    if (name === q) score += 100;            // exact name
    else if (name.startsWith(q)) score += 60; // name prefix
    else if (name.includes(q)) score += 40;   // name contains
    else score += 20;                          // matched only via address/description

    if (place.popular) score += 8;            // popularity boost

    scored.push({ place, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ place, score }) => toUnifiedPlace(place, Math.min(1, score / 100)));
}

/** Return the most popular curated places (for the empty-search state). */
export function getPopularKampalaPlaces(limit = 8): UnifiedPlace[] {
  return KAMPALA_PLACES.filter((p) => p.popular).slice(0, limit).map((p) => toUnifiedPlace(p, 1));
}
