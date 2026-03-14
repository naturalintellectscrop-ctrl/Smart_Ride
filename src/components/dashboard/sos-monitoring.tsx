'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  MapPin,
  Phone,
  MessageSquare,
  Clock,
  User,
  Bike,
  Car,
  Package,
  CheckCircle,
  XCircle,
  Radio,
  Navigation,
  FileText,
  Users,
  Bell,
  PhoneCall,
  Shield,
  Loader2,
  ExternalLink,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data for demonstration
const MOCK_SOS_ALERTS = [
  {
    id: 'sos-001',
    alertNumber: 'SOS-2024-001',
    userType: 'CLIENT',
    userName: 'John Doe',
    userPhone: '+256 700 123 456',
    riderName: 'David M.',
    riderPhone: '+256 701 234 567',
    vehicleInfo: 'Bajaj Boxer 150 • UAX 123A',
    taskNumber: 'TASK-2024-09823',
    taskType: 'SMART_BODA_RIDE',
    latitude: 0.3476,
    longitude: 32.5825,
    address: 'Kampala Road, Kampala',
    status: 'ACTIVE',
    severity: 'HIGH',
    triggeredAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    acknowledgedAt: null,
    resolvedAt: null,
    actionsTaken: {
      locationShared: true,
      emergencyServicesCalled: false,
      safetyTeamAlerted: true,
      contactsNotified: true,
    },
  },
  {
    id: 'sos-002',
    alertNumber: 'SOS-2024-002',
    userType: 'RIDER',
    userName: 'Sarah N.',
    userPhone: '+256 702 345 678',
    riderName: 'Sarah N.',
    riderPhone: '+256 702 345 678',
    vehicleInfo: 'Toyota Hiace • UAZ 456B',
    taskNumber: 'TASK-2024-09824',
    taskType: 'FOOD_DELIVERY',
    latitude: 0.3176,
    longitude: 32.5725,
    address: 'Ntinda, Kampala',
    status: 'ACKNOWLEDGED',
    severity: 'CRITICAL',
    triggeredAt: new Date(Date.now() - 1000 * 60 * 12), // 12 minutes ago
    acknowledgedAt: new Date(Date.now() - 1000 * 60 * 10),
    resolvedAt: null,
    actionsTaken: {
      locationShared: true,
      emergencyServicesCalled: true,
      safetyTeamAlerted: true,
      contactsNotified: true,
    },
  },
  {
    id: 'sos-003',
    alertNumber: 'SOS-2024-003',
    userType: 'CLIENT',
    userName: 'Mike K.',
    userPhone: '+256 703 456 789',
    riderName: 'Peter O.',
    riderPhone: '+256 704 567 890',
    vehicleInfo: 'Bajaj Pulsar • UBX 789C',
    taskNumber: 'TASK-2024-09825',
    taskType: 'SMART_BODA_RIDE',
    latitude: 0.3576,
    longitude: 32.5925,
    address: 'Kololo, Kampala',
    status: 'RESOLVED',
    severity: 'HIGH',
    triggeredAt: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
    acknowledgedAt: new Date(Date.now() - 1000 * 60 * 43),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 30),
    actionsTaken: {
      locationShared: true,
      emergencyServicesCalled: false,
      safetyTeamAlerted: true,
      contactsNotified: true,
    },
  },
];

