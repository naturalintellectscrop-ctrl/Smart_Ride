'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ClipboardList, 
  Search, 
  MoreHorizontal, 
  Download,
  Clock,
  Eye,
  MapPin,
  User,
  Bike,
  Car,
  Package,
  CheckCircle,
  XCircle,
  Navigation,
  Users
} from 'lucide-react';

// Mock data
const mockTasks = [
  { 
    id: 'T001', 
    taskNumber: 'TASK-2024-09823',
    client: { name: 'John Doe', phone: '+256 700 123 456' },
    rider: { name: 'Emmanuel Okello', phone: '+256 710 111 222', role: 'SMART_BODA_RIDER' },
    taskType: 'SMART_BODA_RIDE',
    status: 'COMPLETED',
    pickupAddress: 'Kampala Central',
    dropoffAddress: 'Nakasero',
    distanceKm: 3.5,
    totalAmount: 8500,
    platformCommission: 1275,
    riderEarnings: 7225,
    paymentMethod: 'CASH',
    paymentStatus: 'COMPLETED',
    passengerCount: 1,
    createdAt: '2024-03-15 14:30',
    completedAt: '2024-03-15 14:55',
  },
  { 
    id: 'T002', 
    taskNumber: 'TASK-2024-09824',
    client: { name: 'Jane Smith', phone: '+256 701 234 567' },
    rider: { name: 'David Mugisha', phone: '+256 712 222 333', role: 'SMART_CAR_DRIVER' },
    taskType: 'SMART_CAR_RIDE',
    status: 'IN_PROGRESS',
    pickupAddress: 'Entebbe Airport',
    dropoffAddress: 'Kampala CBD',
    distanceKm: 35,
    totalAmount: 85000,
    platformCommission: 17000,
    riderEarnings: 68000,
    paymentMethod: 'MOBILE_MONEY_MTN',
    paymentStatus: 'PENDING',
    passengerCount: 2,
    createdAt: '2024-03-15 15:00',
    completedAt: null,
  },
  { 
    id: 'T003', 
    taskNumber: 'TASK-2024-09825',
    client: { name: 'Mike Johnson', phone: '+256 702 345 678' },
    rider: { name: 'Grace Nakamya', phone: '+256 713 333 444', role: 'DELIVERY_PERSONNEL' },
    taskType: 'FOOD_DELIVERY',
    status: 'PICKED_UP',
    pickupAddress: 'Cafe Java, Kampala Mall',
    dropoffAddress: 'Kololo',
    distanceKm: 4,
    totalAmount: 50000,
    platformCommission: 5000,
    riderEarnings: 45000,
    paymentMethod: 'VISA',
    paymentStatus: 'COMPLETED',
    passengerCount: null,
    createdAt: '2024-03-15 15:10',
    completedAt: null,
  },
  { 
    id: 'T004', 
    taskNumber: 'TASK-2024-09826',
    client: { name: 'Sarah Wilson', phone: '+256 703 456 789' },
    rider: null,
    taskType: 'ITEM_DELIVERY',
    status: 'MATCHING',
    pickupAddress: 'Nakasero Market',
    dropoffAddress: 'Makindye',
    distanceKm: 6,
    totalAmount: 12000,
    platformCommission: 1200,
    riderEarnings: 10800,
    paymentMethod: 'CASH',
    paymentStatus: 'PENDING',
    passengerCount: null,
    itemDescription: 'Groceries package - 5kg',
    createdAt: '2024-03-15 15:15',
    completedAt: null,
  },
  { 
    id: 'T005', 
    taskNumber: 'TASK-2024-09827',
    client: { name: 'Peter Brown', phone: '+256 704 567 890' },
    rider: { name: 'Emmanuel Okello', phone: '+256 710 111 222', role: 'SMART_BODA_RIDER' },
    taskType: 'ITEM_DELIVERY',
    status: 'RIDER_ACCEPTED',
    pickupAddress: 'DTB Bank, Kampala Road',
    dropoffAddress: 'Ntinda',
    distanceKm: 8,
    totalAmount: 15000,
    platformCommission: 1500,
    riderEarnings: 13500,
    paymentMethod: 'MOBILE_MONEY_AIRTEL',
    paymentStatus: 'PENDING',
    passengerCount: null,
    itemDescription: 'Documents - Urgent',
    createdAt: '2024-03-15 15:20',
    completedAt: null,
  },
  { 
    id: 'T006', 
    taskNumber: 'TASK-2024-09828',
    client: { name: 'Grace Nakamya', phone: '+256 705 678 901' },
    rider: null,
    taskType: 'SMART_CAR_RIDE',
    status: 'CANCELLED',
    pickupAddress: 'Kiswa',
    dropoffAddress: 'Airport',
    distanceKm: 40,
    totalAmount: 95000,
    platformCommission: 0,
    riderEarnings: 0,
    paymentMethod: 'CASH',
    paymentStatus: 'REFUNDED',
    passengerCount: 3,
    cancellationReason: 'CLIENT_CANCELLED - Wait time too long',
    createdAt: '2024-03-15 14:00',
    completedAt: null,
  },
];

