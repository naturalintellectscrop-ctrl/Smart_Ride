'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DialogDescription,
  DialogFooter,
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Bike, 
  Search, 
  Plus, 
  MoreHorizontal, 
  Download,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Star,
  Car,
  Package,
  Shield,
  FileText,
  UserCheck,
  UserX,
  MessageSquare
} from 'lucide-react';

// Mock data
const mockRiders = [
  { 
    id: 'R001', 
    name: 'Emmanuel Okello', 
    phone: '+256 700 123 456',
    email: 'emmanuel@example.com',
    role: 'SMART_BODA_RIDER',
    status: 'APPROVED',
    isOnline: true,
    rating: 4.8,
    totalTrips: 234,
    completedTrips: 228,
    vehicle: { type: 'BODA', plate: 'UAX 123A', color: 'Black' },
    location: 'Kampala Central',
    joinedAt: '2024-01-15',
    hasReflectorVest: true,
    hasHelmet: true,
    hasInsulatedBox: false,
  },
  { 
    id: 'R002', 
    name: 'Grace Nakamya', 
    phone: '+256 701 234 567',
    email: 'grace@example.com',
    role: 'DELIVERY_PERSONNEL',
    status: 'APPROVED',
    isOnline: false,
    rating: 4.9,
    totalTrips: 456,
    completedTrips: 450,
    vehicle: { type: 'BICYCLE', plate: 'N/A', color: 'White' },
    location: 'Nakasero',
    joinedAt: '2023-11-20',
    hasReflectorVest: true,
    hasHelmet: true,
    hasInsulatedBox: true,
  },
  { 
    id: 'R003', 
    name: 'David Mugisha', 
    phone: '+256 702 345 678',
    email: 'david@example.com',
    role: 'SMART_CAR_DRIVER',
    status: 'APPROVED',
    isOnline: true,
    rating: 4.7,
    totalTrips: 189,
    completedTrips: 185,
    vehicle: { type: 'CAR', plate: 'UAQ 456B', color: 'White Toyota Corolla' },
    location: 'Entebbe Road',
    joinedAt: '2024-02-10',
    hasReflectorVest: false,
    hasHelmet: false,
    hasInsulatedBox: false,
  },
  { 
    id: 'R004', 
    name: 'Peter Ssekandi', 
    phone: '+256 703 456 789',
    email: 'peter@example.com',
    role: 'SMART_BODA_RIDER',
    status: 'PENDING_APPROVAL',
    isOnline: false,
    rating: 0,
    totalTrips: 0,
    completedTrips: 0,
    vehicle: { type: 'BODA', plate: 'UAR 789C', color: 'Red' },
    location: 'Makindye',
    joinedAt: '2024-03-01',
    hasReflectorVest: false,
    hasHelmet: false,
    hasInsulatedBox: false,
  },
  { 
    id: 'R005', 
    name: 'Sarah Namugga', 
    phone: '+256 704 567 890',
    email: 'sarah@example.com',
    role: 'DELIVERY_PERSONNEL',
    status: 'PENDING_APPROVAL',
    isOnline: false,
    rating: 0,
    totalTrips: 0,
    completedTrips: 0,
    vehicle: { type: 'SCOOTER', plate: 'UAS 012D', color: 'Blue' },
    location: 'Kiswa',
    joinedAt: '2024-03-05',
    hasReflectorVest: false,
    hasHelmet: false,
    hasInsulatedBox: false,
  },
  { 
    id: 'R006', 
    name: 'James Kato', 
    phone: '+256 705 678 901',
    email: 'james@example.com',
    role: 'SMART_BODA_RIDER',
    status: 'REJECTED',
    isOnline: false,
    rating: 0,
    totalTrips: 0,
    completedTrips: 0,
    vehicle: { type: 'BODA', plate: 'UAT 345E', color: 'Green' },
    location: 'Kawempe',
    joinedAt: '2024-02-28',
    hasReflectorVest: false,
    hasHelmet: false,
    hasInsulatedBox: false,
  },
];