export function SOSMonitoring() {
  const [alerts, setAlerts] = useState(MOCK_SOS_ALERTS);
  const [selectedAlert, setSelectedAlert] = useState<typeof MOCK_SOS_ALERTS[0] | null>(null);
  const [activeTab, setActiveTab] = useState('active');
  const [isLoading, setIsLoading] = useState(false);

  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED');
  const resolvedAlerts = alerts.filter(a => a.status === 'RESOLVED' || a.status === 'FALSE_ALARM');

  const handleAcknowledge = async (alertId: string) => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setAlerts(prev => prev.map(a => 
      a.id === alertId 
        ? { ...a, status: 'ACKNOWLEDGED', acknowledgedAt: new Date() }
        : a
    ));
    setIsLoading(false);
  };

  const handleResolve = async (alertId: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setAlerts(prev => prev.map(a => 
      a.id === alertId 
        ? { ...a, status: 'RESOLVED', resolvedAt: new Date() }
        : a
    ));
    setSelectedAlert(null);
    setIsLoading(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-700 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-red-500 text-white';
      case 'ACKNOWLEDGED': return 'bg-orange-500 text-white';
      case 'RESPONDING': return 'bg-blue-500 text-white';
      case 'RESOLVED': return 'bg-green-500 text-white';
      case 'FALSE_ALARM': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{activeAlerts.length}</p>
                <p className="text-sm text-red-600">Active Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Radio className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {alerts.filter(a => a.status === 'ACKNOWLEDGED').length}
                </p>
                <p className="text-sm text-orange-600">Acknowledged</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{resolvedAlerts.length}</p>
                <p className="text-sm text-green-600">Resolved Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">24/7</p>
                <p className="text-sm text-blue-600">Safety Team Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts List */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="active" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Active ({activeAlerts.length})
              </TabsTrigger>
              <TabsTrigger value="acknowledged" className="gap-2">
                <Radio className="h-4 w-4" />
                Acknowledged
              </TabsTrigger>
              <TabsTrigger value="resolved" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Resolved
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-4 space-y-4">
              {activeAlerts.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-500">No active SOS alerts</p>
                  </CardContent>
                </Card>
              ) : (
                activeAlerts.map((alert) => (
                  <Card 
                    key={alert.id} 
                    className={cn(
                      "cursor-pointer transition-all",
                      selectedAlert?.id === alert.id ? "ring-2 ring-red-500" : "",
                      alert.status === 'ACTIVE' && "border-red-200 bg-red-50/50"
                    )}
                    onClick={() => setSelectedAlert(alert)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center",
                            alert.severity === 'CRITICAL' ? "bg-red-100" : "bg-orange-100"
                          )}>
                            <AlertTriangle className={cn(
                              "h-6 w-6",
                              alert.severity === 'CRITICAL' ? "text-red-600" : "text-orange-600"
                            )} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">{alert.alertNumber}</span>
                              <Badge className={getSeverityColor(alert.severity)}>
                                {alert.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500">{alert.taskNumber}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(alert.status)}>
                            {alert.status}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(alert.triggeredAt)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">
                            {alert.userType === 'CLIENT' ? alert.userName : alert.riderName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600 truncate">{alert.address}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        {alert.status === 'ACTIVE' && (
                          <Button 
                            size="sm" 
                            className="bg-orange-600 hover:bg-orange-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcknowledge(alert.id);
                            }}
                            disabled={isLoading}
                          >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Acknowledge'}
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAlert(alert);
                        }}>
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        <Button size="sm" variant="outline" onClick={(e) => {
                          e.stopPropagation();
                          window.open(`https://maps.google.com/?q=${alert.latitude},${alert.longitude}`, '_blank');
                        }}>
                          <Navigation className="h-4 w-4 mr-1" />
                          Map
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="acknowledged" className="mt-4 space-y-4">
              {alerts.filter(a => a.status === 'ACKNOWLEDGED').map((alert) => (
                <Card 
                  key={alert.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedAlert(alert)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-gray-900">{alert.alertNumber}</span>
                        <p className="text-sm text-gray-500">{alert.userName} • {alert.address}</p>
                      </div>
                      <Badge className="bg-orange-500 text-white">Acknowledged</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="resolved" className="mt-4 space-y-4">
              {resolvedAlerts.map((alert) => (
                <Card key={alert.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-gray-900">{alert.alertNumber}</span>
                        <p className="text-sm text-gray-500">{alert.userName} • {alert.address}</p>
                      </div>
                      <Badge className="bg-green-500 text-white">Resolved</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* Alert Details Panel */}
        <div className="lg:col-span-1">
          {selectedAlert ? (
            <Card className="sticky top-4">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Alert Details</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedAlert(null)}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Status</span>
                  <Badge className={getStatusColor(selectedAlert.status)}>
                    {selectedAlert.status}
                  </Badge>
                </div>

                {/* Severity */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Severity</span>
                  <Badge className={getSeverityColor(selectedAlert.severity)}>
                    {selectedAlert.severity}
                  </Badge>
                </div>

                {/* User Info */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase">User</h4>
                  <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{selectedAlert.userName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{selectedAlert.userPhone}</span>
                    </div>
                  </div>
                </div>

                {/* Rider Info */}
                {selectedAlert.riderName && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase">Rider</h4>
                    <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <Bike className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{selectedAlert.riderName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{selectedAlert.riderPhone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{selectedAlert.vehicleInfo}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Location */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase">Location</h4>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-red-500" />
                      <span className="text-sm">{selectedAlert.address}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {selectedAlert.latitude.toFixed(6)}, {selectedAlert.longitude.toFixed(6)}
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.open(`https://maps.google.com/?q=${selectedAlert.latitude},${selectedAlert.longitude}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Google Maps
                  </Button>
                </div>

                {/* Actions Taken */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase">Actions Taken</h4>
                  <div className="space-y-1">
                    {Object.entries(selectedAlert.actionsTaken).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        {value ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-300" />
                        )}
                        <span className={value ? 'text-gray-700' : 'text-gray-400'}>
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2 pt-2">
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => handleResolve(selectedAlert.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Mark Resolved
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm">
                      <PhoneCall className="h-4 w-4 mr-1" />
                      Call User
                    </Button>
                    <Button variant="outline" size="sm">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Message
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Select an alert to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
