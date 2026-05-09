'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ListTodo, 
  Loader2,
  Bike,
  Car,
  Package,
  ShoppingBag,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  AlertCircle,
  TrendingUp
} from 'lucide-react';

interface Task {
  id: string;
  taskNumber: string;
  taskType: string;
  status: string;
  totalAmount: number;
  pickupAddress: string;
  dropoffAddress: string;
  createdAt: string;
  client: { name: string; email: string };
  rider: { fullName: string } | null;
}

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'CREATED': return { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' };
    case 'MATCHING': return { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' };
    case 'ASSIGNED': return { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' };
    case 'ACCEPTED': return { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400' };
    case 'ARRIVED': return { bg: 'bg-teal-500/10', border: 'border-teal-500/20', text: 'text-teal-400' };
    case 'PICKED_UP': return { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' };
    case 'IN_TRANSIT': return { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400' };
    case 'DELIVERED':
    case 'COMPLETED': return { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400' };
    case 'CANCELLED':
    case 'FAILED': return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' };
    default: return { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400' };
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
  }).format(amount);
};

const getTaskTypeStyle = (type: string) => {
  switch (type) {
    case 'SMART_BODA_RIDE': return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: Bike };
    case 'SMART_CAR_RIDE': return { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: Car };
    case 'FOOD_DELIVERY': return { bg: 'bg-orange-500/10', text: 'text-orange-400', icon: Package };
    case 'SHOPPING': return { bg: 'bg-purple-500/10', text: 'text-purple-400', icon: ShoppingBag };
    case 'ITEM_DELIVERY': return { bg: 'bg-teal-500/10', text: 'text-teal-400', icon: Truck };
    default: return { bg: 'bg-gray-500/10', text: 'text-gray-400', icon: Package };
  }
};

export function TaskManagement() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/tasks?limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      } else {
        throw new Error('Failed to fetch tasks');
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#00FF88]" />
          <p className="text-gray-400 text-sm">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="glass-card rounded-2xl p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4 mx-auto" />
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={fetchTasks}
            className="px-6 py-2.5 bg-gradient-to-r from-[#00FF88] to-[#00CC6A] text-black font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center border border-[#00FF88]/20">
              <ListTodo className="h-5 w-5 text-[#00FF88]" />
            </div>
            Task Management
          </h1>
          <p className="text-gray-400 mt-1">Track rides and deliveries</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Tasks</p>
                <p className="text-2xl font-bold text-white">{tasks.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <ListTodo className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">In Progress</p>
                <p className="text-2xl font-bold text-blue-400">{tasks.filter(t => ['MATCHING', 'ASSIGNED', 'ACCEPTED', 'IN_TRANSIT'].includes(t.status)).length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <TrendingUp className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-emerald-400">{tasks.filter(t => t.status === 'COMPLETED' || t.status === 'DELIVERED').length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Cancelled</p>
                <p className="text-2xl font-bold text-red-400">{tasks.filter(t => t.status === 'CANCELLED').length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Table */}
      <Card className="glass-card rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white">All Tasks</CardTitle>
          <CardDescription className="text-gray-500">Track rides and deliveries</CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gray-500/10 flex items-center justify-center mx-auto mb-4 border border-gray-500/20">
                <ListTodo className="h-8 w-8 text-gray-500" />
              </div>
              <p className="text-gray-400">No tasks yet</p>
              <p className="text-gray-500 text-sm mt-1">Tasks will appear here when orders are placed</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-gray-400">Task #</TableHead>
                    <TableHead className="text-gray-400">Type</TableHead>
                    <TableHead className="text-gray-400">Customer</TableHead>
                    <TableHead className="text-gray-400">Rider</TableHead>
                    <TableHead className="text-gray-400">Route</TableHead>
                    <TableHead className="text-gray-400">Amount</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => {
                    const statusStyle = getStatusStyle(task.status);
                    const typeStyle = getTaskTypeStyle(task.taskType);
                    const TypeIcon = typeStyle.icon;
                    return (
                      <TableRow key={task.id} className="border-white/5 hover:bg-white/5">
                        <TableCell className="font-medium text-white">{task.taskNumber}</TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${typeStyle.bg} border border-white/10`}>
                            <TypeIcon className={`h-3.5 w-3.5 ${typeStyle.text}`} />
                            <span className={`text-sm ${typeStyle.text}`}>{task.taskType.replace(/_/g, ' ')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-white">{task.client?.name || 'N/A'}</p>
                        </TableCell>
                        <TableCell className="text-gray-300">{task.rider?.fullName || 'Unassigned'}</TableCell>
                        <TableCell>
                          <div className="flex items-start gap-1">
                            <MapPin className="h-3.5 w-3.5 text-[#00FF88] mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm text-white truncate max-w-32">{task.pickupAddress}</p>
                              <p className="text-sm text-gray-500 truncate max-w-32">{task.dropoffAddress}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-white">{formatCurrency(task.totalAmount)}</TableCell>
                        <TableCell>
                          <Badge className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} border`}>
                            {task.status.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-400">{new Date(task.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
