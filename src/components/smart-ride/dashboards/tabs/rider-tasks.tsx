'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Bike,
  Car,
  Package,
  MapPin,
  Navigation,
  Clock,
  CheckCircle,
  XCircle,
  Phone,
  MessageSquare,
  Filter,
  ChevronRight,
  Calendar,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TaskStatus = 
  | 'assigned' 
  | 'accepted' 
  | 'heading_to_pickup' 
  | 'picked_up' 
  | 'delivering' 
  | 'completed' 
  | 'cancelled';

type TaskType = 'boda' | 'car' | 'delivery';

interface Task {
  id: string;
  taskNumber: string;
  type: TaskType;
  from: string;
  to: string;
  distance: number;
  amount: number;
  clientName: string;
  status: TaskStatus;
  createdAt: string;
  completedAt?: string;
}

const allTasks: Task[] = [
  {
    id: '1',
    taskNumber: 'TASK-2024-09823',
    type: 'boda',
    from: 'Kampala Central',
    to: 'Nakasero',
    distance: 3.5,
    amount: 12000,
    clientName: 'John Doe',
    status: 'delivering',
    createdAt: '10 min ago',
  },
  {
    id: '2',
    taskNumber: 'TASK-2024-09824',
    type: 'delivery',
    from: 'DTB Bank',
    to: 'Ntinda',
    distance: 5.2,
    amount: 15000,
    clientName: 'Jane Smith',
    status: 'assigned',
    createdAt: '15 min ago',
  },
  {
    id: '3',
    taskNumber: 'TASK-2024-09825',
    type: 'car',
    from: 'Entebbe Airport',
    to: 'Kampala CBD',
    distance: 35,
    amount: 85000,
    clientName: 'Mike Johnson',
    status: 'accepted',
    createdAt: '30 min ago',
  },
  {
    id: '4',
    taskNumber: 'TASK-2024-09820',
    type: 'boda',
    from: 'Makerere',
    to: 'Wandegeya',
    distance: 2,
    amount: 5000,
    clientName: 'Sarah Wilson',
    status: 'completed',
    createdAt: '1 hour ago',
    completedAt: '45 min ago',
  },
  {
    id: '5',
    taskNumber: 'TASK-2024-09818',
    type: 'delivery',
    from: 'Shoprite',
    to: 'Kiswa',
    distance: 4,
    amount: 18000,
    clientName: 'Peter Brown',
    status: 'completed',
    createdAt: '2 hours ago',
    completedAt: '1.5 hours ago',
  },
  {
    id: '6',
    taskNumber: 'TASK-2024-09815',
    type: 'boda',
    from: 'Kiswa',
    to: 'Kampala CBD',
    distance: 3,
    amount: 7000,
    clientName: 'Lisa Davis',
    status: 'cancelled',
    createdAt: '3 hours ago',
  },
];

