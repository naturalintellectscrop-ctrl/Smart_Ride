'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Ban,
  Clock,
  Loader2,
  AlertCircle,
  RefreshCw,
  Bike,
  Car,
  Package,
  Star,
  Users,
} from 'lucide-react';

interface Rider {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  email: string | null;
  riderRole: string;
  status: string;
  isOnline: boolean;
  rating: number;
  totalTrips: number;
  completedTrips: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatarUrl: string | null;
  };
  vehicle: {
    make: string;
    model: string;
    plateNumber: string;
    color: string;
  } | null;
  documents: {
    id: string;
    documentType: string;
    status: string;
    fileUrl: string;
  }[];
}

export function RiderManagement() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);

  const fetchRiders = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/riders', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch riders');
      }
      
      const data = await response.json();
      setRiders(data.riders || []);
    } catch (err) {
      console.error('Error fetching riders:', err);
      setError('Failed to load riders. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRiders();
  }, []);

  const filteredRiders = riders.filter(rider => {
    const matchesSearch = 
      rider.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rider.phone.includes(searchTerm) ||
      rider.user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || rider.status === statusFilter;
    const matchesRole = roleFilter === 'all' || rider.riderRole === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  const updateRiderStatus = async (riderId: string, action: 'approve' | 'reject' | 'suspend') => {
    try {
      const token = localStorage.getItem('accessToken');
      const endpoint = action === 'approve' ? '/api/riders/approve' : 
                       action === 'reject' ? '/api/riders/reject' : '/api/riders/suspend';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ riderId }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} rider`);
      }
      
      await fetchRiders();
    } catch (err) {
      console.error(`Error ${action}ing rider:`, err);
      alert(`Failed to ${action} rider. Please try again.`);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'APPROVED': return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' };
      case 'PENDING_APPROVAL': return { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' };
      case 'REJECTED': return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' };
      case 'SUSPENDED': return { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400' };
      default: return { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400' };
    }
  };

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'SMART_BODA_RIDER': return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: Bike };
      case 'SMART_CAR_DRIVER': return { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: Car };
      case 'DELIVERY_PERSONNEL': return { bg: 'bg-orange-500/10', text: 'text-orange-400', icon: Package };
      default: return { bg: 'bg-gray-500/10', text: 'text-gray-400', icon: Package };
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'SMART_BODA_RIDER': return 'Smart Boda';
      case 'SMART_CAR_DRIVER': return 'Smart Car';
      case 'DELIVERY_PERSONNEL': return 'Delivery';
      default: return role;
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#00FF88]" />
          <p className="text-gray-400 text-sm">Loading riders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Rider Management</h1>
          <p className="text-gray-400 mt-1">Manage and verify rider registrations</p>
        </div>
        <Button onClick={fetchRiders} variant="outline" size="sm" className="glass-button text-gray-300 border-white/10 hover:bg-white/5">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card glow-hover rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Riders</CardTitle>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Users className="h-4 w-4 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{riders.length}</div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Pending</CardTitle>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">
              {riders.filter(r => r.status === 'PENDING_APPROVAL').length}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Approved</CardTitle>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              {riders.filter(r => r.status === 'APPROVED').length}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Online Now</CardTitle>
            <div className="w-9 h-9 rounded-xl bg-[#00FF88]/10 flex items-center justify-center border border-[#00FF88]/20">
              <div className="w-2 h-2 bg-[#00FF88] rounded-full animate-pulse" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#00FF88]">
              {riders.filter(r => r.isOnline).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search riders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass-input border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 glass-input border-white/10 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/10">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING_APPROVAL">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-40 glass-input border-white/10 text-white">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/10">
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="SMART_BODA_RIDER">Smart Boda</SelectItem>
                <SelectItem value="SMART_CAR_DRIVER">Smart Car</SelectItem>
                <SelectItem value="DELIVERY_PERSONNEL">Delivery</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Table */}
      <Card className="glass-card rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white">Riders</CardTitle>
          <CardDescription className="text-gray-500">Manage rider registrations and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-gray-400">Rider</TableHead>
                  <TableHead className="text-gray-400">Role</TableHead>
                  <TableHead className="text-gray-400">Vehicle</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Rating</TableHead>
                  <TableHead className="text-gray-400">Trips</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRiders.length === 0 ? (
                  <TableRow className="border-white/5">
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="w-16 h-16 rounded-2xl bg-gray-500/10 flex items-center justify-center mx-auto mb-4 border border-gray-500/20">
                        <Bike className="h-8 w-8 text-gray-500" />
                      </div>
                      <p className="text-gray-400">No riders found</p>
                      <p className="text-gray-500 text-sm mt-1">Try adjusting your filters</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRiders.map((rider) => {
                    const statusStyle = getStatusStyle(rider.status);
                    const roleStyle = getRoleStyle(rider.riderRole);
                    const RoleIcon = roleStyle.icon;
                    return (
                      <TableRow key={rider.id} className="border-white/5 hover:bg-white/5">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center border border-[#00FF88]/20">
                              {rider.isOnline && <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#00FF88] rounded-full border-2 border-[#13131A]" />}
                              <span className="text-[#00FF88] font-medium text-sm">
                                {rider.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-white">{rider.fullName}</p>
                              <p className="text-sm text-gray-500">{rider.phone}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${roleStyle.bg} border border-white/10`}>
                            <RoleIcon className={`h-3.5 w-3.5 ${roleStyle.text}`} />
                            <span className={`text-sm ${roleStyle.text}`}>{getRoleLabel(rider.riderRole)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {rider.vehicle ? (
                            <div className="text-sm">
                              <p className="text-white">{rider.vehicle.make} {rider.vehicle.model}</p>
                              <p className="text-gray-500">{rider.vehicle.plateNumber}</p>
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} border`}>
                            {rider.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                            <span className="text-white">{rider.rating.toFixed(1)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-white font-medium">{rider.totalTrips}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/5"
                              onClick={() => setSelectedRider(rider)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {rider.status === 'PENDING_APPROVAL' && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                  onClick={() => updateRiderStatus(rider.id, 'approve')}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  onClick={() => updateRiderStatus(rider.id, 'reject')}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {rider.status === 'APPROVED' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                                onClick={() => updateRiderStatus(rider.id, 'suspend')}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Rider Details Dialog */}
      <Dialog open={!!selectedRider} onOpenChange={() => setSelectedRider(null)}>
        <DialogContent className="max-w-2xl glass-card border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Rider Details</DialogTitle>
          </DialogHeader>
          {selectedRider && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-medium text-white">{selectedRider.fullName}</p>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium text-white">{selectedRider.phone}</p>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-white">{selectedRider.email || '-'}</p>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="font-medium text-white">{getRoleLabel(selectedRider.riderRole)}</p>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge className={`${getStatusStyle(selectedRider.status).bg} ${getStatusStyle(selectedRider.status).text} ${getStatusStyle(selectedRider.status).border} border mt-1`}>
                    {selectedRider.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">Rating</p>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                    <p className="font-medium text-white">{selectedRider.rating.toFixed(1)} / 5.0</p>
                  </div>
                </div>
              </div>
              
              {selectedRider.vehicle && (
                <div>
                  <h4 className="font-medium text-white mb-3">Vehicle Information</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="glass p-4 rounded-xl border border-white/5">
                      <p className="text-sm text-gray-500">Make/Model</p>
                      <p className="text-white">{selectedRider.vehicle.make} {selectedRider.vehicle.model}</p>
                    </div>
                    <div className="glass p-4 rounded-xl border border-white/5">
                      <p className="text-sm text-gray-500">Plate Number</p>
                      <p className="text-white">{selectedRider.vehicle.plateNumber}</p>
                    </div>
                    <div className="glass p-4 rounded-xl border border-white/5">
                      <p className="text-sm text-gray-500">Color</p>
                      <p className="text-white">{selectedRider.vehicle.color}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedRider.documents && selectedRider.documents.length > 0 && (
                <div>
                  <h4 className="font-medium text-white mb-3">Documents</h4>
                  <div className="space-y-2">
                    {selectedRider.documents.map((doc) => {
                      const docStyle = doc.status === 'APPROVED' 
                        ? 'bg-emerald-500/10 border-emerald-500/20' 
                        : doc.status === 'REJECTED' 
                          ? 'bg-red-500/10 border-red-500/20' 
                          : 'bg-amber-500/10 border-amber-500/20';
                      return (
                        <div key={doc.id} className={`flex items-center justify-between p-3 rounded-xl border ${docStyle}`}>
                          <span className="text-sm text-white">{doc.documentType.replace(/_/g, ' ')}</span>
                          <Badge variant="outline" className="border-white/10 text-gray-300">{doc.status}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
