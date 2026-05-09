/**
 * Smart Ride Location Picker with Real Mapbox Geocoding
 * 
 * Location search that shows:
 * - Specific streets, avenues in Uganda
 * - Restaurants, shops, buildings
 * - Neighborhoods and localities
 * - Real-time search with Mapbox API
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import {
  MapPin,
  Navigation,
  Search,
  Clock,
  Star,
  Home,
  Briefcase,
  X,
  Loader2,
  Locate,
  Store,
  UtensilsCrossed,
  Building,
  Landmark,
} from 'lucide-react';

// ==========================================
// Types
// ==========================================

export interface Location {
  address: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  type?: string;
  category?: string;
}

interface SearchResult {
  id: string;
  name: string;
  address: string;
  fullAddress: string;
  lat: number;
  lng: number;
  type: string[];
  category?: string;
  relevance: number;
}

interface SavedPlace {
  id: string;
  name: string;
  address: string;
  icon: React.ReactNode;
  type: 'home' | 'work' | 'recent' | 'favorite';
  lat?: number;
  lng?: number;
}

interface LocationPickerProps {
  pickup: Location | null;
  destination: Location | null;
  onPickupChange: (location: Location) => void;
  onDestinationChange: (location: Location) => void;
  onSwapLocations?: () => void;
  className?: string;
}

// ==========================================
// Saved Places (Demo)
// ==========================================

const savedPlaces: SavedPlace[] = [
  {
    id: '1',
    name: 'Home',
    address: 'Ntinda, Kampala',
    icon: <Home className="h-4 w-4" />,
    type: 'home',
    lat: 0.3576,
    lng: 32.6125,
  },
  {
    id: '2',
    name: 'Work',
    address: 'Kampala CBD, Parliament Avenue',
    icon: <Briefcase className="h-4 w-4" />,
    type: 'work',
    lat: 0.3176,
    lng: 32.5825,
  },
];

const recentLocations: SavedPlace[] = [
  {
    id: '3',
    name: 'Cafe Javas',
    address: 'Kampala Road',
    icon: <Clock className="h-4 w-4" />,
    type: 'recent',
    lat: 0.3180,
    lng: 32.5815,
  },
  {
    id: '4',
    name: 'Garden City Mall',
    address: 'Yusuf Lule Road',
    icon: <Clock className="h-4 w-4" />,
    type: 'recent',
    lat: 0.3175,
    lng: 32.5900,
  },
  {
    id: '5',
    name: 'Makerere University',
    address: 'Main Gate, Makerere',
    icon: <Star className="h-4 w-4" />,
    type: 'favorite',
    lat: 0.3350,
    lng: 32.5700,
  },
];

// ==========================================
// Get Icon by Category
// ==========================================

function getCategoryIcon(category?: string, type?: string[]): React.ReactNode {
  if (category?.includes('food') || category?.includes('restaurant')) {
    return <UtensilsCrossed className="h-5 w-5 text-orange-400" />;
  }
  if (category?.includes('grocery') || category?.includes('supermarket')) {
    return <Store className="h-5 w-5 text-purple-400" />;
  }
  if (type?.includes('address') || type?.includes('street')) {
    return <MapPin className="h-5 w-5 text-gray-400" />;
  }
  if (type?.includes('poi')) {
    return <Landmark className="h-5 w-5 text-blue-400" />;
  }
  if (type?.includes('place') || type?.includes('locality')) {
    return <Building className="h-5 w-5 text-emerald-400" />;
  }
  return <MapPin className="h-5 w-5 text-gray-400" />;
}

// ==========================================
// Location Picker Component
// ==========================================

export function LocationPicker({
  pickup,
  destination,
  onPickupChange,
  onDestinationChange,
  onSwapLocations,
  className,
}: LocationPickerProps) {
  const [activeField, setActiveField] = useState<'pickup' | 'destination' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const pickupInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search with Mapbox Geocoding API
  const searchPlaces = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await fetch(
        `/api/mapbox/geocoding?search=${encodeURIComponent(query)}&limit=10`
      );
      
      const data = await response.json();

      if (data.success && data.places) {
        setSearchResults(data.places);
      } else {
        setSearchError(data.error || 'No results found');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Failed to search. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchQuery.length >= 2 && activeField) {
      setIsSearching(true);
      debounceRef.current = setTimeout(() => {
        searchPlaces(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, activeField, searchPlaces]);

  const handleLocationSelect = (result: SearchResult, field: 'pickup' | 'destination') => {
    const location: Location = {
      address: result.name,
      lat: result.lat,
      lng: result.lng,
      placeId: result.id,
      type: result.type?.[0],
      category: result.category,
    };

    if (field === 'pickup') {
      onPickupChange(location);
    } else {
      onDestinationChange(location);
    }

    setActiveField(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSavedPlaceSelect = (place: SavedPlace, field: 'pickup' | 'destination') => {
    const location: Location = {
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      placeId: place.id,
    };

    if (field === 'pickup') {
      onPickupChange(location);
    } else {
      onDestinationChange(location);
    }

    setActiveField(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleCurrentLocation = () => {
    setIsSearching(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocode to get address
          try {
            const response = await fetch(
              `/api/mapbox/geocoding?lat=${latitude}&lng=${longitude}`
            );
            const data = await response.json();

            if (data.success && data.places?.length > 0) {
              onPickupChange({
                address: data.places[0].name || 'Current Location',
                lat: latitude,
                lng: longitude,
                fullAddress: data.places[0].fullAddress,
              });
            } else {
              onPickupChange({
                address: 'Current Location',
                lat: latitude,
                lng: longitude,
              });
            }
          } catch {
            onPickupChange({
              address: 'Current Location',
              lat: latitude,
              lng: longitude,
            });
          }
          
          setIsSearching(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          onPickupChange({ address: 'Kampala Central, Kampala' });
          setIsSearching(false);
        },
        { enableHighAccuracy: true }
      );
    } else {
      onPickupChange({ address: 'Kampala Central, Kampala' });
      setIsSearching(false);
    }
  };

  const clearField = (field: 'pickup' | 'destination') => {
    if (field === 'pickup') {
      onPickupChange({ address: '' });
    } else {
      onDestinationChange({ address: '' });
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Location Input Card */}
      <Card className="bg-[#13131A] border-white/5 overflow-hidden">
        <div className="p-4 space-y-0">
          {/* Pickup Input */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={cn(
                "w-3 h-3 rounded-full transition-colors",
                activeField === 'pickup' ? "bg-[#00FF88] animate-pulse" : "bg-[#00FF88]"
              )} />
              {activeField === 'pickup' && (
                <div className="absolute -inset-1 bg-[#00FF88]/30 rounded-full animate-ping" />
              )}
            </div>
            <div className="flex-1 relative">
              <input
                ref={pickupInputRef}
                type="text"
                placeholder="Pickup location"
                value={activeField === 'pickup' ? searchQuery : pickup?.address || ''}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!activeField) setActiveField('pickup');
                }}
                onFocus={() => {
                  setActiveField('pickup');
                  setSearchQuery(pickup?.address || '');
                }}
                className="w-full bg-transparent outline-none text-white placeholder-gray-500 text-base"
              />
              {pickup?.address && activeField !== 'pickup' && (
                <button
                  onClick={() => clearField('pickup')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
            {activeField !== 'pickup' && !pickup?.address && (
              <button
                onClick={handleCurrentLocation}
                className="p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                {isSearching ? (
                  <Loader2 className="h-5 w-5 text-[#00FF88] animate-spin" />
                ) : (
                  <Locate className="h-5 w-5 text-[#00FF88]" />
                )}
              </button>
            )}
          </div>

          {/* Connector Line */}
          <div className="flex items-center gap-3">
            <div className="w-3 flex justify-center">
              <div className="w-0.5 h-6 bg-gradient-to-b from-[#00FF88] to-orange-500" />
            </div>
          </div>

          {/* Destination Input */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-3 h-3 rounded-full transition-colors",
              activeField === 'destination' ? "bg-orange-500 animate-pulse" : "bg-orange-500"
            )} />
            <div className="flex-1 relative">
              <input
                ref={destinationInputRef}
                type="text"
                placeholder="Where to?"
                value={activeField === 'destination' ? searchQuery : destination?.address || ''}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!activeField) setActiveField('destination');
                }}
                onFocus={() => {
                  setActiveField('destination');
                  setSearchQuery(destination?.address || '');
                }}
                className="w-full bg-transparent outline-none text-white placeholder-gray-500 text-base"
              />
              {destination?.address && activeField !== 'destination' && (
                <button
                  onClick={() => clearField('destination')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
            {activeField === 'destination' && destination?.address && (
              <button
                onClick={onSwapLocations}
                className="p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <Navigation className="h-5 w-5 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Search Results or Saved Places */}
      {activeField && (
        <div className="space-y-2">
          {/* Searching Indicator */}
          {isSearching && (
            <Card className="bg-[#13131A] border-white/5 p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-[#00FF88] animate-spin" />
                <p className="text-gray-400">Searching in Uganda...</p>
              </div>
            </Card>
          )}

          {/* Error Message */}
          {searchError && !isSearching && (
            <Card className="bg-[#13131A] border-white/5 p-4">
              <p className="text-red-400 text-sm">{searchError}</p>
            </Card>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <Card className="bg-[#13131A] border-white/5 overflow-hidden">
              <div className="divide-y divide-white/5">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleLocationSelect(result, activeField)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-[#1A1A24] rounded-full flex items-center justify-center">
                      {getCategoryIcon(result.category, result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{result.name}</p>
                      <p className="text-gray-500 text-sm truncate">{result.fullAddress}</p>
                      {result.type && (
                        <p className="text-[#00FF88] text-xs mt-0.5">
                          {result.type.join(', ')}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Saved Places (when no search query) */}
          {searchQuery.length < 2 && !isSearching && (
            <>
              {/* Saved Places */}
              <div className="space-y-2">
                <p className="text-gray-500 text-sm px-1">Saved Places</p>
                <Card className="bg-[#13131A] border-white/5 overflow-hidden">
                  <div className="divide-y divide-white/5">
                    {savedPlaces.map((place) => (
                      <button
                        key={place.id}
                        onClick={() => handleSavedPlaceSelect(place, activeField)}
                        className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left"
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          place.type === 'home' ? "bg-blue-500/20" : "bg-purple-500/20"
                        )}>
                          {place.type === 'home' ? (
                            <Home className="h-5 w-5 text-blue-400" />
                          ) : (
                            <Briefcase className="h-5 w-5 text-purple-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium">{place.name}</p>
                          <p className="text-gray-500 text-sm">{place.address}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Recent Locations */}
              <div className="space-y-2">
                <p className="text-gray-500 text-sm px-1">Recent</p>
                <Card className="bg-[#13131A] border-white/5 overflow-hidden">
                  <div className="divide-y divide-white/5">
                    {recentLocations.map((place) => (
                      <button
                        key={place.id}
                        onClick={() => handleSavedPlaceSelect(place, activeField)}
                        className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left"
                      >
                        <div className="w-10 h-10 bg-[#1A1A24] rounded-full flex items-center justify-center">
                          {place.type === 'recent' ? (
                            <Clock className="h-5 w-5 text-gray-400" />
                          ) : (
                            <Star className="h-5 w-5 text-yellow-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium">{place.name}</p>
                          <p className="text-gray-500 text-sm">{place.address}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Search Tips */}
              <Card className="bg-[#00FF88]/5 border-[#00FF88]/20 p-4">
                <p className="text-[#00FF88] text-sm">
                  💡 Try searching for "Bugolobi", "Cafe Javas", "Jinja Road", or any street name in Uganda
                </p>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default LocationPicker;
