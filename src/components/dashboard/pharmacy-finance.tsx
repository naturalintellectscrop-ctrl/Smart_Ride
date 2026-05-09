'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Heart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Store,
  Clock,
  CreditCard,
  Banknote,
  Download,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  Calendar,
  Pill,
  FileText,
  Users,
  ShoppingCart,
  PiggyBank,
  Send
} from 'lucide-react';

interface EarningsSummary {
  totalOrders: number;
  totalRevenue: number;
  totalDeliveryFees: number;
  totalServiceFees: number;
  totalProviderEarnings: number;
  totalPlatformCommission: number;
  averageOrderValue: number;
  todayEarnings: number;
  todayOrders: number;
}

interface ProviderEarnings {
  id: string;
  name: string;
  type: string;
  commissionRate: number;
  totalOrders: number;
  revenue: number;
  earnings: number;
  commission: number;
  pendingPayout: number;
  totalEarnings: number;
  rating: number;
  isOpen: boolean;
}

export function PharmacyFinance() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [providers, setProviders] = useState<ProviderEarnings[]>([]);
  const [pendingPayoutsTotal, setPendingPayoutsTotal] = useState(0);
  const [orderTypes, setOrderTypes] = useState({ prescription: { count: 0, revenue: 0 }, otc: { count: 0, revenue: 0 } });
  const [providerStats, setProviderStats] = useState({ total: 0, active: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [payoutDialog, setPayoutDialog] = useState<{ open: boolean; provider: ProviderEarnings | null }>({ open: false, provider: null });
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutReference, setPayoutReference] = useState('');

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const fetchEarningsData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/pharmacy/earnings?action=summary');
      const data = await response.json();
      
      if (data.summary) {
        setSummary(data.summary);
      }
      if (data.providers) {
        setProviderStats(data.providers);
      }
      setPendingPayoutsTotal(data.pendingPayouts || 0);
      setOrderTypes(data.orderTypes || { prescription: { count: 0, revenue: 0 }, otc: { count: 0, revenue: 0 } });

      // Fetch providers
      const providersResponse = await fetch('/api/pharmacy/earnings?action=providers');
      const providersData = await providersResponse.json();
      setProviders(providersData.providers || []);
    } catch (error) {
      console.error('Failed to fetch earnings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayout = async () => {
    if (!payoutDialog.provider || !payoutAmount) return;

    try {
      const response = await fetch('/api/pharmacy/earnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record-payout',
          providerId: payoutDialog.provider.id,
          amount: parseFloat(payoutAmount),
          reference: payoutReference,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Refresh data
        fetchEarningsData();
        setPayoutDialog({ open: false, provider: null });
        setPayoutAmount('');
        setPayoutReference('');
      }
    } catch (error) {
      console.error('Failed to process payout:', error);
    }
  };

  const filteredProviders = providers.filter(provider => {
    const matchesSearch = provider.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || provider.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  const getProviderTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'PHARMACY': 'bg-rose-50 text-rose-700 border-rose-200',
      'DRUG_SHOP': 'bg-purple-50 text-purple-700 border-purple-200',
      'CLINIC': 'bg-blue-50 text-blue-700 border-blue-200',
      'PRIVATE_DOCTOR': 'bg-teal-50 text-teal-700 border-teal-200',
    };
    return colors[type] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Heart className="h-6 w-6 text-rose-500" />
            Pharmacy Earnings & Finance
          </h1>
          <p className="text-gray-500 mt-1">Monitor pharmacy revenue, commissions, and payouts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button className="bg-rose-600 hover:bg-rose-700">
            <Calendar className="h-4 w-4 mr-2" />
            Date Range
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '...' : formatCurrency(summary?.totalRevenue || 0)}
                </p>
              </div>
              <div className="h-12 w-12 bg-rose-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-rose-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-sm text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span>+12.5% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Platform Commission</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {loading ? '...' : formatCurrency(summary?.totalPlatformCommission || 0)}
                </p>
              </div>
              <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <PiggyBank className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-sm text-gray-500">
              <span>10% average commission rate</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Today's Earnings</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '...' : formatCurrency(summary?.todayEarnings || 0)}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-sm text-gray-500">
              <ShoppingCart className="h-4 w-4" />
              <span>{summary?.todayOrders || 0} orders today</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Payouts</p>
                <p className="text-2xl font-bold text-amber-600">
                  {loading ? '...' : formatCurrency(pendingPayoutsTotal)}
                </p>
              </div>
              <div className="h-12 w-12 bg-amber-100 rounded-full flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span>Awaiting processing</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="providers">Provider Earnings</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>How earnings are distributed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Provider Earnings</p>
                        <p className="text-sm text-gray-500">90% of subtotal</p>
                      </div>
                    </div>
                    <p className="font-bold text-lg">{formatCurrency(summary?.totalProviderEarnings || 0)}</p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <PiggyBank className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium">Platform Commission</p>
                        <p className="text-sm text-gray-500">10% of subtotal</p>
                      </div>
                    </div>
                    <p className="font-bold text-lg text-emerald-600">{formatCurrency(summary?.totalPlatformCommission || 0)}</p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Truck className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">Delivery Fees</p>
                        <p className="text-sm text-gray-500">Paid by customers</p>
                      </div>
                    </div>
                    <p className="font-bold text-lg">{formatCurrency(summary?.totalDeliveryFees || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Types */}
            <Card>
              <CardHeader>
                <CardTitle>Orders by Type</CardTitle>
                <CardDescription>Prescription vs OTC orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border border-rose-200 bg-rose-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-rose-600" />
                        <span className="font-medium">Prescription Orders</span>
                      </div>
                      <Badge className="bg-rose-100 text-rose-700">{orderTypes.prescription.count} orders</Badge>
                    </div>
                    <p className="text-2xl font-bold text-rose-700">{formatCurrency(orderTypes.prescription.revenue)}</p>
                    <p className="text-sm text-rose-600 mt-1">Requires prescription verification</p>
                  </div>

                  <div className="p-4 border border-emerald-200 bg-emerald-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Pill className="h-5 w-5 text-emerald-600" />
                        <span className="font-medium">Over-the-Counter</span>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700">{orderTypes.otc.count} orders</Badge>
                    </div>
                    <p className="text-2xl font-bold text-emerald-700">{formatCurrency(orderTypes.otc.revenue)}</p>
                    <p className="text-sm text-emerald-600 mt-1">No prescription required</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Provider Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Provider Statistics</CardTitle>
                <CardDescription>Active pharmacies and health providers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-gray-900">{providerStats.total}</p>
                    <p className="text-sm text-gray-500">Verified Providers</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-green-600">{providerStats.active}</p>
                    <p className="text-sm text-gray-500">Currently Open</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Orders Processed</span>
                    <span className="font-medium">{summary?.totalOrders || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Average Order Value</span>
                    <span className="font-medium">{formatCurrency(summary?.averageOrderValue || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Commission Explanation */}
            <Card>
              <CardHeader>
                <CardTitle>How You Earn</CardTitle>
                <CardDescription>Platform commission structure</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="font-medium text-emerald-800 mb-2">Default Commission Rate: 10%</p>
                    <p className="text-sm text-emerald-700">
                      For every pharmacy order, the platform earns 10% of the subtotal (medicine cost).
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Provider earns 90%</p>
                        <p className="text-sm text-gray-500">Of subtotal for medicines sold</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Platform earns 10%</p>
                        <p className="text-sm text-gray-500">Commission on subtotal</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Delivery fees separate</p>
                        <p className="text-sm text-gray-500">100% goes to delivery riders</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Providers Tab */}
        <TabsContent value="providers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Provider Earnings</CardTitle>
              <CardDescription>Earnings breakdown by pharmacy/health provider</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search providers..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Provider Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                    <SelectItem value="DRUG_SHOP">Drug Shop</SelectItem>
                    <SelectItem value="CLINIC">Clinic</SelectItem>
                    <SelectItem value="PRIVATE_DOCTOR">Private Doctor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Earnings</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Pending Payout</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : filteredProviders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          No providers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProviders.map((provider) => (
                        <TableRow key={provider.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${provider.isOpen ? 'bg-green-100' : 'bg-gray-100'}`}>
                                <Store className={`h-4 w-4 ${provider.isOpen ? 'text-green-600' : 'text-gray-400'}`} />
                              </div>
                              <div>
                                <p className="font-medium">{provider.name}</p>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <span>⭐ {provider.rating.toFixed(1)}</span>
                                  <span>•</span>
                                  <span>{provider.isOpen ? 'Open' : 'Closed'}</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getProviderTypeColor(provider.type)} variant="outline">
                              {provider.type.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>{provider.totalOrders}</TableCell>
                          <TableCell>{formatCurrency(provider.revenue)}</TableCell>
                          <TableCell className="text-green-600">{formatCurrency(provider.earnings)}</TableCell>
                          <TableCell className="text-emerald-600">{formatCurrency(provider.commission)}</TableCell>
                          <TableCell>
                            {provider.pendingPayout > 0 ? (
                              <span className="text-amber-600 font-medium">{formatCurrency(provider.pendingPayout)}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {provider.pendingPayout > 0 && (
                                <Button 
                                  size="sm" 
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => setPayoutDialog({ open: true, provider })}
                                >
                                  <Send className="h-4 w-4 mr-1" />
                                  Pay
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
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Pending Payouts</CardTitle>
                <CardDescription>Providers awaiting payout</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {providers.filter(p => p.pendingPayout > 0).map((provider) => (
                    <div key={provider.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-rose-100 rounded-full flex items-center justify-center">
                          <Store className="h-5 w-5 text-rose-600" />
                        </div>
                        <div>
                          <p className="font-medium">{provider.name}</p>
                          <p className="text-sm text-gray-500">{provider.totalOrders} orders completed</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-lg">{formatCurrency(provider.pendingPayout)}</p>
                          <p className="text-xs text-gray-500">Pending</p>
                        </div>
                        <Button 
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => setPayoutDialog({ open: true, provider })}
                        >
                          Process Payout
                        </Button>
                      </div>
                    </div>
                  ))}
                  {providers.filter(p => p.pendingPayout > 0).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                      <p>No pending payouts</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payout Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 rounded-lg">
                    <p className="text-sm text-amber-600">Total Pending</p>
                    <p className="text-2xl font-bold text-amber-700">{formatCurrency(pendingPayoutsTotal)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Providers with Pending</p>
                    <p className="text-2xl font-bold">{providers.filter(p => p.pendingPayout > 0).length}</p>
                  </div>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={pendingPayoutsTotal === 0}>
                    <Banknote className="h-4 w-4 mr-2" />
                    Process All Payouts
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Earnings Analytics</CardTitle>
              <CardDescription>Revenue trends and insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2" />
                  <p>Analytics charts coming soon</p>
                  <p className="text-sm">Daily earnings trends, top providers, and more</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payout Dialog */}
      <Dialog open={payoutDialog.open} onOpenChange={(open) => setPayoutDialog({ open, provider: open ? payoutDialog.provider : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payout</DialogTitle>
            <DialogDescription>
              Send payout to {payoutDialog.provider?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">Available Balance</span>
                <span className="font-medium">{formatCurrency(payoutDialog.provider?.pendingPayout || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Commission Rate</span>
                <span className="font-medium">{((payoutDialog.provider?.commissionRate || 0.10) * 100).toFixed(0)}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payout Amount</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reference (Optional)</label>
              <Input
                placeholder="Transaction reference"
                value={payoutReference}
                onChange={(e) => setPayoutReference(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutDialog({ open: false, provider: null })}>
              Cancel
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleProcessPayout}>
              Confirm Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Import Truck icon that was missing
function Truck({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </svg>
  );
}
