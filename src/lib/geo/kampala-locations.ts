/**
 * Known Kampala neighbourhoods with coordinates.
 *
 * Shared because two client screens need it: item-delivery uses it to geocode
 * a typed address, and the ride booking screen renders it as "Popular
 * Locations". It previously lived only in item-delivery-screen, so the booking
 * screen referenced an undefined identifier and threw a ReferenceError when
 * that section rendered.
 */

export interface KampalaLocation {
  name: string;
  lat: number;
  lng: number;
}

export const KAMPALA_LOCATIONS: KampalaLocation[] = [
  { name: 'Nakasero', lat: 0.3180, lng: 32.5810 },
  { name: 'Kololo', lat: 0.3330, lng: 32.5870 },
  { name: 'Ntinda', lat: 0.3510, lng: 32.6120 },
  { name: 'Kampala CBD', lat: 0.3150, lng: 32.5710 },
  { name: 'Makindye', lat: 0.2930, lng: 32.5780 },
  { name: 'Mengo', lat: 0.3050, lng: 32.5580 },
  { name: 'Kisenyi', lat: 0.3160, lng: 32.5610 },
  { name: 'Katwe', lat: 0.3090, lng: 32.5700 },
  { name: 'Wandegeya', lat: 0.3390, lng: 32.5730 },
  { name: 'Kamwokya', lat: 0.3320, lng: 32.5780 },
  { name: 'Kiswa', lat: 0.3280, lng: 32.6020 },
  { name: 'Bugolobi', lat: 0.3150, lng: 32.6050 },
];

/** Resolve a free-text address to a known location, or null. */
export function findKampalaLocation(address: string): KampalaLocation | null {
  const needle = address.toLowerCase();
  return KAMPALA_LOCATIONS.find(loc => needle.includes(loc.name.toLowerCase())) ?? null;
}
