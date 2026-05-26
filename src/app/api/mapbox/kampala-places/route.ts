/**
 * Kampala Popular Places API
 *
 * Returns a curated list of popular Kampala locations with coordinates.
 * This supplements Mapbox geocoding which often lacks Kampala POIs.
 *
 * Supports:
 *  - Category filtering (?category=shopping)
 *  - Search filtering (?search=ntinda)
 *  - Nearby sorting (?lat=0.34&lng=32.58)
 *
 * Endpoint: /api/mapbox/kampala-places
 */

import { NextRequest, NextResponse } from 'next/server';

// ==========================================
// Curated Kampala Places Database
// ==========================================

interface KampalaPlace {
  id: string;
  name: string;
  category: 'neighborhood' | 'shopping' | 'restaurant' | 'landmark' | 'education' | 'hospital' | 'airport' | 'government' | 'hotel' | 'road' | 'religious';
  address: string;
  fullAddress: string;
  lat: number;
  lng: number;
  description?: string;
  popular?: boolean; // flag for most popular places
}

const KAMPALA_PLACES: KampalaPlace[] = [
  // ---- Neighborhoods ----
  {
    id: 'kla-ntinda',
    name: 'Ntinda',
    category: 'neighborhood',
    address: 'Ntinda',
    fullAddress: 'Ntinda, Kampala, Uganda',
    lat: 0.3544,
    lng: 32.6136,
    description: 'Busy residential & commercial area',
    popular: true,
  },
  {
    id: 'kla-kololo',
    name: 'Kololo',
    category: 'neighborhood',
    address: 'Kololo',
    fullAddress: 'Kololo, Kampala, Uganda',
    lat: 0.3290,
    lng: 32.5880,
    description: 'Upscale neighborhood, diplomatic area',
    popular: true,
  },
  {
    id: 'kla-nakasero',
    name: 'Nakasero',
    category: 'neighborhood',
    address: 'Nakasero Hill',
    fullAddress: 'Nakasero, Kampala, Uganda',
    lat: 0.3150,
    lng: 32.5800,
    description: 'Central hill with government offices & markets',
    popular: true,
  },
  {
    id: 'kla-bugolobi',
    name: 'Bugolobi',
    category: 'neighborhood',
    address: 'Bugolobi',
    fullAddress: 'Bugolobi, Kampala, Uganda',
    lat: 0.3139,
    lng: 32.6220,
    description: 'Residential area with Village Mall',
    popular: true,
  },
  {
    id: 'kla-muyenga',
    name: 'Muyenga',
    category: 'neighborhood',
    address: 'Muyenga Hill',
    fullAddress: 'Muyenga, Kampala, Uganda',
    lat: 0.2960,
    lng: 32.5960,
    description: 'Upscale residential hill area',
    popular: true,
  },
  {
    id: 'kla-makindye',
    name: 'Makindye',
    category: 'neighborhood',
    address: 'Makindye',
    fullAddress: 'Makindye, Kampala, Uganda',
    lat: 0.2840,
    lng: 32.5780,
    description: 'Suburban residential area',
  },
  {
    id: 'kla-kiswa',
    name: 'Kiswa',
    category: 'neighborhood',
    address: 'Kiswa',
    fullAddress: 'Kiswa, Bugolobi, Kampala, Uganda',
    lat: 0.3120,
    lng: 32.6270,
    description: 'Quiet residential neighborhood',
  },
  {
    id: 'kla-lugogo',
    name: 'Lugogo',
    category: 'neighborhood',
    address: 'Lugogo',
    fullAddress: 'Lugogo, Kampala, Uganda',
    lat: 0.3275,
    lng: 32.6000,
    description: 'Shopping and entertainment area',
    popular: true,
  },
  {
    id: 'kla-kamwokya',
    name: 'Kamwokya',
    category: 'neighborhood',
    address: 'Kamwokya',
    fullAddress: 'Kamwokya, Kampala, Uganda',
    lat: 0.3340,
    lng: 32.5810,
    description: 'Busy market area',
  },
  {
    id: 'kla-wandegeya',
    name: 'Wandegeya',
    category: 'neighborhood',
    address: 'Wandegeya',
    fullAddress: 'Wandegeya, Kampala, Uganda',
    lat: 0.3400,
    lng: 32.5730,
    description: 'University-area commercial hub',
  },
  {
    id: 'kla-kabalagala',
    name: 'Kabalagala',
    category: 'neighborhood',
    address: 'Kabalagala',
    fullAddress: 'Kabalagala, Kampala, Uganda',
    lat: 0.3020,
    lng: 32.5900,
    description: 'Nightlife and expat area',
  },
  {
    id: 'kla-kansanga',
    name: 'Kansanga',
    category: 'neighborhood',
    address: 'Kansanga',
    fullAddress: 'Kansanga, Kampala, Uganda',
    lat: 0.2990,
    lng: 32.6050,
    description: 'Student and residential area',
  },
  {
    id: 'kla-munyonyo',
    name: 'Munyonyo',
    category: 'neighborhood',
    address: 'Munyonyo',
    fullAddress: 'Munyonyo, Kampala, Uganda',
    lat: 0.2400,
    lng: 32.6300,
    description: 'Lakeside area with resorts',
  },
  {
    id: 'kla-kawempe',
    name: 'Kawempe',
    category: 'neighborhood',
    address: 'Kawempe',
    fullAddress: 'Kawempe, Kampala, Uganda',
    lat: 0.3800,
    lng: 32.5550,
    description: 'Northern Kampala suburb',
  },
  {
    id: 'kla-naalya',
    name: 'Naalya',
    category: 'neighborhood',
    address: 'Naalya',
    fullAddress: 'Naalya, Kampala, Uganda',
    lat: 0.3710,
    lng: 32.6440,
    description: 'Growing residential area with Metroplex Mall',
  },
  {
    id: 'kla-namugongo',
    name: 'Namugongo',
    category: 'neighborhood',
    address: 'Namugongo',
    fullAddress: 'Namugongo, Kampala, Uganda',
    lat: 0.3710,
    lng: 32.6540,
    description: 'Home to Uganda Martyrs Shrine',
  },
  {
    id: 'kla-bweyogerere',
    name: 'Bweyogerere',
    category: 'neighborhood',
    address: 'Bweyogerere',
    fullAddress: 'Bweyogerere, Kampala, Uganda',
    lat: 0.3580,
    lng: 32.6700,
    description: 'Eastern suburb on Jinja Road',
  },
  {
    id: 'kla-kireka',
    name: 'Kireka',
    category: 'neighborhood',
    address: 'Kireka',
    fullAddress: 'Kireka, Kampala, Uganda',
    lat: 0.3510,
    lng: 32.6520,
    description: 'Busy junction on Jinja Road',
  },
  {
    id: 'kla-mpererwe',
    name: 'Mpererwe',
    category: 'neighborhood',
    address: 'Mpererwe',
    fullAddress: 'Mpererwe, Kampala, Uganda',
    lat: 0.3700,
    lng: 32.5800,
    description: 'Northern residential area',
  },
  {
    id: 'kla-lubowa',
    name: 'Lubowa',
    category: 'neighborhood',
    address: 'Lubowa',
    fullAddress: 'Lubowa, Entebbe Road, Uganda',
    lat: 0.2500,
    lng: 32.5600,
    description: 'Growing suburb on Entebbe Road',
  },
  {
    id: 'kla-old-kampala',
    name: 'Old Kampala',
    category: 'neighborhood',
    address: 'Old Kampala Hill',
    fullAddress: 'Old Kampala, Kampala, Uganda',
    lat: 0.3170,
    lng: 32.5680,
    description: 'Historic area with National Mosque',
  },
  {
    id: 'kla-mulago',
    name: 'Mulago',
    category: 'neighborhood',
    address: 'Mulago Hill',
    fullAddress: 'Mulago, Kampala, Uganda',
    lat: 0.3420,
    lng: 32.5730,
    description: 'Hospital and university area',
  },

  // ---- Shopping ----
  {
    id: 'kla-acacia-mall',
    name: 'Acacia Mall',
    category: 'shopping',
    address: 'Kololo',
    fullAddress: 'Acacia Mall, Kololo, Kampala, Uganda',
    lat: 0.3328,
    lng: 32.5883,
    description: 'Premium shopping mall in Kololo',
    popular: true,
  },
  {
    id: 'kla-garden-city',
    name: 'Garden City Mall',
    category: 'shopping',
    address: 'Yusuf Lule Road',
    fullAddress: 'Garden City Mall, Yusuf Lule Road, Kampala, Uganda',
    lat: 0.3175,
    lng: 32.5900,
    description: 'Popular mall on Yusuf Lule Road',
    popular: true,
  },
  {
    id: 'kla-metroplex',
    name: 'Metroplex Shopping Mall',
    category: 'shopping',
    address: 'Naalya',
    fullAddress: 'Metroplex Shopping Mall, Naalya, Kampala, Uganda',
    lat: 0.3710,
    lng: 32.6440,
    description: 'Major mall on the eastern side',
    popular: true,
  },
  {
    id: 'kla-freedom-city',
    name: 'Freedom City Mall',
    category: 'shopping',
    address: 'Entebbe Road',
    fullAddress: 'Freedom City Mall, Entebbe Road, Kampala, Uganda',
    lat: 0.2970,
    lng: 32.5690,
    description: 'Shopping on Entebbe Road',
    popular: true,
  },
  {
    id: 'kla-village-mall',
    name: 'Village Mall Bugolobi',
    category: 'shopping',
    address: 'Bugolobi',
    fullAddress: 'Village Mall, Bugolobi, Kampala, Uganda',
    lat: 0.3110,
    lng: 32.6200,
    description: 'Neighborhood mall in Bugolobi',
    popular: true,
  },
  {
    id: 'kla-oasis-mall',
    name: 'Oasis Mall',
    category: 'shopping',
    address: 'Kampala Road',
    fullAddress: 'Oasis Mall, Kampala Road, Kampala, Uganda',
    lat: 0.3170,
    lng: 32.5810,
    description: 'Downtown shopping mall',
  },
  {
    id: 'kla-lugwave-mall',
    name: 'Lugwave Mall',
    category: 'shopping',
    address: 'Lugogo',
    fullAddress: 'Lugwave Mall, Lugogo, Kampala, Uganda',
    lat: 0.3275,
    lng: 32.6000,
    description: 'Shopping in Lugogo area',
  },
  {
    id: 'kla-capital-shoppers',
    name: 'Capital Shoppers',
    category: 'shopping',
    address: 'Kampala Road',
    fullAddress: 'Capital Shoppers, Kampala Road, Kampala, Uganda',
    lat: 0.3172,
    lng: 32.5795,
    description: 'Supermarket on Kampala Road',
  },

  // ---- Restaurants ----
  {
    id: 'kla-cafe-javas',
    name: 'Cafe Javas',
    category: 'restaurant',
    address: 'Kampala Road',
    fullAddress: 'Cafe Javas, Kampala Road, Kampala, Uganda',
    lat: 0.3180,
    lng: 32.5815,
    description: 'Popular restaurant chain',
    popular: true,
  },
  {
    id: 'kla-java-house',
    name: 'Java House',
    category: 'restaurant',
    address: 'Kampala Road',
    fullAddress: 'Java House, Kampala Road, Kampala, Uganda',
    lat: 0.3175,
    lng: 32.5810,
    description: 'Coffee house and restaurant',
  },

  // ---- Landmarks ----
  {
    id: 'kla-parliament',
    name: 'Parliament of Uganda',
    category: 'landmark',
    address: 'Parliament Avenue',
    fullAddress: 'Parliament of Uganda, Parliament Avenue, Kampala, Uganda',
    lat: 0.3176,
    lng: 32.5825,
    description: 'National legislature',
    popular: true,
  },
  {
    id: 'kla-independence-square',
    name: 'Independence Square',
    category: 'landmark',
    address: 'Kololo',
    fullAddress: 'Independence Square, Kololo, Kampala, Uganda',
    lat: 0.3290,
    lng: 32.5860,
    description: 'Historic ceremonial grounds',
  },
  {
    id: 'kla-uganda-museum',
    name: 'Uganda Museum',
    category: 'landmark',
    address: 'Kitante Road',
    fullAddress: 'Uganda Museum, Kitante Road, Kampala, Uganda',
    lat: 0.3310,
    lng: 32.5760,
    description: 'National museum of Uganda',
    popular: true,
  },
  {
    id: 'kla-kasubi-tombs',
    name: 'Kasubi Tombs',
    category: 'landmark',
    address: 'Kasubi',
    fullAddress: 'Kasubi Tombs, Kasubi, Kampala, Uganda',
    lat: 0.3480,
    lng: 32.5550,
    description: 'UNESCO World Heritage Site',
    popular: true,
  },

  // ---- Religious ----
  {
    id: 'kla-namugongo-shrine',
    name: 'Uganda Martyrs Shrine',
    category: 'religious',
    address: 'Namugongo',
    fullAddress: 'Uganda Martyrs Shrine, Namugongo, Kampala, Uganda',
    lat: 0.3710,
    lng: 32.6540,
    description: 'Major Catholic pilgrimage site',
    popular: true,
  },
  {
    id: 'kla-national-mosque',
    name: 'Uganda National Mosque',
    category: 'religious',
    address: 'Old Kampala Hill',
    fullAddress: 'Uganda National Mosque, Old Kampala Hill, Kampala, Uganda',
    lat: 0.3170,
    lng: 32.5680,
    description: 'National mosque on Old Kampala Hill',
    popular: true,
  },
  {
    id: 'kla-namirembe-cathedral',
    name: 'Namirembe Cathedral',
    category: 'religious',
    address: 'Namirembe Hill',
    fullAddress: 'Namirembe Cathedral, Namirembe Hill, Kampala, Uganda',
    lat: 0.3210,
    lng: 32.5650,
    description: 'Historic Anglican cathedral',
  },
  {
    id: 'kla-rubaga-cathedral',
    name: 'Rubaga Cathedral',
    category: 'religious',
    address: 'Rubaga Hill',
    fullAddress: 'Rubaga Cathedral, Rubaga Hill, Kampala, Uganda',
    lat: 0.3090,
    lng: 32.5570,
    description: 'Roman Catholic cathedral',
  },

  // ---- Education ----
  {
    id: 'kla-makerere',
    name: 'Makerere University',
    category: 'education',
    address: 'Makerere Hill',
    fullAddress: 'Makerere University, Makerere Hill, Kampala, Uganda',
    lat: 0.3350,
    lng: 32.5700,
    description: "Uganda's oldest and largest university",
    popular: true,
  },
  {
    id: 'kla-mubs',
    name: 'Makerere University Business School',
    category: 'education',
    address: 'Nakawa',
    fullAddress: 'MUBS, Nakawa, Kampala, Uganda',
    lat: 0.3210,
    lng: 32.6190,
    description: 'Business school in Nakawa',
  },

  // ---- Hospital ----
  {
    id: 'kla-mulago-hospital',
    name: 'Mulago Hospital',
    category: 'hospital',
    address: 'Mulago Hill',
    fullAddress: 'Mulago National Referral Hospital, Mulago Hill, Kampala, Uganda',
    lat: 0.3420,
    lng: 32.5730,
    description: "Uganda's national referral hospital",
    popular: true,
  },

  // ---- Airport ----
  {
    id: 'kla-entebbe-airport',
    name: 'Entebbe International Airport',
    category: 'airport',
    address: 'Entebbe',
    fullAddress: 'Entebbe International Airport, Entebbe, Uganda',
    lat: 0.0480,
    lng: 32.4430,
    description: "Uganda's main international airport",
    popular: true,
  },

  // ---- Hotels ----
  {
    id: 'kla-serena-hotel',
    name: 'Kampala Serena Hotel',
    category: 'hotel',
    address: 'Kintu Road',
    fullAddress: 'Kampala Serena Hotel, Kintu Road, Kampala, Uganda',
    lat: 0.3190,
    lng: 32.5820,
    description: '5-star luxury hotel',
    popular: true,
  },
  {
    id: 'kla-speke-hotel',
    name: 'Speke Hotel',
    category: 'hotel',
    address: 'Kampala Road',
    fullAddress: 'Speke Hotel, Kampala Road, Kampala, Uganda',
    lat: 0.3175,
    lng: 32.5800,
    description: 'Central hotel on Kampala Road',
  },
  {
    id: 'kla-munyonyo-resort',
    name: 'Speke Resort Munyonyo',
    category: 'hotel',
    address: 'Munyonyo',
    fullAddress: 'Speke Resort Munyonyo, Munyonyo, Kampala, Uganda',
    lat: 0.2400,
    lng: 32.6300,
    description: 'Lakeside conference resort',
  },

  // ---- Roads ----
  {
    id: 'kla-kampala-road',
    name: 'Kampala Road',
    category: 'road',
    address: 'Kampala CBD',
    fullAddress: 'Kampala Road, Kampala, Uganda',
    lat: 0.3175,
    lng: 32.5810,
    description: 'Main street in the city center',
    popular: true,
  },
  {
    id: 'kla-jinja-road',
    name: 'Jinja Road',
    category: 'road',
    address: 'Kampala',
    fullAddress: 'Jinja Road, Kampala, Uganda',
    lat: 0.3210,
    lng: 32.6050,
    description: 'Major road heading east',
    popular: true,
  },
  {
    id: 'kla-entebbe-road',
    name: 'Entebbe Road',
    category: 'road',
    address: 'Kampala',
    fullAddress: 'Entebbe Road, Kampala, Uganda',
    lat: 0.2900,
    lng: 32.5750,
    description: 'Road to Entebbe and the airport',
    popular: true,
  },
  {
    id: 'kla-bombo-road',
    name: 'Bombo Road',
    category: 'road',
    address: 'Kawempe',
    fullAddress: 'Bombo Road, Kawempe, Kampala, Uganda',
    lat: 0.3700,
    lng: 32.5550,
    description: 'Road heading north',
  },
  {
    id: 'kla-gayaza-road',
    name: 'Gayaza Road',
    category: 'road',
    address: 'Kampala',
    fullAddress: 'Gayaza Road, Kampala, Uganda',
    lat: 0.3600,
    lng: 32.5750,
    description: 'Road heading north-east',
  },

  // ---- Government ----
  {
    id: 'kla-state-house',
    name: 'State House Entebbe',
    category: 'government',
    address: 'Entebbe',
    fullAddress: 'State House, Entebbe, Uganda',
    lat: 0.0550,
    lng: 32.4550,
    description: "President's official residence",
  },
];

