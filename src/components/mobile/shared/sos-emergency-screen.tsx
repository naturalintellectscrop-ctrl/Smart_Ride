'use client';

import { useState, useEffect, useCallback } from 'react';
import { MobileCard } from './mobile-components';
import {
  Shield,
  AlertTriangle,
  MapPin,
  Phone,
  MessageSquare,
  Mic,
  Users,
  Navigation,
  Radio,
  Clock,
  CheckCircle,
  XCircle,
  Share2,
  Bell,
  FileText,
  ChevronRight,
  Play,
  Square,
  Loader2,
  Crosshair,
  ExternalLink,
  Headphones
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MaskedCallButton } from '@/components/shared/masked-call-button';
import { maskPhoneNumber } from '@/lib/calling/masked-calling-service';

interface SOSActionsScreenProps {
  userType: 'CLIENT' | 'RIDER';
  userId: string;
  activeTask?: {
    id: string;
    taskNumber: string;
    taskType: string;
    pickupAddress: string;
    dropoffAddress: string;
    riderInfo?: {
      id?: string;
      name: string;
      phone: string;
      vehicleMake?: string;
      vehicleModel?: string;
      plateNumber?: string;
    };
    clientInfo?: {
      id?: string;
      name: string;
      phone: string;
    };
  };
  onClose: () => void;
}

// Uganda emergency numbers
const EMERGENCY_NUMBERS = [
  { name: 'Police Emergency', number: '999', description: 'Police emergency response' },
  { name: 'Ambulance', number: '911', description: 'Medical emergency ambulance' },
  { name: 'Fire Brigade', number: '112', description: 'Fire and rescue services' },
  { name: 'Police Hotline', number: '0800199199', description: 'Uganda Police toll-free' },
];

