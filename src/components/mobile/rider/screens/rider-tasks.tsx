'use client';

import { useState, useEffect } from 'react';
import { MobileCard } from '../../shared/mobile-components';
import { 
  Bike, 
  Car,
  Package,
  MapPin,
  Navigation,
  Clock,
  CheckCircle,
  Phone,
  MessageSquare,
  DollarSign,
  Shield,
  User,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  Activity
} from 'lucide-react';
import { InAppChat, InAppCall, PrivacyNotice } from '../../shared/in-app-communication';
import { useHeartbeat } from '@/hooks/use-heartbeat';
import { Badge } from '@/components/ui/badge';

export function RiderTasks() {
  const [showChat, setShowChat] = useState(false);
  const [showCall, setShowCall] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ name: string; taskId: string } | null>(null);

  // Mock rider ID - in production this would come from auth
  const riderId = 'rider_demo_001';
  
  const activeTask = {
    id: 'T001',
    taskNumber: 'TASK-2024-09823',
    type: 'boda',
    from: 'Kampala Central',
    to: 'Nakasero',
    distance: 3.5,
    amount: 12000,
    clientName: 'John Doe',
    // Phone is NEVER shown to rider - privacy protected
    status: 'in_progress',
  };

  // Initialize heartbeat monitoring when there's an active task
  const { 
    status: heartbeatStatus, 
    batteryLevel, 
    isCharging,
    startMonitoring, 
    stopMonitoring 
  } = useHeartbeat(riderId, activeTask.id, {
    intervalMs: 10000, // 10 seconds
    enableWebSocket: true,
    enableOfflineQueue: true,
  });

  // Start heartbeat monitoring when component mounts with active task
  useEffect(() => {
    if (activeTask) {
      startMonitoring();
    }
    
    return () => {
      stopMonitoring();
    };
  }, [activeTask, startMonitoring, stopMonitoring]);

  const pendingTasks = [
    { id: '1', type: 'boda', from: 'Nakasero', to: 'Kololo', amount: 8500, created: '5 min ago' },
    { id: '2', type: 'item', from: 'DTB Bank', to: 'Ntinda', amount: 15000, created: '12 min ago' },
  ];

  const completedTasks = [
    { id: '3', type: 'boda', from: 'Makerere', to: 'Wandegeya', amount: 5000, completed: '1 hour ago' },
    { id: '4', type: 'item', from: 'Shoprite', to: 'Kiswa', amount: 18000, completed: '2 hours ago' },
    { id: '5', type: 'boda', from: 'Kiswa', to: 'Kampala CBD', amount: 7000, completed: '3 hours ago' },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'boda': return <Bike className="h-5 w-5" />;
      case 'car': return <Car className="h-5 w-5" />;
      case 'item': return <Package className="h-5 w-5" />;
      default: return <Package className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'boda': return 'bg-emerald-100 text-emerald-600';
      case 'car': return 'bg-blue-100 text-blue-600';
      case 'item': return 'bg-teal-100 text-teal-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const handleOpenChat = (clientName: string, taskId: string) => {
    setSelectedClient({ name: clientName, taskId });
    setShowChat(true);
  };

  const handleOpenCall = (clientName: string, taskId: string) => {
    setSelectedClient({ name: clientName, taskId });
    setShowCall(true);
  };

  // In-App Chat Modal
  if (showChat && selectedClient) {
    return (
      <InAppChat
        recipientName={selectedClient.name}
        recipientRole="client"
        taskId={selectedClient.taskId}
        onClose={() => {
          setShowChat(false);
          setSelectedClient(null);
        }}
      />
    );
  }

  // In-App Call Modal
  if (showCall && selectedClient) {
    return (
      <InAppCall
        recipientName={selectedClient.name}
        recipientRole="client"
        onEnd={() => {
          setShowCall(false);
          setSelectedClient(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Tasks</h1>
            <p className="text-sm text-gray-500">Manage your rides and deliveries</p>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {batteryLevel !== null && (
              <Badge variant="outline" className="flex items-center gap-1">
                {batteryLevel < 20 ? (
                  <BatteryLow className="h-3 w-3 text-red-500" />
                ) : (
                  <Battery className="h-3 w-3" />
                )}
                {batteryLevel}%
              </Badge>
            )}
            <Badge 
              variant={heartbeatStatus.connectionStatus === 'ACTIVE' ? 'default' : 'destructive'}
              className="flex items-center gap-1"
            >
              {heartbeatStatus.connectionStatus === 'ACTIVE' ? (
                <>
                  <Wifi className="h-3 w-3" />
                  Live
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  Offline
                </>
              )}
            </Badge>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Active Task */}
        {activeTask && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Active Task</h3>
            <MobileCard className="p-4 border-2 border-emerald-200 bg-emerald-50">
              {/* Heartbeat Status Bar */}
              <div className="flex items-center justify-between mb-3 px-2 py-1.5 bg-white rounded-lg text-xs">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Activity className="h-3.5 w-3.5" />
                  <span>Tracking Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">
                    Last sync: {heartbeatStatus.lastHeartbeatAt 
                      ? new Date(heartbeatStatus.lastHeartbeatAt).toLocaleTimeString()
                      : 'Pending...'}
                  </span>
                  {heartbeatStatus.pendingHeartbeats > 0 && (
                    <Badge variant="outline" className="text-orange-600 border-orange-300">
                      {heartbeatStatus.pendingHeartbeats} pending
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getTypeColor(activeTask.type)}`}>
                    {getTypeIcon(activeTask.type)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 capitalize">{activeTask.type === 'boda' ? 'Boda Ride' : 'Item Delivery'}</p>
                    <p className="text-sm text-gray-500">{activeTask.taskNumber}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600">UGX {activeTask.amount.toLocaleString()}</p>
                  <span className="text-emerald-600 text-xs flex items-center justify-end gap-1">
                    <Clock className="h-3 w-3" />
                    In Progress
                  </span>
                </div>
              </div>

              {/* Route */}
              <div className="bg-white rounded-xl p-3 mb-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Pickup</p>
                      <p className="font-medium text-gray-900">{activeTask.from}</p>
                    </div>
                  </div>
                  <div className="border-l-2 border-dashed border-gray-200 ml-4 h-4" />
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <Navigation className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Dropoff</p>
                      <p className="font-medium text-gray-900">{activeTask.to}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Client Info - Privacy Protected */}
              <div className="flex items-center justify-between bg-white rounded-xl p-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{activeTask.clientName}</p>
                      <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        <Shield className="h-2.5 w-2.5" />
                        <span>Verified</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Customer</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleOpenCall(activeTask.clientName, activeTask.taskNumber)}
                    className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center"
                  >
                    <Phone className="h-5 w-5 text-emerald-600" />
                  </button>
                  <button 
                    onClick={() => handleOpenChat(activeTask.clientName, activeTask.taskNumber)}
                    className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"
                  >
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                  </button>
                </div>
              </div>

              {/* Privacy Notice */}
              <PrivacyNotice />

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button className="py-3 rounded-xl bg-gray-200 text-gray-700 font-semibold">
                  Cancel
                </button>
                <button className="py-3 rounded-xl bg-emerald-600 text-white font-semibold flex items-center justify-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Complete
                </button>
              </div>
            </MobileCard>
          </div>
        )}

        {/* Completed Today */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Completed Today</h3>
          <div className="space-y-3">
            {completedTasks.map((task) => (
              <MobileCard key={task.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getTypeColor(task.type)}`}>
                      {getTypeIcon(task.type)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 capitalize">{task.type === 'boda' ? 'Boda Ride' : 'Item Delivery'}</p>
                      <p className="text-sm text-gray-500">{task.from} → {task.to}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">UGX {task.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{task.completed}</p>
                  </div>
                </div>
              </MobileCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
