'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddPharmacyDialog } from '@/components/dashboard/add-pharmacy-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Heart,
  Pill,
  FileText,
  Store,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  DollarSign,
  Eye,
  Shield,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface HealthOrder {
  id: string;
  orderNumber: string;
  orderType: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  client: { name: string } | null;
  provider: { businessName: string } | null;
}

interface HealthProvider {
  id: string;
  businessName: string;
  address: string;
  verificationStatus: string;
  isOpenNow: boolean;
  totalOrders: number;
}

interface Prescription {
  id: string;
  prescriptionNumber: string;
  status: string;
  createdAt: string;
}

const getStatusBadge = (status: string) => {
  const variants: Record<string, { bg: string; text: string; border: string }> = {
    'PHARMACY_REVIEW': { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
    'PREPARING_ORDER': { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
    'READY_FOR_PICKUP': { bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500/30' },
    'OUT_FOR_DELIVERY': { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
    'DELIVERED': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    'APPROVED': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    'PENDING_APPROVAL': { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
    'PENDING': { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
    'VERIFIED': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    'REJECTED': { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
  };
  const style = variants[status] || { bg: 'bg-gray-500/15', text: 'text-gray-400', border: 'border-gray-500/30' };
  return <Badge className={`${style.bg} ${style.text} ${style.border} border`}>{status.replace(/_/g, ' ')}</Badge>;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
  }).format(amount);
};

export function SmartHealthManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [orders, setOrders] = useState<HealthOrder[]>([]);
  const [providers, setProviders] = useState<HealthProvider[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddPharmacyOpen, setIsAddPharmacyOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
      };
      
      const [ordersRes, providersRes, prescriptionsRes] = await Promise.all([
        fetch('/api/health-orders?limit=20', { headers }),
        fetch('/api/health-providers?limit=20', { headers }),
        fetch('/api/prescriptions?limit=20', { headers }),
      ]);

      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data.healthOrders || []);
      }
      if (providersRes.ok) {
        const data = await providersRes.json();
        setProviders(data.providers || []);
      }
      if (prescriptionsRes.ok) {
        const data = await prescriptionsRes.json();
        setPrescriptions(data.prescriptions || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Failed to load health data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-rose-500" />
          <p className="text-gray-400 text-sm">Loading health dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = {
    totalProviders: providers.length,
    activeProviders: providers.filter(p => p.isOpenNow).length,
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'PHARMACY_REVIEW' || o.status === 'PENDING').length,
    pendingPrescriptions: prescriptions.filter(p => p.status === 'PENDING').length,
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
              <Heart className="h-5 w-5 text-rose-500" />
            </div>
            Smart Health Management
          </h1>
          <p className="text-gray-400 mt-1">Manage pharmacies, prescriptions, and health orders</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={fetchData} variant="outline" size="sm" className="glass-button text-gray-300 border-white/10 hover:bg-white/5">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={() => setIsAddPharmacyOpen(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            <Store className="h-4 w-4 mr-2" />
            Add Pharmacy
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <p className="text-red-400">{error}</p>
          <Button size="sm" variant="ghost" onClick={fetchData} className="ml-auto text-red-400 hover:text-red-300">
            Retry
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Providers</p>
                <p className="text-2xl font-bold text-white">{stats.activeProviders}</p>
                <p className="text-xs text-gray-500">of {stats.totalProviders} registered</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                <Store className="h-5 w-5 text-rose-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Orders</p>
                <p className="text-2xl font-bold text-white">{stats.totalOrders}</p>
                <p className="text-xs text-amber-400">{stats.pendingOrders} pending</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <Pill className="h-5 w-5 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pending Prescriptions</p>
                <p className="text-2xl font-bold text-amber-400">{stats.pendingPrescriptions}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <FileText className="h-5 w-5 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Verified Providers</p>
                <p className="text-2xl font-bold text-emerald-400">{providers.filter(p => p.verificationStatus === 'VERIFIED' || p.verificationStatus === 'APPROVED').length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Shield className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="glass-card border-white/10 p-1 rounded-xl">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">Overview</TabsTrigger>
          <TabsTrigger value="providers" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">Providers</TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">Orders</TabsTrigger>
          <TabsTrigger value="prescriptions" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">Prescriptions</TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">Audit</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Orders */}
            <Card className="glass-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-white">Recent Health Orders</CardTitle>
                <CardDescription className="text-gray-500">Latest pharmacy delivery orders</CardDescription>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4 border border-purple-500/20">
                      <Pill className="h-8 w-8 text-purple-400" />
                    </div>
                    <p className="text-gray-400">No orders yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="text-gray-400">Order #</TableHead>
                        <TableHead className="text-gray-400">Type</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.slice(0, 5).map((order) => (
                        <TableRow key={order.id} className="border-white/5 hover:bg-white/5">
                          <TableCell className="font-medium text-white">{order.orderNumber}</TableCell>
                          <TableCell>
                            <Badge className={order.orderType === 'PRESCRIPTION_MEDICINE' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 border' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 border'}>
                              {order.orderType === 'PRESCRIPTION_MEDICINE' ? 'Rx' : 'OTC'}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Pending Providers */}
            <Card className="glass-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  Pending Approval
                </CardTitle>
                <CardDescription className="text-gray-500">Providers awaiting verification</CardDescription>
              </CardHeader>
              <CardContent>
                {providers.filter(p => p.verificationStatus === 'PENDING').length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                      <CheckCircle className="h-8 w-8 text-emerald-400" />
                    </div>
                    <p className="text-gray-400">No pending approvals</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {providers.filter(p => p.verificationStatus === 'PENDING').map((provider) => (
                      <div key={provider.id} className="flex items-start justify-between p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                        <div>
                          <p className="font-medium text-white">{provider.businessName}</p>
                          <p className="text-sm text-gray-400">{provider.address}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" className="bg-red-600 hover:bg-red-700">
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Providers Tab */}
        <TabsContent value="providers" className="space-y-6">
          <Card className="glass-card rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white">Registered Health providers</CardTitle>
              <CardDescription className="text-gray-500">Manage pharmacy and clinic partners</CardDescription>
            </CardHeader>
            <CardContent>
              {providers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                    <Store className="h-8 w-8 text-rose-400" />
                  </div>
                  <p className="text-gray-400">No providers registered yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="text-gray-400">Name</TableHead>
                        <TableHead className="text-gray-400">Address</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">Orders</TableHead>
                        <TableHead className="text-gray-400 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {providers.map((provider) => (
                        <TableRow key={provider.id} className="border-white/5 hover:bg-white/5">
                          <TableCell className="font-medium text-white">{provider.businessName}</TableCell>
                          <TableCell className="text-gray-400">{provider.address}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(provider.verificationStatus)}
                              {provider.isOpenNow && (
                                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 border">Open</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-white">{provider.totalOrders}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/5">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <Card className="glass-card rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white">Health Orders</CardTitle>
              <CardDescription className="text-gray-500">All pharmacy delivery orders</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4 border border-purple-500/20">
                    <Pill className="h-8 w-8 text-purple-400" />
                  </div>
                  <p className="text-gray-400">No orders yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="text-gray-400">Order #</TableHead>
                        <TableHead className="text-gray-400">Provider</TableHead>
                        <TableHead className="text-gray-400">Type</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">Amount</TableHead>
                        <TableHead className="text-gray-400">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id} className="border-white/5 hover:bg-white/5">
                          <TableCell className="font-medium text-white">{order.orderNumber}</TableCell>
                          <TableCell className="text-gray-400">{order.provider?.businessName || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge className={order.orderType === 'PRESCRIPTION_MEDICINE' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 border' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 border'}>
                              {order.orderType === 'PRESCRIPTION_MEDICINE' ? 'Prescription' : 'OTC'}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell className="text-white">{formatCurrency(order.totalAmount)}</TableCell>
                          <TableCell className="text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prescriptions Tab */}
        <TabsContent value="prescriptions" className="space-y-6">
          <Card className="glass-card rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-400" />
                Prescription Management
              </CardTitle>
              <CardDescription className="text-gray-500">Secure prescription handling</CardDescription>
            </CardHeader>
            <CardContent>
              {prescriptions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                    <FileText className="h-8 w-8 text-amber-400" />
                  </div>
                  <p className="text-gray-400">No prescriptions yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="text-gray-400">Prescription #</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prescriptions.map((rx) => (
                        <TableRow key={rx.id} className="border-white/5 hover:bg-white/5">
                          <TableCell className="font-medium text-white">{rx.prescriptionNumber}</TableCell>
                          <TableCell>{getStatusBadge(rx.status)}</TableCell>
                          <TableCell className="text-gray-500">{new Date(rx.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit" className="space-y-6">
          <Card className="glass-card rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-400" />
                Prescription Access Logs
              </CardTitle>
              <CardDescription className="text-gray-500">Track all prescription access for security compliance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                  <Shield className="h-8 w-8 text-emerald-400" />
                </div>
                <p className="text-gray-400">No access logs yet</p>
                <p className="text-sm text-gray-500 mt-1">Access logs will appear when prescriptions are viewed</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Pharmacy Dialog */}
      <AddPharmacyDialog 
        open={isAddPharmacyOpen} 
        onOpenChange={setIsAddPharmacyOpen}
        onSuccess={() => {
          fetchData(); // Refresh the providers list
        }}
      />
    </div>
  );
}