export function SOSEmergencyScreen({ userType, userId, activeTask, onClose }: SOSActionsScreenProps) {
  const [sosTriggered, setSosTriggered] = useState(false);
  const [sosAlertId, setSosAlertId] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [emergencyContacts, setEmergencyContacts] = useState<Array<{
    id: string;
    name: string;
    phone: string;
    relationship: string;
    isPrimary: boolean;
  }>>([]);
  const [actionsTaken, setActionsTaken] = useState({
    locationShared: false,
    safetyTeamAlerted: false,
    contactsNotified: false,
    recordingStarted: false,
    emergencyServicesCalled: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Fetch emergency contacts
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await fetch(`/api/emergency-contacts?userId=${userId}&userType=${userType}`);
        if (response.ok) {
          const data = await response.json();
          setEmergencyContacts(data.contacts);
        }
      } catch (error) {
        console.error('Error fetching emergency contacts:', error);
      }
    };
    fetchContacts();
  }, [userId, userType]);

  // Trigger SOS
  const triggerSOS = async () => {
    if (!currentLocation) {
      alert('Unable to get your location. Please enable GPS.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userType === 'CLIENT' ? userId : null,
          riderId: userType === 'RIDER' ? userId : null,
          userType,
          taskId: activeTask?.id,
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
          alertType: 'MANUAL',
          tripData: activeTask ? {
            taskNumber: activeTask.taskNumber,
            taskType: activeTask.taskType,
            pickupAddress: activeTask.pickupAddress,
            dropoffAddress: activeTask.dropoffAddress,
            rider: activeTask.riderInfo,
            client: activeTask.clientInfo,
          } : null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSosAlertId(data.alert.id);
        setSosTriggered(true);
        setActionsTaken(prev => ({
          ...prev,
          safetyTeamAlerted: true,
          contactsNotified: data.alert.emergencyContactsNotified > 0,
        }));
      }
    } catch (error) {
      console.error('Error triggering SOS:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Share live location
  const shareLiveLocation = async () => {
    if (!sosAlertId || !currentLocation) return;

    setIsLoading(true);
    try {
      // Update actions
      await fetch(`/api/sos/${sosAlertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationShared: true }),
      });

      // Share via Web Share API if available
      if (navigator.share) {
        const locationUrl = `https://maps.google.com/?q=${currentLocation.lat},${currentLocation.lng}`;
        await navigator.share({
          title: 'SOS - My Live Location',
          text: `I need help! My current location: ${locationUrl}`,
          url: locationUrl,
        });
      }

      setActionsTaken(prev => ({ ...prev, locationShared: true }));
    } catch (error) {
      console.error('Error sharing location:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Call emergency services
  const callEmergency = (number: string) => {
    window.location.href = `tel:${number}`;
    setActionsTaken(prev => ({ ...prev, emergencyServicesCalled: true }));
  };

  // Notify contacts
  const notifyContacts = async () => {
    if (!sosAlertId) return;

    // In production, this would send SMS/WhatsApp to contacts
    setActionsTaken(prev => ({ ...prev, contactsNotified: true }));
  };

  // Start/stop recording
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setActionsTaken(prev => ({ ...prev, recordingStarted: true }));
    } else {
      setIsRecording(true);
      setRecordingDuration(0);
    }
  };

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Update location periodically during SOS
  const updateLocation = useCallback(async () => {
    if (!sosAlertId || !currentLocation) return;

    try {
      await fetch('/api/sos-live-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sosAlertId,
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
        }),
      });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  }, [sosAlertId, currentLocation]);

  // Update location every 10 seconds when SOS is active
  useEffect(() => {
    if (sosTriggered && sosAlertId) {
      const interval = setInterval(updateLocation, 10000);
      return () => clearInterval(interval);
    }
  }, [sosTriggered, sosAlertId, updateLocation]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // SOS TRIGGERED VIEW
  if (sosTriggered) {
    return (
      <div className="min-h-screen bg-red-50">
        {/* Header */}
        <div className="bg-red-600 px-4 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">SOS ACTIVATED</h1>
              <p className="text-red-100 text-sm">Help is being coordinated</p>
            </div>
          </div>

          {/* Status */}
          <MobileCard className="p-4 bg-white/10 border-white/20 backdrop-blur">
            <div className="flex items-center gap-3 text-white">
              <Clock className="h-5 w-5" />
              <div>
                <p className="font-medium">Alert #{sosAlertId?.slice(0, 8).toUpperCase()}</p>
                <p className="text-sm text-red-100">
                  {new Date().toLocaleTimeString()} - {activeTask?.taskNumber || 'No active trip'}
                </p>
              </div>
            </div>
          </MobileCard>
        </div>

        <div className="px-4 pt-4 pb-8 space-y-4">
          {/* Actions Taken */}
          <MobileCard className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Status</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                {actionsTaken.safetyTeamAlerted ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                )}
                <span className={actionsTaken.safetyTeamAlerted ? 'text-green-700' : 'text-gray-500'}>
                  Safety Team Notified
                </span>
              </div>
              <div className="flex items-center gap-3">
                {actionsTaken.contactsNotified ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Loader2 className="h-5 w-5 text-gray-400" />
                )}
                <span className={actionsTaken.contactsNotified ? 'text-green-700' : 'text-gray-500'}>
                  Emergency Contacts Notified
                </span>
              </div>
              <div className="flex items-center gap-3">
                {actionsTaken.locationShared ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <CircleIcon className="h-5 w-5 text-gray-300" />
                )}
                <span className={actionsTaken.locationShared ? 'text-green-700' : 'text-gray-500'}>
                  Live Location Sharing
                </span>
              </div>
            </div>
          </MobileCard>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={shareLiveLocation}
              disabled={actionsTaken.locationShared}
              className={cn(
                "p-4 rounded-xl flex flex-col items-center gap-2",
                actionsTaken.locationShared
                  ? "bg-green-100 text-green-700"
                  : "bg-white border-2 border-red-300 text-red-700"
              )}
            >
              <Navigation className="h-6 w-6" />
              <span className="font-medium text-sm">
                {actionsTaken.locationShared ? 'Location Shared' : 'Share Location'}
              </span>
            </button>

            <button
              onClick={() => callEmergency('999')}
              className="p-4 rounded-xl bg-red-600 text-white flex flex-col items-center gap-2"
            >
              <Phone className="h-6 w-6" />
              <span className="font-medium text-sm">Call Police</span>
            </button>
          </div>

          {/* Recording */}
          <MobileCard className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  isRecording ? "bg-red-100" : "bg-gray-100"
                )}>
                  <Mic className={cn("h-5 w-5", isRecording ? "text-red-600" : "text-gray-600")} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {isRecording ? 'Recording...' : 'Record Incident'}
                  </p>
                  {isRecording && (
                    <p className="text-sm text-red-600">{formatDuration(recordingDuration)}</p>
                  )}
                </div>
              </div>
              <button
                onClick={toggleRecording}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium",
                  isRecording
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 text-gray-700"
                )}
              >
                {isRecording ? 'Stop' : 'Start'}
              </button>
            </div>
          </MobileCard>

          {/* Emergency Numbers */}
          <MobileCard className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Emergency Numbers</h3>
            <div className="space-y-2">
              {EMERGENCY_NUMBERS.map((emergency) => (
                <button
                  key={emergency.number}
                  onClick={() => callEmergency(emergency.number)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{emergency.name}</p>
                      <p className="text-xs text-gray-500">{emergency.description}</p>
                    </div>
                  </div>
                  <span className="font-bold text-red-600">{emergency.number}</span>
                </button>
              ))}
            </div>
          </MobileCard>

          {/* My Contacts */}
          {emergencyContacts.length > 0 && (
            <MobileCard className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">My Emergency Contacts</h3>
              <div className="space-y-2">
                {emergencyContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{contact.name}</p>
                        <p className="text-xs text-gray-500">{contact.relationship} • {maskPhoneNumber(contact.phone)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => window.location.href = `tel:${contact.phone}`}
                      className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm font-medium"
                    >
                      Call
                    </button>
                  </div>
                ))}
              </div>
            </MobileCard>
          )}

          {/* Cancel SOS */}
          <button
            onClick={onClose}
            className="w-full py-4 bg-gray-200 text-gray-700 rounded-xl font-medium"
          >
            Cancel SOS
          </button>
        </div>
      </div>
    );
  }

  // MAIN SOS ACTIONS VIEW
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-red-500 to-rose-600 px-4 pt-6 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
          >
            <XCircle className="h-5 w-5 text-white" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Emergency Actions</h1>
            <p className="text-red-100 text-sm">Select what you need help with</p>
          </div>
        </div>

        {/* Current Status */}
        {activeTask && (
          <MobileCard className="p-4 bg-white/10 border-white/20 backdrop-blur">
            <div className="flex items-center gap-3 text-white">
              <Radio className="h-5 w-5" />
              <div>
                <p className="font-medium">Active Trip: {activeTask.taskNumber}</p>
                <p className="text-sm text-red-100">{activeTask.taskType.replace(/_/g, ' ')}</p>
              </div>
            </div>
          </MobileCard>
        )}
      </div>

      <div className="px-4 pt-4 pb-8 space-y-4">
        {/* SOS Button */}
        <button
          onClick={triggerSOS}
          disabled={isLoading || !currentLocation}
          className={cn(
            "w-full p-6 rounded-2xl flex flex-col items-center gap-3 transition-all",
            isLoading || !currentLocation
              ? "bg-gray-200 text-gray-500"
              : "bg-red-600 text-white shadow-lg active:scale-98"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-12 w-12 animate-spin" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
              <AlertTriangle className="h-10 w-10" />
            </div>
          )}
          <span className="text-xl font-bold">
            {isLoading ? 'ACTIVATING...' : 'ACTIVATE SOS'}
          </span>
          <span className="text-sm opacity-80">
            {!currentLocation ? 'Getting your location...' : 'Alert safety team & contacts'}
          </span>
        </button>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <MobileCard className="p-4 text-center cursor-pointer active:bg-gray-100" onClick={shareLiveLocation}>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Navigation className="h-6 w-6 text-blue-600" />
            </div>
            <p className="font-medium text-gray-900">Share Location</p>
            <p className="text-xs text-gray-500">Send live GPS</p>
          </MobileCard>

          <MobileCard 
            className="p-4 text-center cursor-pointer active:bg-gray-100" 
            onClick={() => callEmergency('999')}
          >
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Phone className="h-6 w-6 text-red-600" />
            </div>
            <p className="font-medium text-gray-900">Call Police</p>
            <p className="text-xs text-gray-500">Emergency: 999</p>
          </MobileCard>

          <MobileCard 
            className="p-4 text-center cursor-pointer active:bg-gray-100"
            onClick={() => callEmergency('911')}
          >
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Crosshair className="h-6 w-6 text-orange-600" />
            </div>
            <p className="font-medium text-gray-900">Call Ambulance</p>
            <p className="text-xs text-gray-500">Emergency: 911</p>
          </MobileCard>

          <MobileCard className="p-4 text-center cursor-pointer active:bg-gray-100" onClick={toggleRecording}>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Mic className="h-6 w-6 text-purple-600" />
            </div>
            <p className="font-medium text-gray-900">Record Audio</p>
            <p className="text-xs text-gray-500">Save evidence</p>
          </MobileCard>
        </div>

        {/* Emergency Numbers */}
        <MobileCard className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Emergency Numbers</h3>
            <span className="text-xs text-gray-500">Uganda</span>
          </div>
          <div className="space-y-2">
            {EMERGENCY_NUMBERS.map((emergency) => (
              <button
                key={emergency.number}
                onClick={() => callEmergency(emergency.number)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{emergency.name}</p>
                    <p className="text-xs text-gray-500">{emergency.description}</p>
                  </div>
                </div>
                <span className="font-bold text-red-600">{emergency.number}</span>
              </button>
            ))}
          </div>
        </MobileCard>

        {/* Emergency Contacts */}
        <MobileCard className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Emergency Contacts</h3>
            <button className="text-red-600 text-sm font-medium flex items-center gap-1">
              <Users className="h-4 w-4" />
              Manage
            </button>
          </div>

          {emergencyContacts.length > 0 ? (
            <div className="space-y-2">
              {emergencyContacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {contact.name}
                        {contact.isPrimary && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                            Primary
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{contact.relationship} • {maskPhoneNumber(contact.phone)}</p>
                    </div>
                  </div>
                  {/* Direct emergency call - still uses tel: for immediate emergency response */}
                  <button
                    onClick={() => window.location.href = `tel:${contact.phone}`}
                    className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center"
                    title="Emergency call to saved contact"
                  >
                    <Phone className="h-5 w-5 text-green-600" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No emergency contacts added</p>
              <button className="mt-2 text-red-600 text-sm font-medium">
                Add Contacts
              </button>
            </div>
          )}
        </MobileCard>

        {/* Trip Info */}
        {activeTask && (
          <MobileCard className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Current Trip Details</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Pickup</p>
                  <p className="text-sm text-gray-900">{activeTask.pickupAddress}</p>
                </div>
              </div>
              <div className="border-l-2 border-dashed border-gray-200 ml-2.5 h-4" />
              <div className="flex items-start gap-3">
                <Navigation className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Dropoff</p>
                  <p className="text-sm text-gray-900">{activeTask.dropoffAddress}</p>
                </div>
              </div>

              {userType === 'CLIENT' && activeTask.riderInfo && (
                <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-2">Rider Information</p>
                  <p className="font-medium text-gray-900">{activeTask.riderInfo.name}</p>
                  <p className="text-sm text-gray-500">Phone: {maskPhoneNumber(activeTask.riderInfo.phone)}</p>
                  {activeTask.riderInfo.plateNumber && (
                    <p className="text-sm text-gray-500">
                      {activeTask.riderInfo.vehicleMake} {activeTask.riderInfo.vehicleModel} • {activeTask.riderInfo.plateNumber}
                    </p>
                  )}
                  <div className="mt-3">
                    <MaskedCallButton
                      userId={userId}
                      userType={userType}
                      calleeId={activeTask.riderInfo.id || 'rider'}
                      calleeType="RIDER"
                      calleeDisplayName={activeTask.riderInfo.plateNumber ? `Rider (${activeTask.riderInfo.plateNumber})` : activeTask.riderInfo.name}
                      taskId={activeTask.id}
                      taskType={activeTask.taskType}
                      variant="outline"
                      size="sm"
                      label="Call Rider"
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {userType === 'RIDER' && activeTask.clientInfo && (
                <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-2">Client Information</p>
                  <p className="font-medium text-gray-900">{activeTask.clientInfo.name}</p>
                  <p className="text-sm text-gray-500">Phone: {maskPhoneNumber(activeTask.clientInfo.phone)}</p>
                  <div className="mt-3">
                    <MaskedCallButton
                      userId={userId}
                      userType={userType}
                      calleeId={activeTask.clientInfo.id || 'client'}
                      calleeType="CLIENT"
                      calleeDisplayName="Client"
                      taskId={activeTask.id}
                      taskType={activeTask.taskType}
                      variant="outline"
                      size="sm"
                      label="Call Client"
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </MobileCard>
        )}
      </div>
    </div>
  );
}

// Helper icon component
function CircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}
