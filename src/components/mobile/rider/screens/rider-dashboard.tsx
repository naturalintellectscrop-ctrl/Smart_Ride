'use client';

import { useState, useEffect } from 'react';
import { MobileCard } from '../../shared/mobile-components';
import { 
  DollarSign, 
  Bike, 
  Car,
  Package,
  MapPin,
  Navigation,
  Clock,
  Star,
  CheckCircle,
  XCircle,
  Power,
  Bell
} from 'lucide-react';

// Helper function to get time-based greeting
function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  } else if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  } else if (hour >= 17 && hour < 21) {
    return 'Good evening';
  } else {
    return 'Good night';
  }
}

// Helper function to get greeting emoji
function getGreetingEmoji(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return '👋';
  } else if (hour >= 12 && hour < 17) {
    return '☀️';
  } else if (hour >= 17 && hour < 21) {
    return '🌅';
  } else {
    return '🌙';
  }
}

export function RiderDashboard() {
  const [isOnline, setIsOnline] = useState(true);
  const [showTaskOffer, setShowTaskOffer] = useState(false);
  const [greeting, setGreeting] = useState(getTimeGreeting());
  const [emoji, setEmoji] = useState(getGreetingEmoji());

  // Update greeting every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setGreeting(getTimeGreeting());
      setEmoji(getGreetingEmoji());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const stats = {
    todayEarnings: 45000,
    todayTrips: 8,
    weeklyEarnings: 285000,
    rating: 4.8,
    completionRate: 96,
  };

  const recentTasks = [
    { id: '1', type: 'boda', from: 'Kampala Central', to: 'Nakasero', amount: 8500, status: 'completed' },
    { id: '2', type: 'item', from: 'DTB Bank', to: 'Ntinda', amount: 15000, status: 'completed' },
    { id: '3', type: 'boda', from: 'Nakasero', to: 'Kololo', amount: 6500, status: 'in_progress' },
  ];

  const taskOffer = {
    type: 'boda',
    from: 'Kampala Road',
    to: 'Nakasero Hill',
    distance: 3.5,
    amount: 12000,
    expiresInSeconds: 45,
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'boda': return <Bike className="h-5 w-5" />;
      case 'car': return <Car className="h-5 w-5" />;
      case 'item': return <Package className="h-5 w-5" />;
      default: return <Package className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header with Online Toggle */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">{greeting}, Emmanuel! {emoji}</h1>
            <p className="text-emerald-100 text-sm">Let's get you some rides</p>
          </div>
          <button className="relative">
            <Bell className="h-6 w-6 text-white" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">2</span>
          </button>
        </div>

        {/* Online/Offline Toggle */}
        <MobileCard className="p-4 bg-white/10 border-white/20 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isOnline ? 'bg-green-400' : 'bg-gray-400'}`}>
                <Power className={`h-6 w-6 ${isOnline ? 'text-white' : 'text-white'}`} />
              </div>
              <div>
                <p className="font-semibold text-white">{isOnline ? 'You are Online' : 'You are Offline'}</p>
                <p className="text-emerald-100 text-sm">
                  {isOnline ? 'Accepting ride requests' : 'Go online to receive tasks'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`w-14 h-8 rounded-full transition-all ${isOnline ? 'bg-green-400' : 'bg-gray-400'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full transition-transform ${isOnline ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
        </MobileCard>
      </div>

      <div className="px-4 -mt-2">
        {/* Today's Stats */}
        <div className="grid grid-cols-2 gap-3">
          <MobileCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-gray-500 text-xs">Today's Earnings</p>
                <p className="text-xl font-bold text-gray-900">UGX {stats.todayEarnings.toLocaleString()}</p>
              </div>
            </div>
          </MobileCard>
          <MobileCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Bike className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-gray-500 text-xs">Today's Trips</p>
                <p className="text-xl font-bold text-gray-900">{stats.todayTrips}</p>
              </div>
            </div>
          </MobileCard>
        </div>

        {/* Performance Stats */}
        <MobileCard className="mt-4 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Your Performance</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="font-bold text-gray-900">{stats.rating}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Rating</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-900">{stats.completionRate}%</p>
              <p className="text-xs text-gray-500 mt-1">Completion</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-emerald-600">UGX {(stats.weeklyEarnings / 1000).toFixed(0)}K</p>
              <p className="text-xs text-gray-500 mt-1">This Week</p>
            </div>
          </div>
        </MobileCard>

        {/* Recent Activity */}
        <div className="mt-6">
          <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
          <div className="space-y-3">
            {recentTasks.map((task) => (
              <MobileCard key={task.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    task.type === 'boda' ? 'bg-emerald-100 text-emerald-600' : 'bg-teal-100 text-teal-600'
                  }`}>
                    {getTypeIcon(task.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900 capitalize">{task.type === 'boda' ? 'Boda Ride' : 'Item Delivery'}</p>
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{task.from}</span>
                          <span className="mx-1">→</span>
                          <Navigation className="h-3 w-3" />
                          <span className="truncate">{task.to}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">UGX {task.amount.toLocaleString()}</p>
                        {task.status === 'completed' ? (
                          <span className="text-emerald-600 text-xs flex items-center justify-end gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Done
                          </span>
                        ) : (
                          <span className="text-blue-600 text-xs flex items-center justify-end gap-1">
                            <Clock className="h-3 w-3" />
                            In Progress
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </MobileCard>
            ))}
          </div>
        </div>
      </div>

      {/* Task Offer Modal */}
      {showTaskOffer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <MobileCard className="w-full max-w-md rounded-t-3xl rounded-b-none p-6 animate-slide-up">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Bike className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">New Task Available!</h3>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-emerald-500" />
                  <span className="text-gray-700">{taskOffer.from}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Navigation className="h-5 w-5 text-orange-500" />
                  <span className="text-gray-700">{taskOffer.to}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-700">{taskOffer.distance} km</span>
                </div>
              </div>
            </div>

            <div className="text-center mb-4">
              <p className="text-gray-500 text-sm">You'll earn</p>
              <p className="text-3xl font-bold text-emerald-600">UGX {taskOffer.amount.toLocaleString()}</p>
            </div>

            {/* Timer */}
            <div className="mb-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 animate-shrink" style={{ width: '100%' }} />
              </div>
              <p className="text-center text-sm text-gray-500 mt-2">Expires in {taskOffer.expiresInSeconds}s</p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowTaskOffer(false)}
                className="flex-1 py-4 rounded-xl bg-gray-100 text-gray-700 font-semibold"
              >
                Decline
              </button>
              <button 
                onClick={() => setShowTaskOffer(false)}
                className="flex-1 py-4 rounded-xl bg-emerald-600 text-white font-semibold"
              >
                Accept
              </button>
            </div>
          </MobileCard>
        </div>
      )}
    </div>
  );
}
