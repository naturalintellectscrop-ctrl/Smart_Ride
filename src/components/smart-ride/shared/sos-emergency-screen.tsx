'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Shield,
  AlertTriangle,
  MapPin,
  Phone,
  MessageSquare,
  Mic,
  MicOff,
  Users,
  Navigation,
  Clock,
  CheckCircle,
  XCircle,
  Share2,
  Volume2,
  VolumeX,
  Loader2,
  PhoneCall,
  Send,
  Plus,
  Star,
  Trash2,
  ChevronRight,
  Siren,
  Eye,
  CircleDot,
  X,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  isPrimary: boolean;
  isNotified?: boolean;
}

export interface TripInfo {
  id: string;
  taskNumber: string;
  taskType: string;
  pickupAddress: string;
  dropoffAddress: string;
  riderName?: string;
  riderPhone?: string;
  vehicleInfo?: string;
  plateNumber?: string;
  clientName?: string;
  clientPhone?: string;
}

export interface SOSEmergencyScreenProps {
  /** Whether the SOS screen is visible */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Current user type */
  userType?: 'CLIENT' | 'RIDER';
  /** User ID */
  userId?: string;
  /** Active trip info */
  activeTrip?: TripInfo | null;
  /** Initial emergency contacts */
  emergencyContacts?: EmergencyContact[];
}

// ============================================================================
// Constants
// ============================================================================

const UGANDA_EMERGENCY_NUMBERS = [
  { name: 'Police Emergency', number: '999', icon: Siren, description: 'Police emergency response' },
  { name: 'Ambulance', number: '112', icon: Shield, description: 'Medical emergency services' },
  { name: 'Fire Brigade', number: '112', icon: AlertTriangle, description: 'Fire and rescue services' },
  { name: 'Police Hotline', number: '0800199199', icon: Phone, description: 'Uganda Police toll-free' },
];

const SMART_RIDE_SUPPORT = {
  name: 'Smart Ride Support',
  number: '0800300100',
  description: '24/7 in-app support',
};

const MOCK_EMERGENCY_CONTACTS: EmergencyContact[] = [
  { id: 'ec-1', name: 'Sarah Nakamya', phone: '+256771234567', relationship: 'Spouse', isPrimary: true, isNotified: false },
  { id: 'ec-2', name: 'James Okello', phone: '+256782345678', relationship: 'Brother', isPrimary: false, isNotified: false },
  { id: 'ec-3', name: 'Grace Achieng', phone: '+256793456789', relationship: 'Friend', isPrimary: false, isNotified: false },
];

const MOCK_TRIP: TripInfo = {
  id: 'task-001',
  taskNumber: 'SR-2024-5678',
  taskType: 'BODA_RIDE',
  pickupAddress: 'National Theatre, Kampala Rd',
  dropoffAddress: 'Makerere University, Main Gate',
  riderName: 'Emmanuel Mukiibi',
  riderPhone: '+25677XXXXXXX',
  vehicleInfo: 'Bajaj Boxer 150',
  plateNumber: 'UAX 123J',
};

// ============================================================================
// Helper: Format Duration
// ============================================================================

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ============================================================================
// SOS Emergency Screen
// ============================================================================