export function RiderManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRider, setSelectedRider] = useState<typeof mockRiders[0] | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [equipmentIssued, setEquipmentIssued] = useState({
    reflectorVest: false,
    helmet: false,
    insulatedBox: false,
  });

  const filteredRiders = mockRiders.filter(rider => {
    const matchesSearch = rider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         rider.phone.includes(searchQuery) ||
                         rider.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || rider.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || rider.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const pendingRiders = filteredRiders.filter(r => r.status === 'PENDING_APPROVAL');
  const approvedRiders = filteredRiders.filter(r => r.status === 'APPROVED');
  const rejectedRiders = filteredRiders.filter(r => r.status === 'REJECTED');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-100 text-emerald-700';
      case 'PENDING_APPROVAL': return 'bg-amber-100 text-amber-700';
      case 'REJECTED': return 'bg-red-100 text-red-700';
      case 'SUSPENDED': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SMART_BODA_RIDER': return 'bg-emerald-100 text-emerald-700';
      case 'SMART_CAR_DRIVER': return 'bg-blue-100 text-blue-700';
      case 'DELIVERY_PERSONNEL': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'SMART_BODA_RIDER': return <Bike className="h-4 w-4" />;
      case 'SMART_CAR_DRIVER': return <Car className="h-4 w-4" />;
      case 'DELIVERY_PERSONNEL': return <Package className="h-4 w-4" />;
      default: return null;
    }
  };

  const renderRiderTable = (riders: typeof mockRiders) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rider</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Trips</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {riders.map((rider) => (
            <TableRow key={rider.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-emerald-100 text-emerald-700">
                        {rider.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    {rider.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{rider.name}</p>
                    <p className="text-sm text-gray-500">{rider.id}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm">
                    <Phone className="h-3 w-3 text-gray-400" />
                    {rider.phone}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <MapPin className="h-3 w-3" />
                    {rider.location}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getRoleColor(rider.role)} variant="secondary">
                  <span className="flex items-center gap-1">
                    {getRoleIcon(rider.role)}
                    {rider.role.replace(/_/g, ' ')}
                  </span>
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(rider.status)} variant="secondary">
                  {rider.status.replace(/_/g, ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <p className="font-medium">{rider.vehicle.type}</p>
                  <p className="text-gray-500">{rider.vehicle.plate}</p>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">{rider.rating.toFixed(1)}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <p className="font-medium">{rider.completedTrips}/{rider.totalTrips}</p>
                  <p className="text-gray-500">completed</p>
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
                    <DropdownMenuItem onClick={() => setSelectedRider(rider)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <FileText className="h-4 w-4 mr-2" />
                      View Documents
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send Message
                    </DropdownMenuItem>
                    {rider.status === 'PENDING_APPROVAL' && (
                      <>
                        <DropdownMenuSeparator />
                        <Dialog>
                          <DialogTrigger asChild>
                            <DropdownMenuItem className="text-emerald-600" onSelect={(e) => {
                              e.preventDefault();
                              setSelectedRider(rider);
                            }}>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Approve Rider
                            </DropdownMenuItem>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Approve Rider: {rider.name}</DialogTitle>
                              <DialogDescription>
                                Complete the physical verification and issue equipment.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <p className="font-medium">Equipment Issued:</p>
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox id="vest" checked={equipmentIssued.reflectorVest} 
                                      onCheckedChange={(checked) => setEquipmentIssued(prev => ({ ...prev, reflectorVest: !!checked }))} />
                                    <label htmlFor="vest" className="text-sm">Reflector Vest</label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox id="helmet" checked={equipmentIssued.helmet}
                                      onCheckedChange={(checked) => setEquipmentIssued(prev => ({ ...prev, helmet: !!checked }))} />
                                    <label htmlFor="helmet" className="text-sm">Helmet</label>
                                  </div>
                                  {rider.role === 'DELIVERY_PERSONNEL' && (
                                    <div className="flex items-center space-x-2">
                                      <Checkbox id="box" checked={equipmentIssued.insulatedBox}
                                        onCheckedChange={(checked) => setEquipmentIssued(prev => ({ ...prev, insulatedBox: !!checked }))} />
                                      <label htmlFor="box" className="text-sm">Insulated Box (Delivery)</label>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Verification Notes</label>
                                <Textarea 
                                  placeholder="Document verification details..."
                                  value={verificationNotes}
                                  onChange={(e) => setVerificationNotes(e.target.value)}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline">Cancel</Button>
                              <Button className="bg-emerald-600 hover:bg-emerald-700">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Dialog>
                          <DialogTrigger asChild>
                            <DropdownMenuItem className="text-red-600">
                              <UserX className="h-4 w-4 mr-2" />
                              Reject Rider
                            </DropdownMenuItem>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reject Rider: {rider.name}</DialogTitle>
                              <DialogDescription>
                                Please provide a reason for rejection.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <Textarea placeholder="Rejection reason..." />
                            </div>
                            <DialogFooter>
                              <Button variant="outline">Cancel</Button>
                              <Button variant="destructive">
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </>
                    )}
                    {rider.status === 'APPROVED' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Shield className="h-4 w-4 mr-2" />
                          Suspend Rider
                        </DropdownMenuItem>
                      </>
                    )}
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Rider Management</h1>
          <p className="text-gray-500 mt-1">Manage riders and verification workflow</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Rider
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Riders</p>
                <p className="text-2xl font-bold">892</p>
              </div>
              <Bike className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-2xl font-bold text-emerald-600">845</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-amber-600">23</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Online Now</p>
                <p className="text-2xl font-bold text-green-600">342</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Rating</p>
                <p className="text-2xl font-bold text-yellow-600">4.7</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />
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
                  placeholder="Search by name, ID, or phone..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="SMART_BODA_RIDER">Smart Boda Rider</SelectItem>
                  <SelectItem value="SMART_CAR_DRIVER">Smart Car Driver</SelectItem>
                  <SelectItem value="DELIVERY_PERSONNEL">Delivery Personnel</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="PENDING_APPROVAL">Pending</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Riders Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending Approval
            <Badge variant="secondary" className="ml-1">{pendingRiders.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Approved
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <XCircle className="h-4 w-4" />
            Rejected
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Verification</CardTitle>
              <CardDescription>Riders awaiting physical verification and approval</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRiders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No pending riders
                </div>
              ) : (
                renderRiderTable(pendingRiders)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle>Approved Riders</CardTitle>
              <CardDescription>Active riders on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {renderRiderTable(approvedRiders)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card>
            <CardHeader>
              <CardTitle>Rejected Applications</CardTitle>
              <CardDescription>Riders who were not approved</CardDescription>
            </CardHeader>
            <CardContent>
              {rejectedRiders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No rejected riders
                </div>
              ) : (
                renderRiderTable(rejectedRiders)
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