export function TaskManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredTasks = mockTasks.filter(task => {
    const matchesSearch = task.taskNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.client.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || task.taskType === typeFilter;
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const activeTasks = filteredTasks.filter(t => 
    ['CREATED', 'MATCHING', 'ASSIGNED', 'RIDER_ACCEPTED', 'PICKED_UP', 'IN_PROGRESS'].includes(t.status)
  );
  const completedTasks = filteredTasks.filter(t => t.status === 'COMPLETED');
  const cancelledTasks = filteredTasks.filter(t => ['CANCELLED', 'FAILED'].includes(t.status));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CREATED': return 'bg-gray-100 text-gray-700';
      case 'MATCHING': return 'bg-blue-100 text-blue-700';
      case 'ASSIGNED': return 'bg-indigo-100 text-indigo-700';
      case 'RIDER_ACCEPTED': return 'bg-teal-100 text-teal-700';
      case 'PICKED_UP': return 'bg-cyan-100 text-cyan-700';
      case 'IN_PROGRESS': return 'bg-orange-100 text-orange-700';
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      case 'FAILED': return 'bg-red-200 text-red-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTaskTypeColor = (type: string) => {
    switch (type) {
      case 'SMART_BODA_RIDE': return 'bg-emerald-100 text-emerald-700';
      case 'SMART_CAR_RIDE': return 'bg-blue-100 text-blue-700';
      case 'FOOD_DELIVERY': return 'bg-orange-100 text-orange-700';
      case 'SHOPPING': return 'bg-purple-100 text-purple-700';
      case 'ITEM_DELIVERY': return 'bg-teal-100 text-teal-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'SMART_BODA_RIDE': return <Bike className="h-4 w-4" />;
      case 'SMART_CAR_RIDE': return <Car className="h-4 w-4" />;
      case 'FOOD_DELIVERY': return <Package className="h-4 w-4" />;
      case 'SHOPPING': return <Package className="h-4 w-4" />;
      case 'ITEM_DELIVERY': return <Package className="h-4 w-4" />;
      default: return null;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderTaskTable = (tasks: typeof mockTasks) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Rider</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Route</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{task.taskNumber}</p>
                  <p className="text-sm text-gray-500">{task.distanceKm} km</p>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="font-medium">{task.client.name}</p>
                    <p className="text-sm text-gray-500">{task.client.phone}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {task.rider ? (
                  <div>
                    <p className="font-medium">{task.rider.name}</p>
                    <p className="text-sm text-gray-500">{task.rider.role.replace(/_/g, ' ')}</p>
                  </div>
                ) : (
                  <span className="text-gray-400">Not assigned</span>
                )}
              </TableCell>
              <TableCell>
                <Badge className={getTaskTypeColor(task.taskType)} variant="secondary">
                  <span className="flex items-center gap-1">
                    {getTaskTypeIcon(task.taskType)}
                    {task.taskType.replace(/_/g, ' ')}
                  </span>
                </Badge>
              </TableCell>
              <TableCell>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-green-500" />
                    <span className="truncate max-w-32">{task.pickupAddress}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Navigation className="h-3 w-3 text-red-500" />
                    <span className="truncate max-w-32">{task.dropoffAddress}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(task.status)} variant="secondary">
                  {task.status.replace(/_/g, ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{formatCurrency(task.totalAmount)}</p>
                  {task.riderEarnings > 0 && (
                    <p className="text-sm text-gray-500">Rider: {formatCurrency(task.riderEarnings)}</p>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <Dialog>
                      <DialogTrigger asChild>
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Task {task.taskNumber}</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4 py-4">
                          <div>
                            <p className="text-sm text-gray-500">Client</p>
                            <p className="font-medium">{task.client.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Rider</p>
                            <p className="font-medium">{task.rider?.name || 'Not assigned'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Type</p>
                            <Badge className={getTaskTypeColor(task.taskType)} variant="secondary">
                              {task.taskType.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Status</p>
                            <Badge className={getStatusColor(task.status)} variant="secondary">
                              {task.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Pickup</p>
                            <p className="font-medium">{task.pickupAddress}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Dropoff</p>
                            <p className="font-medium">{task.dropoffAddress}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Distance</p>
                            <p className="font-medium">{task.distanceKm} km</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Total Amount</p>
                            <p className="text-xl font-bold">{formatCurrency(task.totalAmount)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Platform Commission</p>
                            <p className="font-medium text-amber-600">{formatCurrency(task.platformCommission)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Rider Earnings</p>
                            <p className="font-medium text-emerald-600">{formatCurrency(task.riderEarnings)}</p>
                          </div>
                          {task.cancellationReason && (
                            <div className="col-span-2">
                              <p className="text-sm text-gray-500">Cancellation Reason</p>
                              <p className="font-medium text-red-600">{task.cancellationReason}</p>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    <DropdownMenuItem>
                      <Navigation className="h-4 w-4 mr-2" />
                      Track on Map
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Task
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Task Management</h1>
          <p className="text-gray-500 mt-1">Rides, deliveries, and service tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Today's Tasks</p>
                <p className="text-2xl font-bold">2,847</p>
              </div>
              <ClipboardList className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold text-orange-600">156</p>
              </div>
              <Navigation className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Matching</p>
                <p className="text-2xl font-bold text-blue-600">24</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-emerald-600">2,645</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Cancelled</p>
                <p className="text-2xl font-bold text-red-600">22</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tasks..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Task Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="SMART_BODA_RIDE">Smart Boda Ride</SelectItem>
                  <SelectItem value="SMART_CAR_RIDE">Smart Car Ride</SelectItem>
                  <SelectItem value="FOOD_DELIVERY">Food Delivery</SelectItem>
                  <SelectItem value="SHOPPING">Smart Grocery</SelectItem>
                  <SelectItem value="ITEM_DELIVERY">Smart Courier</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="MATCHING">Matching</SelectItem>
                  <SelectItem value="RIDER_ACCEPTED">Rider Accepted</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <Navigation className="h-4 w-4" />
            Active
            <Badge variant="secondary" className="ml-1">{activeTasks.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          <TabsTrigger value="all">All Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Active Tasks</CardTitle>
              <CardDescription>Tasks currently in progress</CardDescription>
            </CardHeader>
            <CardContent>
              {renderTaskTable(activeTasks)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Completed Tasks</CardTitle>
              <CardDescription>Successfully completed tasks</CardDescription>
            </CardHeader>
            <CardContent>
              {renderTaskTable(completedTasks)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cancelled">
          <Card>
            <CardHeader>
              <CardTitle>Cancelled Tasks</CardTitle>
              <CardDescription>Tasks that were cancelled</CardDescription>
            </CardHeader>
            <CardContent>
              {cancelledTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No cancelled tasks
                </div>
              ) : (
                renderTaskTable(cancelledTasks)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Tasks</CardTitle>
              <CardDescription>Complete task history</CardDescription>
            </CardHeader>
            <CardContent>
              {renderTaskTable(filteredTasks)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