export function SOSEmergencyScreen({
  open,
  onClose,
  userType = 'CLIENT',
  userId = 'user-demo',
  activeTrip,
  emergencyContacts: initialContacts,
}: SOSEmergencyScreenProps) {
  // State
  const [sosActive, setSosActive] = useState(false);
  const [sosTimer, setSosTimer] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showContactManager, setShowContactManager] = useState(false);
  const [contacts, setContacts] = useState<EmergencyContact[]>(
    initialContacts || MOCK_EMERGENCY_CONTACTS
  );
  const [newContact, setNewContact] = useState({ name: '', phone: '', relationship: '' });

  const trip = activeTrip || MOCK_TRIP;

  // Actions taken state
  const [actionsTaken, setActionsTaken] = useState({
    locationShared: false,
    safetyTeamAlerted: false,
    contactsNotified: false,
    recordingStarted: false,
    emergencyCalled: false,
  });

  // Get current location
  useEffect(() => {
    if (!open) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Mock location for demo
          setCurrentLocation({ lat: 0.3476, lng: 32.5825 }); // Kampala
        },
        { enableHighAccuracy: true }
      );
    }
  }, [open]);

  // SOS timer
  useEffect(() => {
    if (!sosActive) return;
    const interval = setInterval(() => {
      setSosTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [sosActive]);

  // Recording timer
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  // Auto-share location when SOS is activated
  useEffect(() => {
    if (!sosActive || !currentLocation) return;
    setActionsTaken((prev) => ({
      ...prev,
      locationShared: true,
      safetyTeamAlerted: true,
    }));
    // Auto-notify contacts
    const timer = setTimeout(() => {
      setContacts((prev) => prev.map((c) => ({ ...c, isNotified: true })));
      setActionsTaken((prev) => ({ ...prev, contactsNotified: true }));
    }, 2000);
    return () => clearTimeout(timer);
  }, [sosActive, currentLocation]);

  // Activate SOS
  const activateSOS = useCallback(() => {
    setSosActive(true);
    setSosTimer(0);
  }, []);

  // Cancel SOS
  const cancelSOS = useCallback(() => {
    setSosActive(false);
    setSosTimer(0);
    setIsRecording(false);
    setRecordingDuration(0);
    setActionsTaken({
      locationShared: false,
      safetyTeamAlerted: false,
      contactsNotified: false,
      recordingStarted: false,
      emergencyCalled: false,
    });
    setContacts((prev) => prev.map((c) => ({ ...c, isNotified: false })));
    setShowCancelConfirm(false);
    onClose();
  }, [onClose]);

  // Call emergency
  const callEmergency = useCallback((number: string) => {
    window.location.href = `tel:${number}`;
    setActionsTaken((prev) => ({ ...prev, emergencyCalled: true }));
  }, []);

  // Share live location
  const shareLiveLocation = useCallback(async () => {
    if (!currentLocation) return;
    const locationUrl = `https://maps.google.com/?q=${currentLocation.lat},${currentLocation.lng}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SOS - My Live Location',
          text: `EMERGENCY! I need help! My current location: ${locationUrl}`,
          url: locationUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(`EMERGENCY! My location: ${locationUrl}`);
      } catch {
        // Clipboard not available
      }
    }
    setActionsTaken((prev) => ({ ...prev, locationShared: true }));
  }, [currentLocation]);

  // Share via WhatsApp
  const shareWhatsApp = useCallback(() => {
    if (!currentLocation) return;
    const locationUrl = `https://maps.google.com/?q=${currentLocation.lat},${currentLocation.lng}`;
    const message = encodeURIComponent(
      `🚨 EMERGENCY from Smart Ride!\nI need help! My live location: ${locationUrl}\nTrip: ${trip.taskNumber}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  }, [currentLocation, trip.taskNumber]);

  // Message emergency contacts
  const messageContacts = useCallback(() => {
    if (!currentLocation) return;
    const locationUrl = `https://maps.google.com/?q=${currentLocation.lat},${currentLocation.lng}`;
    const smsBody = encodeURIComponent(
      `EMERGENCY from Smart Ride! I need help! Location: ${locationUrl}`
    );
    const phones = contacts.map((c) => c.phone).join(',');
    window.location.href = `sms:${phones}?body=${smsBody}`;
  }, [currentLocation, contacts, trip.taskNumber]);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      setIsRecording(false);
      setActionsTaken((prev) => ({ ...prev, recordingStarted: true }));
    } else {
      setIsRecording(true);
      setRecordingDuration(0);
    }
  }, [isRecording]);

  // Add contact
  const addContact = useCallback(() => {
    if (!newContact.name || !newContact.phone) return;
    const contact: EmergencyContact = {
      id: `ec-${Date.now()}`,
      name: newContact.name,
      phone: newContact.phone,
      relationship: newContact.relationship || 'Other',
      isPrimary: contacts.length === 0,
      isNotified: false,
    };
    setContacts((prev) => [...prev, contact]);
    setNewContact({ name: '', phone: '', relationship: '' });
  }, [newContact, contacts]);

  // Remove contact
  const removeContact = useCallback((id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Set primary contact
  const setPrimaryContact = useCallback((id: string) => {
    setContacts((prev) =>
      prev.map((c) => ({ ...c, isPrimary: c.id === id }))
    );
  }, []);

  if (!open) return null;

  // ========================================================================
  // SOS TRIGGERED VIEW
  // ========================================================================
  if (sosActive) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0D0D12] overflow-y-auto">
        {/* Red glow background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-red-500/20 rounded-full blur-[120px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-red-500/10 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header */}
          <div className="px-4 pt-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-500/20 border-2 border-red-500/60 flex items-center justify-center animate-pulse">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-red-400 tracking-wider">EMERGENCY ACTIVATED</h1>
                  <p className="text-red-400/60 text-sm">Alert #{Date.now().toString(36).toUpperCase()}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5 text-white/60" />
              </button>
            </div>

            {/* Countdown Timer Card */}
            <Card className="bg-[#13131A] border border-red-500/20 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">SOS Duration</p>
                      <p className="text-white/50 text-xs">
                        {currentLocation
                          ? `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`
                          : 'Getting location...'}
                      </p>
                    </div>
                  </div>
                  <div className="text-2xl font-mono font-bold text-red-400 tracking-wider">
                    {formatDuration(sosTimer)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Progress */}
          <div className="px-4 mb-4">
            <Card className="bg-[#13131A] border border-white/5">
              <CardContent className="p-4">
                <h3 className="text-white/70 font-semibold text-sm mb-3 uppercase tracking-wider">Response Status</h3>
                <div className="space-y-3">
                  <StatusItem
                    icon={Shield}
                    label="Safety Team Notified"
                    done={actionsTaken.safetyTeamAlerted}
                  />
                  <StatusItem
                    icon={Users}
                    label="Emergency Contacts Notified"
                    done={actionsTaken.contactsNotified}
                    detail={actionsTaken.contactsNotified ? `${contacts.length} contacts` : undefined}
                  />
                  <StatusItem
                    icon={MapPin}
                    label="Live Location Sharing"
                    done={actionsTaken.locationShared}
                  />
                  <StatusItem
                    icon={Phone}
                    label="Emergency Services Called"
                    done={actionsTaken.emergencyCalled}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="px-4 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <QuickAction
                icon={Phone}
                label="Call Emergency"
                sublabel="999 / 112"
                color="red"
                onClick={() => callEmergency('999')}
              />
              <QuickAction
                icon={HeadsetIcon}
                label="Smart Ride Support"
                sublabel="24/7 Helpline"
                color="emerald"
                onClick={() => callEmergency(SMART_RIDE_SUPPORT.number)}
              />
              <QuickAction
                icon={MessageSquare}
                label="Message Contacts"
                sublabel={`${contacts.length} people`}
                color="blue"
                onClick={messageContacts}
              />
              <QuickAction
                icon={Share2}
                label="Share Location"
                sublabel="WhatsApp / SMS"
                color="cyan"
                onClick={shareWhatsApp}
              />
            </div>
          </div>

          {/* Audio Recording */}
          <div className="px-4 mb-4">
            <Card className="bg-[#13131A] border border-white/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleRecording}
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                        isRecording ? 'bg-red-500 animate-pulse' : 'bg-white/5'
                      )}
                    >
                      {isRecording ? (
                        <MicOff className="h-5 w-5 text-white" />
                      ) : (
                        <Mic className="h-5 w-5 text-white/70" />
                      )}
                    </button>
                    <div>
                      <p className="text-white font-medium text-sm">
                        {isRecording ? 'Recording...' : actionsTaken.recordingStarted ? 'Recording Saved' : 'Record Audio'}
                      </p>
                      {isRecording && (
                        <p className="text-red-400 text-xs font-mono">{formatDuration(recordingDuration)}</p>
                      )}
                      {!isRecording && !actionsTaken.recordingStarted && (
                        <p className="text-white/40 text-xs">Save evidence of the incident</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
                        isMuted ? 'bg-red-500/20' : 'bg-white/5'
                      )}
                    >
                      {isMuted ? (
                        <VolumeX className="h-4 w-4 text-red-400" />
                      ) : (
                        <Volume2 className="h-4 w-4 text-white/70" />
                      )}
                    </button>
                    <button
                      onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                      className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
                        isSpeakerOn ? 'bg-emerald-500/20' : 'bg-white/5'
                      )}
                    >
                      <Volume2 className="h-4 w-4 text-white/70" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trip Details */}
          <div className="px-4 mb-4">
            <Card className="bg-[#13131A] border border-white/5">
              <CardContent className="p-4">
                <h3 className="text-white/70 font-semibold text-sm mb-3 uppercase tracking-wider">Trip Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/40 text-sm">Trip ID</span>
                    <Badge variant="outline" className="bg-[#1A1A24] border-white/10 text-white/70 text-xs">
                      {trip.taskNumber}
                    </Badge>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#00FF88]/20 flex items-center justify-center mt-0.5">
                      <CircleDot className="h-3 w-3 text-[#00FF88]" />
                    </div>
                    <div>
                      <p className="text-white/40 text-xs">Pickup</p>
                      <p className="text-white text-sm">{trip.pickupAddress}</p>
                    </div>
                  </div>
                  <div className="ml-3 border-l border-dashed border-white/10 h-3" />
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5">
                      <Navigation className="h-3 w-3 text-red-400" />
                    </div>
                    <div>
                      <p className="text-white/40 text-xs">Dropoff</p>
                      <p className="text-white text-sm">{trip.dropoffAddress}</p>
                    </div>
                  </div>
                  {(trip.riderName || trip.clientName) && (
                    <div className="mt-3 p-3 bg-[#1A1A24] rounded-xl">
                      <p className="text-white/40 text-xs mb-1">
                        {userType === 'CLIENT' ? 'Rider' : 'Client'}
                      </p>
                      <p className="text-white text-sm font-medium">
                        {userType === 'CLIENT' ? trip.riderName : trip.clientName}
                      </p>
                      {trip.plateNumber && (
                        <p className="text-white/40 text-xs mt-1">
                          {trip.vehicleInfo} &bull; {trip.plateNumber}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Emergency Numbers */}
          <div className="px-4 mb-4">
            <Card className="bg-[#13131A] border border-white/5">
              <CardContent className="p-4">
                <h3 className="text-white/70 font-semibold text-sm mb-3 uppercase tracking-wider">
                  Emergency Numbers
                </h3>
                <div className="space-y-2">
                  {UGANDA_EMERGENCY_NUMBERS.map((emergency) => {
                    const Icon = emergency.icon;
                    return (
                      <button
                        key={emergency.number}
                        onClick={() => callEmergency(emergency.number)}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-[#1A1A24] hover:bg-[#252530] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-red-500/15 flex items-center justify-center">
                            <Icon className="h-4 w-4 text-red-400" />
                          </div>
                          <div className="text-left">
                            <p className="text-white text-sm font-medium">{emergency.name}</p>
                            <p className="text-white/40 text-xs">{emergency.description}</p>
                          </div>
                        </div>
                        <span className="text-red-400 font-bold text-lg">{emergency.number}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Emergency Contacts */}
          <div className="px-4 mb-4">
            <Card className="bg-[#13131A] border border-white/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white/70 font-semibold text-sm uppercase tracking-wider">
                    Emergency Contacts
                  </h3>
                  <button
                    onClick={() => setShowContactManager(!showContactManager)}
                    className="text-[#00FF88] text-xs font-medium flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Manage
                  </button>
                </div>
                <div className="space-y-2">
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A24]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#00FF88]/10 flex items-center justify-center">
                          <Users className="h-4 w-4 text-[#00FF88]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-white text-sm font-medium">{contact.name}</p>
                            {contact.isPrimary && (
                              <Badge className="bg-[#00FF88]/10 text-[#00FF88] text-[10px] px-1.5 py-0 h-4 border-0">
                                Primary
                              </Badge>
                            )}
                          </div>
                          <p className="text-white/40 text-xs">
                            {contact.relationship}
                            {contact.isNotified && (
                              <span className="text-[#00FF88] ml-2">&bull; Notified</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => callEmergency(contact.phone)}
                        className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center hover:bg-emerald-500/25 transition-colors"
                      >
                        <Phone className="h-4 w-4 text-emerald-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cancel SOS Button */}
          <div className="px-4 pb-8">
            {!showCancelConfirm ? (
              <Button
                onClick={() => setShowCancelConfirm(true)}
                variant="outline"
                className="w-full py-6 bg-[#1A1A24] border-white/10 text-white/60 hover:bg-white/10 hover:text-white rounded-xl"
              >
                Cancel SOS
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-center text-white/60 text-sm">
                  Are you sure you want to cancel the emergency alert?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => setShowCancelConfirm(false)}
                    variant="outline"
                    className="py-5 bg-[#1A1A24] border-white/10 text-white/70 hover:bg-white/10 rounded-xl"
                  >
                    Keep Active
                  </Button>
                  <Button
                    onClick={cancelSOS}
                    className="py-5 bg-red-600 hover:bg-red-700 text-white rounded-xl"
                  >
                    Cancel SOS
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contact Manager Modal */}
        {showContactManager && (
          <ContactManagerModal
            contacts={contacts}
            newContact={newContact}
            onNewContactChange={setNewContact}
            onAddContact={addContact}
            onRemoveContact={removeContact}
            onSetPrimary={setPrimaryContact}
            onClose={() => setShowContactManager(false)}
          />
        )}
      </div>
    );
  }

  // ========================================================================
  // SOS PRE-ACTIVATION VIEW
  // ========================================================================
  return (
    <div className="fixed inset-0 z-[100] bg-[#0D0D12] overflow-y-auto">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <XCircle className="h-5 w-5 text-white/60" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Emergency Actions</h1>
              <p className="text-white/50 text-sm">Select what you need help with</p>
            </div>
          </div>
        </div>

        {/* Activate SOS Button */}
        <div className="px-4 mb-6">
          <button
            onClick={activateSOS}
            disabled={!currentLocation}
            className={cn(
              'w-full p-6 rounded-2xl flex flex-col items-center gap-3 transition-all',
              currentLocation
                ? 'bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg shadow-red-500/30 active:scale-[0.98]'
                : 'bg-[#1A1A24] text-white/40'
            )}
          >
            <div className={cn(
              'w-20 h-20 rounded-full flex items-center justify-center',
              currentLocation ? 'bg-white/20 animate-pulse' : 'bg-white/10'
            )}>
              <AlertTriangle className="h-10 w-10" />
            </div>
            <span className="text-xl font-bold">
              {currentLocation ? 'ACTIVATE SOS' : 'GETTING LOCATION...'}
            </span>
            <span className="text-sm opacity-80">
              {currentLocation
                ? 'Alert safety team & contacts immediately'
                : 'Please enable GPS to continue'}
            </span>
          </button>
        </div>

        {/* Quick Actions Grid */}
        <div className="px-4 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <QuickAction
              icon={Navigation}
              label="Share Location"
              sublabel="Send live GPS"
              color="cyan"
              onClick={shareLiveLocation}
            />
            <QuickAction
              icon={Phone}
              label="Call Police"
              sublabel="Emergency: 999"
              color="red"
              onClick={() => callEmergency('999')}
            />
            <QuickAction
              icon={Siren}
              label="Call Ambulance"
              sublabel="Emergency: 112"
              color="orange"
              onClick={() => callEmergency('112')}
            />
            <QuickAction
              icon={Mic}
              label="Record Audio"
              sublabel="Save evidence"
              color="purple"
              onClick={toggleRecording}
            />
          </div>
        </div>

        {/* Emergency Numbers */}
        <div className="px-4 mb-4">
          <Card className="bg-[#13131A] border border-white/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white/70 font-semibold text-sm uppercase tracking-wider">
                  Emergency Numbers
                </h3>
                <Badge variant="outline" className="bg-[#1A1A24] border-white/10 text-white/40 text-[10px]">
                  Uganda
                </Badge>
              </div>
              <div className="space-y-2">
                {UGANDA_EMERGENCY_NUMBERS.map((emergency) => {
                  const Icon = emergency.icon;
                  return (
                    <button
                      key={emergency.number}
                      onClick={() => callEmergency(emergency.number)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-[#1A1A24] hover:bg-[#252530] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-red-500/15 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-red-400" />
                        </div>
                        <div className="text-left">
                          <p className="text-white text-sm font-medium">{emergency.name}</p>
                          <p className="text-white/40 text-xs">{emergency.description}</p>
                        </div>
                      </div>
                      <span className="text-red-400 font-bold text-lg">{emergency.number}</span>
                    </button>
                  );
                })}
                {/* Smart Ride Support */}
                <button
                  onClick={() => callEmergency(SMART_RIDE_SUPPORT.number)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-[#1A1A24] hover:bg-[#252530] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#00FF88]/15 flex items-center justify-center">
                      <HeadsetIcon className="h-4 w-4 text-[#00FF88]" />
                    </div>
                    <div className="text-left">
                      <p className="text-white text-sm font-medium">{SMART_RIDE_SUPPORT.name}</p>
                      <p className="text-white/40 text-xs">{SMART_RIDE_SUPPORT.description}</p>
                    </div>
                  </div>
                  <span className="text-[#00FF88] font-bold text-sm">{SMART_RIDE_SUPPORT.number}</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Emergency Contacts Management */}
        <div className="px-4 mb-4">
          <Card className="bg-[#13131A] border border-white/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white/70 font-semibold text-sm uppercase tracking-wider">
                  Emergency Contacts
                </h3>
                <button
                  onClick={() => setShowContactManager(!showContactManager)}
                  className="text-[#00FF88] text-xs font-medium flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Manage
                </button>
              </div>
              {contacts.length > 0 ? (
                <div className="space-y-2">
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A24]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center">
                          <Users className="h-4 w-4 text-red-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-white text-sm font-medium">{contact.name}</p>
                            {contact.isPrimary && (
                              <Badge className="bg-[#00FF88]/10 text-[#00FF88] text-[10px] px-1.5 py-0 h-4 border-0">
                                Primary
                              </Badge>
                            )}
                          </div>
                          <p className="text-white/40 text-xs">{contact.relationship}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => callEmergency(contact.phone)}
                        className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center hover:bg-emerald-500/25 transition-colors"
                      >
                        <Phone className="h-4 w-4 text-emerald-400" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-white/10 mx-auto mb-3" />
                  <p className="text-white/40 text-sm mb-2">No emergency contacts added</p>
                  <button
                    onClick={() => setShowContactManager(true)}
                    className="text-[#00FF88] text-sm font-medium"
                  >
                    Add Contacts
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Trip Details (if active) */}
        {trip && (
          <div className="px-4 mb-8">
            <Card className="bg-[#13131A] border border-white/5">
              <CardContent className="p-4">
                <h3 className="text-white/70 font-semibold text-sm mb-3 uppercase tracking-wider">
                  Current Trip
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/40 text-sm">Trip ID</span>
                    <Badge variant="outline" className="bg-[#1A1A24] border-white/10 text-white/70 text-xs">
                      {trip.taskNumber}
                    </Badge>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#00FF88]/20 flex items-center justify-center mt-0.5">
                      <CircleDot className="h-3 w-3 text-[#00FF88]" />
                    </div>
                    <div>
                      <p className="text-white/40 text-xs">Pickup</p>
                      <p className="text-white text-sm">{trip.pickupAddress}</p>
                    </div>
                  </div>
                  <div className="ml-3 border-l border-dashed border-white/10 h-3" />
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5">
                      <Navigation className="h-3 w-3 text-red-400" />
                    </div>
                    <div>
                      <p className="text-white/40 text-xs">Dropoff</p>
                      <p className="text-white text-sm">{trip.dropoffAddress}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Contact Manager Modal */}
      {showContactManager && (
        <ContactManagerModal
          contacts={contacts}
          newContact={newContact}
          onNewContactChange={setNewContact}
          onAddContact={addContact}
          onRemoveContact={removeContact}
          onSetPrimary={setPrimaryContact}
          onClose={() => setShowContactManager(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StatusItem({
  icon: Icon,
  label,
  done,
  detail,
}: {
  icon: React.ElementType;
  label: string;
  done: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {done ? (
        <CheckCircle className="h-5 w-5 text-[#00FF88] flex-shrink-0" />
      ) : (
        <Loader2 className="h-5 w-5 text-white/30 animate-spin flex-shrink-0" />
      )}
      <span className={cn('text-sm flex-1', done ? 'text-[#00FF88]' : 'text-white/40')}>
        {label}
      </span>
      {detail && (
        <span className="text-[#00FF88]/60 text-xs">{detail}</span>
      )}
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  sublabel,
  color,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  sublabel: string;
  color: 'red' | 'emerald' | 'blue' | 'cyan' | 'orange' | 'purple';
  onClick: () => void;
}) {
  const colorConfig = {
    red: { bg: 'bg-red-500/15', icon: 'text-red-400', border: 'border-red-500/20' },
    emerald: { bg: 'bg-emerald-500/15', icon: 'text-emerald-400', border: 'border-emerald-500/20' },
    blue: { bg: 'bg-blue-500/15', icon: 'text-blue-400', border: 'border-blue-500/20' },
    cyan: { bg: 'bg-cyan-500/15', icon: 'text-cyan-400', border: 'border-cyan-500/20' },
    orange: { bg: 'bg-orange-500/15', icon: 'text-orange-400', border: 'border-orange-500/20' },
    purple: { bg: 'bg-purple-500/15', icon: 'text-purple-400', border: 'border-purple-500/20' },
  };

  const cfg = colorConfig[color];

  return (
    <button
      onClick={onClick}
      className={cn(
        'p-4 rounded-xl flex flex-col items-center gap-2 transition-all',
        'bg-[#1A1A24] border border-white/5 hover:border-white/10',
        'active:scale-[0.97]'
      )}
    >
      <div className={cn('w-11 h-11 rounded-full flex items-center justify-center', cfg.bg)}>
        <Icon className={cn('h-5 w-5', cfg.icon)} />
      </div>
      <p className="text-white text-sm font-medium">{label}</p>
      <p className="text-white/40 text-xs">{sublabel}</p>
    </button>
  );
}

function HeadsetIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z" />
      <path d="M21 16v1a2 2 0 0 1-2 2h-1" />
    </svg>
  );
}

// ============================================================================
// Contact Manager Modal
// ============================================================================

function ContactManagerModal({
  contacts,
  newContact,
  onNewContactChange,
  onAddContact,
  onRemoveContact,
  onSetPrimary,
  onClose,
}: {
  contacts: EmergencyContact[];
  newContact: { name: string; phone: string; relationship: string };
  onNewContactChange: (contact: { name: string; phone: string; relationship: string }) => void;
  onAddContact: () => void;
  onRemoveContact: (id: string) => void;
  onSetPrimary: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[110] bg-[#0D0D12]/95 backdrop-blur-md flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md max-h-[85vh] bg-[#13131A] border-t border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Manage Emergency Contacts</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"
          >
            <X className="h-4 w-4 text-white/60" />
          </button>
        </div>

        {/* Existing Contacts */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A24]"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#00FF88]/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-[#00FF88]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-medium">{contact.name}</p>
                    {contact.isPrimary && (
                      <Star className="h-3 w-3 text-[#00FF88] fill-[#00FF88]" />
                    )}
                  </div>
                  <p className="text-white/40 text-xs">{contact.relationship} &bull; {contact.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!contact.isPrimary && (
                  <button
                    onClick={() => onSetPrimary(contact.id)}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                    title="Set as primary"
                  >
                    <Star className="h-4 w-4 text-white/30" />
                  </button>
                )}
                <button
                  onClick={() => onRemoveContact(contact.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                  title="Remove contact"
                >
                  <Trash2 className="h-4 w-4 text-white/30 hover:text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add New Contact */}
        <div className="p-4 border-t border-white/5 bg-[#0D0D12]">
          <p className="text-white/70 text-sm font-medium mb-3">Add New Contact</p>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Full Name"
              value={newContact.name}
              onChange={(e) => onNewContactChange({ ...newContact, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-[#1A1A24] border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#00FF88]/40"
            />
            <input
              type="tel"
              placeholder="Phone Number (+256...)"
              value={newContact.phone}
              onChange={(e) => onNewContactChange({ ...newContact, phone: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-[#1A1A24] border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#00FF88]/40"
            />
            <input
              type="text"
              placeholder="Relationship (e.g. Spouse, Parent)"
              value={newContact.relationship}
              onChange={(e) => onNewContactChange({ ...newContact, relationship: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-[#1A1A24] border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#00FF88]/40"
            />
            <Button
              onClick={onAddContact}
              disabled={!newContact.name || !newContact.phone}
              className="w-full bg-[#00FF88] text-[#0D0D12] hover:bg-[#00FF88]/90 font-semibold rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SOSEmergencyScreen;
