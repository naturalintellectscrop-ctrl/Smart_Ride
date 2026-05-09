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
  Store,
  Star,
  MapPin,
  Utensils,
  ShoppingBag,
  Pill,
  Building,
  ShoppingCart,
} from 'lucide-react';

interface Merchant {
  id: string;
  name: string;
  type: string;
  phone: string;
  email: string | null;
  address: string;
  city: string | null;
  status: string;
  isOpen: boolean;
  rating: number;
  totalOrders: number;
  createdAt: string;
  documents: {
    id: string;
    documentType: string;
    status: string;
    fileUrl: string;
  }[];
}

export function MerchantManagement() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);

  const fetchMerchants = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/merchants', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch merchants');
      }
      
      const data = await response.json();
      setMerchants(data.merchants || []);
    } catch (err) {
      console.error('Error fetching merchants:', err);
      setError('Failed to load merchants. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchants();
  }, []);

  const filteredMerchants = merchants.filter(merchant => {
    const matchesSearch = 
      merchant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      merchant.phone.includes(searchTerm) ||
      merchant.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || merchant.status === statusFilter;
    const matchesType = typeFilter === 'all' || merchant.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const updateMerchantStatus = async (merchantId: string, action: 'approve' | 'reject' | 'suspend') => {
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch('/api/admin/merchants/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ merchantId, action }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} merchant`);
      }
      
      await fetchMerchants();
    } catch (err) {
      console.error(`Error ${action}ing merchant:`, err);
      alert(`Failed to ${action} merchant. Please try again.`);
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

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'RESTAURANT': return { bg: 'bg-orange-500/10', text: 'text-orange-400', icon: Utensils };
      case 'SUPERMARKET': return { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: ShoppingBag };
      case 'RETAIL_STORE': return { bg: 'bg-purple-500/10', text: 'text-purple-400', icon: Building };
      case 'PHARMACY': return { bg: 'bg-rose-500/10', text: 'text-rose-400', icon: Pill };
      case 'GROCERY': return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: ShoppingCart };
      default: return { bg: 'bg-gray-500/10', text: 'text-gray-400', icon: Store };
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'RESTAURANT': return 'Restaurant';
      case 'SUPERMARKET': return 'Supermarket';
      case 'RETAIL_STORE': return 'Retail Store';
      case 'PHARMACY': return 'Pharmacy';
      case 'GROCERY': return 'Grocery';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#00FF88]" />
          <p className="text-gray-400 text-sm">Loading merchants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Merchant Management</h1>
          <p className="text-gray-400 mt-1">Manage and verify merchant registrations</p>
        </div>
        <Button onClick={fetchMerchants} variant="outline" size="sm" className="glass-button text-gray-300 border-white/10 hover:bg-white/5">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card glow-hover rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Merchants</CardTitle>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
              <Store className="h-4 w-4 text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{merchants.length}</div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Pending Approval</CardTitle>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">
              {merchants.filter(m => m.status === 'PENDING_APPROVAL').length}
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
              {merchants.filter(m => m.status === 'APPROVED').length}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Open Now</CardTitle>
            <div className="w-9 h-9 rounded-xl bg-[#00FF88]/10 flex items-center justify-center border border-[#00FF88]/20">
              <div className="w-2 h-2 bg-[#00FF88] rounded-full animate-pulse" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#00FF88]">
              {merchants.filter(m => m.isOpen).length}
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
                placeholder="Search merchants..."
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
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40 glass-input border-white/10 text-white">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/10">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="RESTAURANT">Restaurant</SelectItem>
                <SelectItem value="SUPERMARKET">Supermarket</SelectItem>
                <SelectItem value="RETAIL_STORE">Retail Store</SelectItem>
                <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                <SelectItem value="GROCERY">Grocery</SelectItem>
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
          <CardTitle className="text-white">Merchants</CardTitle>
          <CardDescription className="text-gray-500">Manage merchant registrations and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-gray-400">Merchant</TableHead>
                  <TableHead className="text-gray-400">Type</TableHead>
                  <TableHead className="text-gray-400">Location</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Rating</TableHead>
                  <TableHead className="text-gray-400">Orders</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMerchants.length === 0 ? (
                  <TableRow className="border-white/5">
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="w-16 h-16 rounded-2xl bg-gray-500/10 flex items-center justify-center mx-auto mb-4 border border-gray-500/20">
                        <Store className="h-8 w-8 text-gray-500" />
                      </div>
                      <p className="text-gray-400">No merchants found</p>
                      <p className="text-gray-500 text-sm mt-1">Try adjusting your filters</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMerchants.map((merchant) => {
                    const statusStyle = getStatusStyle(merchant.status);
                    const typeStyle = getTypeStyle(merchant.type);
                    const TypeIcon = typeStyle.icon;
                    return (
                      <TableRow key={merchant.id} className="border-white/5 hover:bg-white/5">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                              <Store className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                              <p className="font-medium text-white">{merchant.name}</p>
                              <p className="text-sm text-gray-500">{merchant.phone}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${typeStyle.bg} border border-white/10`}>
                            <TypeIcon className={`h-3.5 w-3.5 ${typeStyle.text}`} />
                            <span className={`text-sm ${typeStyle.text}`}>{getTypeLabel(merchant.type)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center gap-1 text-white">
                              <MapPin className="h-3.5 w-3.5 text-gray-500" />
                              {merchant.address}
                            </div>
                            {merchant.city && (
                              <p className="text-gray-500 ml-5">{merchant.city}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} border`}>
                            {merchant.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                            <span className="text-white">{merchant.rating.toFixed(1)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-white font-medium">{merchant.totalOrders}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/5"
                              onClick={() => setSelectedMerchant(merchant)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {merchant.status === 'PENDING_APPROVAL' && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                  onClick={() => updateMerchantStatus(merchant.id, 'approve')}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  onClick={() => updateMerchantStatus(merchant.id, 'reject')}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {merchant.status === 'APPROVED' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                                onClick={() => updateMerchantStatus(merchant.id, 'suspend')}
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

      {/* Merchant Details Dialog */}
      <Dialog open={!!selectedMerchant} onOpenChange={() => setSelectedMerchant(null)}>
        <DialogContent className="max-w-2xl glass-card border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Merchant Details</DialogTitle>
          </DialogHeader>
          {selectedMerchant && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">Business Name</p>
                  <p className="font-medium text-white">{selectedMerchant.name}</p>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium text-white">{getTypeLabel(selectedMerchant.type)}</p>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium text-white">{selectedMerchant.phone}</p>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-white">{selectedMerchant.email || '-'}</p>
                </div>
                <div className="col-span-2 glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium text-white">{selectedMerchant.address}</p>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge className={`${getStatusStyle(selectedMerchant.status).bg} ${getStatusStyle(selectedMerchant.status).text} ${getStatusStyle(selectedMerchant.status).border} border mt-1`}>
                    {selectedMerchant.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">Rating</p>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                    <p className="font-medium text-white">{selectedMerchant.rating.toFixed(1)} / 5.0</p>
                  </div>
                </div>
              </div>
              
              {selectedMerchant.documents && selectedMerchant.documents.length > 0 && (
                <div>
                  <h4 className="font-medium text-white mb-3">Documents</h4>
                  <div className="space-y-2">
                    {selectedMerchant.documents.map((doc) => {
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