// ==========================================
// Category icons mapping (for frontend reference)
// ==========================================

const CATEGORY_LABELS: Record<string, string> = {
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

// ==========================================
// GET Handler
// ==========================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const popularOnly = searchParams.get('popular') === 'true';
  const limit = parseInt(searchParams.get('limit') || '50');

  let places = [...KAMPALA_PLACES];

  // Filter by category
  if (category) {
    const categories = category.split(',');
    places = places.filter((p) => categories.includes(p.category));
  }

  // Filter by popularity
  if (popularOnly) {
    places = places.filter((p) => p.popular);
  }

  // Search filter
  if (search) {
    const q = search.toLowerCase().trim();
    const words = q.split(/\s+/);
    places = places.filter((p) => {
      const searchable = `${p.name} ${p.address} ${p.fullAddress} ${p.description || ''}`.toLowerCase();
      return words.every((w) => w.length > 0 && searchable.includes(w));
    });
  }

  // Sort by distance if coordinates provided
  if (lat && lng) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    places.sort((a, b) => {
      const distA = Math.sqrt(Math.pow(a.lat - latNum, 2) + Math.pow(a.lng - lngNum, 2));
      const distB = Math.sqrt(Math.pow(b.lat - latNum, 2) + Math.pow(b.lng - lngNum, 2));
      return distA - distB;
    });
  }

  // Apply limit
  places = places.slice(0, limit);

  return NextResponse.json({
    success: true,
    places: places.map(({ popular, description, ...rest }) => ({
      ...rest,
      description: description || undefined,
      popular: popular || false,
    })),
    categories: CATEGORY_LABELS,
    total: KAMPALA_PLACES.length,
    filtered: places.length,
  });
}
