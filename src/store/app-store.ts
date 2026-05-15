import { create } from 'zustand';

export type TabId = 'home' | 'rides' | 'food' | 'wallet' | 'profile';
export type RideType = 'boda' | 'car' | 'premium';

interface LocationData {
  address: string;
  lat: number;
  lng: number;
}

interface AppState {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;

  // Ride booking
  pickup: LocationData | null;
  dropoff: LocationData | null;
  selectedRideType: RideType;
  rideStep: 'location' | 'vehicle' | 'confirm' | 'tracking';
  setPickup: (loc: LocationData) => void;
  setDropoff: (loc: LocationData) => void;
  setSelectedRideType: (type: RideType) => void;
  setRideStep: (step: 'location' | 'vehicle' | 'confirm' | 'tracking') => void;
  resetRide: () => void;

  // Food delivery
  selectedMerchant: string | null;
  setSelectedMerchant: (id: string | null) => void;

  // Notifications
  unreadNotifications: number;
  setUnreadNotifications: (n: number) => void;
}

const defaultLocation: LocationData = {
  address: 'Kampala, Uganda',
  lat: 0.3476,
  lng: 32.5825,
};

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'home',
  setActiveTab: (tab) => set({ activeTab: tab }),

  pickup: defaultLocation,
  dropoff: null,
  selectedRideType: 'boda',
  rideStep: 'location',
  setPickup: (loc) => set({ pickup: loc }),
  setDropoff: (loc) => set({ dropoff: loc }),
  setSelectedRideType: (type) => set({ selectedRideType: type }),
  setRideStep: (step) => set({ rideStep: step }),
  resetRide: () =>
    set({
      pickup: defaultLocation,
      dropoff: null,
      selectedRideType: 'boda',
      rideStep: 'location',
    }),

  selectedMerchant: null,
  setSelectedMerchant: (id) => set({ selectedMerchant: id }),

  unreadNotifications: 3,
  setUnreadNotifications: (n) => set({ unreadNotifications: n }),
}));
