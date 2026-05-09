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
  Heart,
  FileText,
  Building2,
  Users,
  ShieldCheck,
} from 'lucide-react';

interface HealthProvider {
  id: string;
  businessName: string;
  providerType: string;
  ownerPhone: string;
  ownerEmail: string | null;
  address: string;
  city: string | null;
  verificationStatus: string;
  isOpenNow: boolean;
  totalOrders: number;
  licenseNumber: string;
  createdAt: string;
  documents: {
    id: string;
    documentType: string;
    status: string;
    fileUrl: string;
  }[];
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

export function HealthProviderManagement() {
  const [providers, setProviders] = useState<HealthProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedProvider, setSelectedProvider] = useState<HealthProvider | null>(null);

  // Fetch health providers from API
  const fetchProviders = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/admin/health-providers/verify?status=PENDING', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch health providers');
      }
      
      const data = await response.json();
      setProviders(data.providers || []);
    } catch (err) {
      console.error('Error fetching health providers:', err);
      setError('Failed to load health providers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  // Filter providers
  const filteredProviders = providers.filter(provider => {
    const matchesSearch = 
      provider.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.ownerPhone.includes(searchTerm) ||
      provider.ownerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || provider.verificationStatus === statusFilter;
    const matchesType = typeFilter === 'all' || provider.providerType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Update provider status
  const updateProviderStatus = async (providerId: string, action: 'approve' | 'reject' | 'suspend' | 'activate') => {
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch('/api/admin/health-providers/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ providerId, action }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} health provider`);
      }
      
      // Refresh providers list
      await fetchProviders();
    } catch (err) {
      console.error(`Error ${action}ing health provider:`, err);
      alert(`Failed to ${action} health provider. Please try again.`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'PENDING': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'REJECTED': return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'SUSPENDED': return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
      case 'DOCUMENTS_REQUESTED': return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'PHARMACY': return 'Pharmacy';
      case 'DRUG_SHOP': return 'Drug Shop';
      case 'CLINIC': return 'Clinic';
      case 'HOSPITAL': return 'Hospital';
      case 'DOCTOR': return 'Doctor';
      default: return type;
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'PHARMACY': return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'DRUG_SHOP': return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'CLINIC': return 'bg-teal-500/15 text-teal-400 border-teal-500/30';
      case 'HOSPITAL': return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'DOCTOR': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      default: return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-rose-500" />
          <p className="text-gray-400 text-sm">Loading health providers...</p>
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
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
              <Heart className="h-5 w-5 text-rose-500" />
            </div>
            Health Provider Management
          </h1>
          <p className="text-gray-400 mt-1">Verify and manage health provider registrations</p>
        </div>
        <Button onClick={fetchProviders} variant="outline" size="sm" className="glass-button text-gray-300 border-white/10 hover:bg-white/5">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card glow-hover rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Providers</CardTitle>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
              <Users className="h-4 w-4 text-rose-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{providers.length}</div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Pending Verification</CardTitle>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">
              {providers.filter(p => p.verificationStatus === 'PENDING').length}
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
              {providers.filter(p => p.verificationStatus === 'APPROVED').length}
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
              {providers.filter(p => p.isOpenNow).length}
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
                placeholder="Search by name, phone, license..."
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
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="DOCUMENTS_REQUESTED">Documents Requested</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40 glass-input border-white/10 text-white">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/10">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                <SelectItem value="DRUG_SHOP">Drug Shop</SelectItem>
                <SelectItem value="CLINIC">Clinic</SelectItem>
                <SelectItem value="HOSPITAL">Hospital</SelectItem>
                <SelectItem value="DOCTOR">Doctor</SelectItem>
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
          <Button size="sm" variant="ghost" onClick={fetchProviders} className="ml-auto text-red-400 hover:text-red-300">
            Retry
          </Button>
        </div>
      )}

      {/* Table */}
      <Card className="glass-card rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white">Health Providers</CardTitle>
          <CardDescription className="text-gray-500">Manage provider registrations and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-gray-400">Provider</TableHead>
                  <TableHead className="text-gray-400">Type</TableHead>
                  <TableHead className="text-gray-400">License</TableHead>
                  <TableHead className="text-gray-400">Location</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Orders</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProviders.length === 0 ? (
                  <TableRow className="border-white/5">
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                        <Building2 className="h-8 w-8 text-rose-400" />
                      </div>
                      <p className="text-gray-400">No health providers found</p>
                      <p className="text-gray-500 text-sm mt-1">Try adjusting your filters</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProviders.map((provider) => (
                    <TableRow key={provider.id} className="border-white/5 hover:bg-white/5">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                            <span className="text-rose-400 font-medium text-sm">
                              {provider.businessName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-white">{provider.businessName}</p>
                            <p className="text-sm text-gray-500">{provider.ownerPhone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getTypeStyle(provider.providerType)} border`}>
                          {getTypeLabel(provider.providerType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-mono text-gray-300">{provider.licenseNumber}</p>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="text-white">{provider.address}</p>
                          {provider.city && (
                            <p className="text-gray-500">{provider.city}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(provider.verificationStatus)} border`}>
                          {provider.verificationStatus.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white font-medium">{provider.totalOrders}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/5"
                            onClick={() => setSelectedProvider(provider)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {provider.verificationStatus === 'PENDING' && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                onClick={() => updateProviderStatus(provider.id, 'approve')}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                onClick={() => updateProviderStatus(provider.id, 'reject')}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {provider.verificationStatus === 'APPROVED' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                              onClick={() => updateProviderStatus(provider.id, 'suspend')}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Provider Details Dialog */}
      <Dialog open={!!selectedProvider} onOpenChange={() => setSelectedProvider(null)}>
        <DialogContent className="max-w-2xl glass-card border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Health Provider Details</DialogTitle>
          </DialogHeader>
          {selectedProvider && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">Business Name</p>
                  <p className="font-medium text-white">{selectedProvider.businessName}</p>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium text-white">{getTypeLabel(selectedProvider.providerType)}</p>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">License Number</p>
                  <p className="font-medium font-mono text-white">{selectedProvider.licenseNumber}</p>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium text-white">{selectedProvider.ownerPhone}</p>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-white">{selectedProvider.ownerEmail || '-'}</p>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge className={`${getStatusColor(selectedProvider.verificationStatus)} border mt-1`}>
                    {selectedProvider.verificationStatus.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="col-span-2 glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium text-white">{selectedProvider.address}</p>
                </div>
              </div>
              
              {selectedProvider.documents && selectedProvider.documents.length > 0 && (
                <div>
                  <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    Documents
                  </h4>
                  <div className="space-y-2">
                    {selectedProvider.documents.map((doc) => {
                      const docStyle = doc.status === 'APPROVED' 
                        ? 'bg-emerald-500/10 border-emerald-500/20' 
                        : doc.status === 'REJECTED' 
                          ? 'bg-red-500/10 border-red-500/20' 
                          : 'bg-amber-500/10 border-amber-500/20';
                      return (
                        <div key={doc.id} className={`flex items-center justify-between p-3 rounded-xl border ${docStyle}`}>
                          <span className="text-sm text-white">{doc.documentType.replace(/_/g, ' ')}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-white/10 text-gray-300">{doc.status}</Badge>
                            <Button size="sm" variant="ghost" asChild className="text-gray-400 hover:text-white">
                              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedProvider.verificationStatus === 'PENDING' && (
                <div className="flex gap-2 pt-4">
                  <Button 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      updateProviderStatus(selectedProvider.id, 'approve');
                      setSelectedProvider(null);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    variant="destructive"
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={() => {
                      updateProviderStatus(selectedProvider.id, 'reject');
                      setSelectedProvider(null);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
