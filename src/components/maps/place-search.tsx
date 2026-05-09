'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  MapPin, 
  X, 
  Loader2, 
  Navigation,
  Clock
} from 'lucide-react';
import {
  searchPlaces,
  reverseGeocode,
  GeocodingResult,
  Coordinates,
} from '@/lib/maps/mapbox-service';

// ==========================================
// Types
// ==========================================

export interface PlaceSearchProps {
  placeholder?: string;
  onPlaceSelect: (place: GeocodingResult) => void;
  onCurrentLocation?: () => void;
  proximity?: Coordinates;
  className?: string;
  defaultValue?: string;
  showCurrentLocation?: boolean;
  recentSearches?: string[];
}

// ==========================================
// Component
// ==========================================

export function PlaceSearch({
  placeholder = 'Search for a place...',
  onPlaceSelect,
  onCurrentLocation,
  proximity,
  className,
  defaultValue = '',
  showCurrentLocation = true,
  recentSearches = [],
}: PlaceSearchProps) {
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // ==========================================
  // Search with debounce
  // ==========================================

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchResults = await searchPlaces(searchQuery, {
        proximity,
        country: 'ug',
        limit: 8,
      });
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [proximity]);

  useEffect(() => {
    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => {
        performSearch(query);
      }, 300);
    } else {
      setResults([]);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  // ==========================================
  // Handle click outside
  // ==========================================

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ==========================================
  // Handle place selection
  // ==========================================

  const handleSelectPlace = (place: GeocodingResult) => {
    onPlaceSelect(place);
    setQuery(place.placeName);
    setIsOpen(false);
    setResults([]);
  };

  // ==========================================
  // Handle current location
  // ==========================================

  const handleCurrentLocation = async () => {
    if (!navigator.geolocation) {
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        const result = await reverseGeocode(coords);
        if (result) {
          handleSelectPlace(result);
        } else {
          // Create a basic result from coordinates
          handleSelectPlace({
            id: 'current-location',
            placeName: 'Current Location',
            address: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
            coordinates: coords,
            placeType: ['address'],
          });
        }
        
        onCurrentLocation?.();
        setIsLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setIsLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // ==========================================
  // Keyboard navigation
  // ==========================================

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectPlace(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  // ==========================================
  // Render
  // ==========================================

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-10 bg-[#1A1A24] border-white/10 text-white placeholder:text-white/40 focus:border-[#00FF88]/50"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-white/5"
            onClick={() => {
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
          >
            <X className="h-4 w-4 text-white/40" />
          </Button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (query.length >= 2 || showCurrentLocation || recentSearches.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A1A24] border border-white/10 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-[#00FF88]" />
              <span className="ml-2 text-white/50">Searching...</span>
            </div>
          )}

          {/* Current Location Button */}
          {showCurrentLocation && !isLoading && (
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5"
              onClick={handleCurrentLocation}
            >
              <div className="w-8 h-8 bg-[#00FF88]/20 rounded-full flex items-center justify-center">
                <Navigation className="h-4 w-4 text-[#00FF88]" />
              </div>
              <div className="text-left flex-1">
                <p className="text-white font-medium">Current Location</p>
                <p className="text-xs text-white/40">Use your current location</p>
              </div>
            </button>
          )}

          {/* Search Results */}
          {!isLoading && results.length > 0 && (
            <div className="py-1">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  type="button"
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left",
                    selectedIndex === index && "bg-white/5"
                  )}
                  onClick={() => handleSelectPlace(result)}
                >
                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="h-4 w-4 text-white/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white truncate">{result.address}</p>
                    <p className="text-xs text-white/40 truncate">{result.placeName}</p>
                    {result.context && (
                      <p className="text-xs text-white/30">
                        {[result.context.locality, result.context.district, result.context.region]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {!isLoading && query.length >= 2 && results.length === 0 && (
            <div className="py-6 text-center">
              <MapPin className="h-8 w-8 text-white/20 mx-auto mb-2" />
              <p className="text-white/50">No places found</p>
              <p className="text-xs text-white/30">Try a different search term</p>
            </div>
          )}

          {/* Recent Searches */}
          {!isLoading && query.length < 2 && recentSearches.length > 0 && (
            <div className="py-1">
              <p className="px-4 py-2 text-xs text-white/40 uppercase tracking-wider">Recent</p>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/5 transition-colors text-left"
                  onClick={() => {
                    setQuery(search);
                    setIsOpen(true);
                  }}
                >
                  <Clock className="h-4 w-4 text-white/30" />
                  <span className="text-white/70 truncate">{search}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PlaceSearch;
