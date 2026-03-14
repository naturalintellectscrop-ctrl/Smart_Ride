'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Power,
  DollarSign,
  Bike,
  MapPin,
  Navigation,
  Clock,
  Star,
  TrendingUp,
  Zap,
  Bell,
  Package,
  Car,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '../../context/notification-context';

// Helper function to get time-based greeting
function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

function getGreetingEmoji(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return '👋';
  if (hour >= 12 && hour < 17) return '☀️';
  if (hour >= 17 && hour < 21) return '🌅';
  return '🌙';
}

interface RiderHomeProps {
  isOnline: boolean;
  onToggleOnline: () => void;
  onBellClick?: () => void;
}

export function RiderHome({ isOnline, onToggleOnline, onBellClick }: RiderHomeProps) {
  const [greeting, setGreeting] = useState(getTimeGreeting());
  const [emoji, setEmoji] = useState(getGreetingEmoji());
  const { unreadCount } = useNotifications();

  // Update greeting every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setGreeting(getTimeGreeting());
      setEmoji(getGreetingEmoji());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const stats = {
    todayEarnings: 45000,
    todayTrips: 8,
    weeklyEarnings: 285000,
    rating: 4.8,
    completionRate: 96,
    acceptanceRate: 92,
  };

  const activeTask = {
    id: 'T001',
    type: 'boda',
    from: 'Kampala Central',
    to: 'Nakasero',
    amount: 12000,
    clientName: 'John Doe',
    status: 'in_progress',
  };

  const surgeZones = [
    { area: 'Nakasero', multiplier: 1.5, demand: 'High' },
    { area: 'Kololo', multiplier: 1.3, demand: 'Medium' },
    { area: 'CBD', multiplier: 1.2, demand: 'Medium' },
  ];

  const nearbyRequests = [
    { type: 'boda', distance: 0.5, amount: 8500 },
    { type: 'delivery', distance: 1.2, amount: 15000 },
    { type: 'car', distance: 2.0, amount: 25000 },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'boda':
        return <Bike className="h-5 w-5" />;
      case 'car':
        return <Car className="h-5 w-5" />;
      case 'delivery':
        return <Package className="h-5 w-5" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  };

  const getTypeGradient = (type: string) => {
    switch (type) {
      case 'boda':
        return 'from-emerald-500 to-teal-600';
      case 'car':
        return 'from-blue-500 to-indigo-600';
      case 'delivery':
        return 'from-orange-500 to-red-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D12]">
      {/* Header with Online Toggle */}
      <div className="bg-gradient-to-br from-[#13131A] to-[#1A1A24] px-4 pt-4 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-400 text-sm">{greeting} {emoji}</p>
            <h1 className="text-xl font-bold text-white">
              Emmanuel
            </h1>
          </div>
          <button className="relative" onClick={onBellClick}>
            <Bell className="h-6 w-6 text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF3B5C] rounded-full text-xs flex items-center justify-center text-white font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Online/Offline Toggle */}
        <Card className="p-4 bg-[#1A1A24]/80 backdrop-blur border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center',
                  isOnline 
                    ? 'bg-[#00FF88]/20' 
                    : 'bg-gray-500/20'
                )}
                style={isOnline ? { boxShadow: '0 0 20px rgba(0, 255, 136, 0.4)' } : {}}
              >
                <Power className={cn("h-6 w-6", isOnline ? "text-[#00FF88]" : "text-gray-400")} />
              </div>
              <div>
                <p className="font-semibold text-white">
                  {isOnline ? 'You are Online' : 'You are Offline'}
                </p>
                <p className="text-gray-400 text-sm">
                  {isOnline ? 'Accepting ride requests' : 'Go online to receive tasks'}
                </p>
              </div>
            </div>
            <button
              onClick={onToggleOnline}
              className={cn(
                'w-14 h-8 rounded-full transition-all relative',
                isOnline ? 'bg-[#00FF88]' : 'bg-gray-600'
              )}
              style={isOnline ? { boxShadow: '0 0 15px rgba(0, 255, 136, 0.5)' } : {}}
            >
              <div
                className={cn(
                  'w-6 h-6 bg-white rounded-full transition-transform absolute top-1',
                  isOnline ? 'translate-x-7' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        </Card>
      </div>

      <div className="px-4 -mt-2">
        {/* Offline State */}
        {!isOnline && (
          <Card className="p-6 mt-4 bg-[#13131A] border-white/5">
            <div className="text-center">
              <div className="w-20 h-20 bg-[#1A1A24] rounded-full flex items-center justify-center mx-auto mb-4">
                <Power className="h-10 w-10 text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">You're Offline</h3>
              <p className="text-gray-400 text-sm mb-4">
                Go online to start receiving ride and delivery requests from nearby customers.
              </p>
              <Button
                onClick={onToggleOnline}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#00FF88] to-[#00CC6E] text-[#0D0D12] font-semibold text-lg flex items-center justify-center gap-2"
                style={{ boxShadow: '0 4px 20px rgba(0, 255, 136, 0.3)' }}
              >
                <Power className="h-5 w-5" />
                Go Online
              </Button>
            </div>
          </Card>
        )}

        {/* Online State Content */}
        {isOnline && (
          <>
            {/* Surge Zones */}
            <Card className="mt-4 p-4 bg-[#13131A] border-white/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  Surge Zones
                </h3>
                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">
                  High Demand
                </Badge>
              </div>
              <div className="space-y-2">
                {surgeZones.map((zone, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-[#1A1A24] rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-amber-400" />
                      <span className="font-medium text-white">{zone.area}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">{zone.demand}</span>
                      <Badge className="bg-amber-500 text-white">{zone.multiplier}x</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Nearby Requests */}
            <Card className="mt-4 p-4 bg-[#13131A] border-white/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">Nearby Requests</h3>
                <span className="text-sm text-gray-400">{nearbyRequests.length} available</span>
              </div>
              <div className="space-y-2">
                {nearbyRequests.map((request, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-[#1A1A24] rounded-lg cursor-pointer hover:bg-[#1E1E28] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br',
                          getTypeGradient(request.type)
                        )}
                      >
                        {getTypeIcon(request.type)}
                      </div>
                      <div>
                        <p className="font-medium text-white capitalize">{request.type}</p>
                        <p className="text-sm text-gray-400">{request.distance} km away</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-[#00FF88]">
                        UGX {request.amount.toLocaleString()}
                      </p>
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {/* Today's Stats */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Card className="p-4 bg-[#13131A] border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00FF88]/15 rounded-full flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-[#00FF88]" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">Today's Earnings</p>
                <p className="text-xl font-bold text-white">
                  UGX {stats.todayEarnings.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-[#13131A] border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/15 rounded-full flex items-center justify-center">
                <Bike className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">Today's Trips</p>
                <p className="text-xl font-bold text-white">{stats.todayTrips}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Active Task Preview */}
        {activeTask && isOnline && (
          <Card className="mt-4 p-4 bg-[#13131A] border-[#00FF88]/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">Active Task</h3>
              <Badge className="bg-[#00FF88]/15 text-[#00FF88] border-[#00FF88]/30 animate-pulse">In Progress</Badge>
            </div>
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-br',
                  getTypeGradient(activeTask.type)
                )}
              >
                {getTypeIcon(activeTask.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white capitalize">
                  {activeTask.type === 'boda' ? 'Boda Ride' : 'Delivery'}
                </p>
                <div className="flex items-center gap-1 text-sm text-gray-400 mt-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{activeTask.from}</span>
                  <span className="mx-1">→</span>
                  <Navigation className="h-3 w-3" />
                  <span className="truncate">{activeTask.to}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#00FF88]">
                  UGX {activeTask.amount.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Performance Stats */}
        <Card className="mt-4 p-4 bg-[#13131A] border-white/5">
          <h3 className="font-semibold text-white mb-3">Your Performance</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                <span className="font-bold text-white">{stats.rating}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Rating</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-white">{stats.completionRate}%</p>
              <p className="text-xs text-gray-400 mt-1">Completion</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-white">{stats.acceptanceRate}%</p>
              <p className="text-xs text-gray-400 mt-1">Acceptance</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-[#00FF88]">
                UGX {(stats.weeklyEarnings / 1000).toFixed(0)}K
              </p>
              <p className="text-xs text-gray-400 mt-1">This Week</p>
            </div>
          </div>
        </Card>

        {/* Weekly Trend */}
        <Card className="mt-4 p-4 mb-6 bg-[#13131A] border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Weekly Earnings Trend</h3>
            <div className="flex items-center gap-1 text-[#00FF88]">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">+16%</span>
            </div>
          </div>
          <div className="flex items-end justify-between gap-2 h-20">
            {[42, 38, 55, 48, 52, 65, 45].map((value, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-gradient-to-t from-[#00FF88] to-[#00CC6E] rounded-t-lg"
                  style={{ height: `${(value / 65) * 100}%`, opacity: 0.6 + (value / 65) * 0.4 }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