const statusConfig: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  assigned: { label: 'Assigned', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  accepted: { label: 'Accepted', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  heading_to_pickup: { label: 'Heading to Pickup', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  picked_up: { label: 'Picked Up', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  delivering: { label: 'Delivering', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  completed: { label: 'Completed', color: 'text-green-600', bgColor: 'bg-green-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-600', bgColor: 'bg-red-100' },
};

const filterOptions: { value: TaskStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Tasks' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'heading_to_pickup', label: 'En Route' },
  { value: 'delivering', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function RiderTasks() {
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const filteredTasks = filter === 'all' 
    ? allTasks 
    : allTasks.filter(task => task.status === filter);

  const getTypeIcon = (type: TaskType) => {
    switch (type) {
      case 'boda':
        return <Bike className="h-5 w-5" />;
      case 'car':
        return <Car className="h-5 w-5" />;
      case 'delivery':
        return <Package className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: TaskType) => {
    switch (type) {
      case 'boda':
        return 'bg-emerald-100 text-emerald-600';
      case 'car':
        return 'bg-blue-100 text-blue-600';
      case 'delivery':
        return 'bg-teal-100 text-teal-600';
    }
  };

  const getTypeLabel = (type: TaskType) => {
    switch (type) {
      case 'boda':
        return 'Boda Ride';
      case 'car':
        return 'Car Ride';
      case 'delivery':
        return 'Delivery';
    }
  };

  const activeTask = allTasks.find(t => 
    ['assigned', 'accepted', 'heading_to_pickup', 'picked_up', 'delivering'].includes(t.status)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Tasks</h1>
            <p className="text-sm text-gray-500">Manage your rides and deliveries</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="h-4 w-4" />
            History
          </Button>
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Active Task Banner */}
        {activeTask && (
          <Card className="p-4 border-2 border-emerald-200 bg-emerald-50 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-emerald-800">Active Task</h3>
              <Badge className={cn(
                'animate-pulse',
                statusConfig[activeTask.status].bgColor,
                statusConfig[activeTask.status].color
              )}>
                {statusConfig[activeTask.status].label}
              </Badge>
            </div>
            <div className="flex items-start gap-3">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                getTypeColor(activeTask.type)
              )}>
                {getTypeIcon(activeTask.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{getTypeLabel(activeTask.type)}</p>
                <p className="text-sm text-gray-500">{activeTask.taskNumber}</p>
                <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{activeTask.from}</span>
                  <span className="mx-1">→</span>
                  <Navigation className="h-3 w-3" />
                  <span className="truncate">{activeTask.to}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-emerald-600">
                  UGX {activeTask.amount.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" className="flex-1 gap-2">
                <Phone className="h-4 w-4" />
                Call Client
              </Button>
              <Button size="sm" className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle className="h-4 w-4" />
                Update Status
              </Button>
            </div>
          </Card>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                filter === option.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Tasks List */}
        {filteredTasks.length === 0 ? (
          <Card className="p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">No Tasks Found</h3>
              <p className="text-sm text-gray-500">
                {filter === 'all' 
                  ? 'You have no tasks yet. Go online to start receiving requests.'
                  : `No ${filter.replace('_', ' ')} tasks at the moment.`}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3 pb-6">
            {filteredTasks.map((task) => (
              <Card 
                key={task.id} 
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedTask(task)}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    getTypeColor(task.type)
                  )}>
                    {getTypeIcon(task.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{getTypeLabel(task.type)}</p>
                        <p className="text-xs text-gray-400">{task.taskNumber}</p>
                      </div>
                      <Badge className={cn(
                        statusConfig[task.status].bgColor,
                        statusConfig[task.status].color
                      )}>
                        {statusConfig[task.status].label}
                      </Badge>
                    </div>
                    
                    {/* Route */}
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center">
                          <MapPin className="h-3 w-3 text-emerald-600" />
                        </div>
                        <span className="text-gray-600 truncate">{task.from}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                          <Navigation className="h-3 w-3 text-orange-600" />
                        </div>
                        <span className="text-gray-600 truncate">{task.to}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {task.createdAt}
                        </span>
                        <span>{task.distance} km</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                        <span className="font-bold text-emerald-600">
                          UGX {task.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <Card className="w-full max-w-md rounded-t-3xl rounded-b-none p-6 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Task Details</h3>
              <button 
                onClick={() => setSelectedTask(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <XCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-14 h-14 rounded-xl flex items-center justify-center',
                  getTypeColor(selectedTask.type)
                )}>
                  {getTypeIcon(selectedTask.type)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{getTypeLabel(selectedTask.type)}</p>
                  <p className="text-sm text-gray-500">{selectedTask.taskNumber}</p>
                </div>
                <Badge className={cn(
                  'ml-auto',
                  statusConfig[selectedTask.status].bgColor,
                  statusConfig[selectedTask.status].color
                )}>
                  {statusConfig[selectedTask.status].label}
                </Badge>
              </div>

              {/* Route Details */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Pickup</p>
                    <p className="font-medium text-gray-900">{selectedTask.from}</p>
                  </div>
                </div>
                <div className="border-l-2 border-dashed border-gray-200 ml-4 h-4" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <Navigation className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Dropoff</p>
                    <p className="font-medium text-gray-900">{selectedTask.to}</p>
                  </div>
                </div>
              </div>

              {/* Client Info */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                <div>
                  <p className="text-xs text-gray-500">Client</p>
                  <p className="font-medium text-gray-900">{selectedTask.clientName}</p>
                </div>
                <div className="flex gap-2">
                  <button className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center hover:bg-emerald-200 transition-colors">
                    <Phone className="h-5 w-5 text-emerald-600" />
                  </button>
                  <button className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                  </button>
                </div>
              </div>

              {/* Earnings */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Your Earnings</span>
                <span className="text-xl font-bold text-emerald-600">
                  UGX {selectedTask.amount.toLocaleString()}
                </span>
              </div>

              {/* Actions */}
              {selectedTask.status !== 'completed' && selectedTask.status !== 'cancelled' && (
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1">
                    Cancel Task
                  </Button>
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                    Update Status
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
