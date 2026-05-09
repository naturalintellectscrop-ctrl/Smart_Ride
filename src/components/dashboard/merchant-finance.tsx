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
} from '@/components/ui/dialog';
import {
  Store,
  DollarSign,
  TrendingUp,
  Utensils,
  Clock,
  CreditCard,
  Banknote,
  Download,
  Search,
  Eye,
  CheckCircle,
  ArrowUpRight,
  Calendar,
  ShoppingCart,
  Building,
  PiggyBank,
  Send,
  Star,
  Power,
  AlertCircle,
  ChefHat
} from 'lucide-react';

interface EarningsSummary {
  totalOrders: number;
  totalRevenue: number;
  totalSubtotal: number;
  totalDeliveryFees: number;
  totalServiceFees: number;
  totalMerchantEarnings: number;
  totalPlatformCommission: number;
  averageOrderValue: number;
  todayEarnings: number;
  todayOrders: number;
}

interface MerchantEarnings {
  id: string;
  name: string;
  type: string;
  commissionRate: number;
  totalOrders: number;
  revenue: number;
  subtotal: number;
  earnings: number;
  commission: number;
  rating: number;
  isOpen: boolean;
  address: string;
}

export function MerchantFinance() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [merchants, setMerchants] = useState<MerchantEarnings[]>([]);
  const [merchantStats, setMerchantStats] = useState({ total: 0, active: 0 });
  const [orderTypes, setOrderTypes] = useState({ food: { count: 0, revenue: 0 }, shopping: { count: 0, revenue: 0 } });
  const [merchantsByType, setMerchantsByType] = useState<Array<{ type: string; count: number }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [payoutDialog, setPayoutDialog] = useState<{ open: boolean; merchant: MerchantEarnings | null }>({ open: false, merchant: null });
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutReference, setPayoutReference] = useState('');

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const fetchEarningsData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/merchant/earnings?action=summary');
      const data = await response.json();
      
      if (data.summary) {
        setSummary(data.summary);
      }
      if (data.merchants) {
        setMerchantStats(data.merchants);
      }
      setOrderTypes(data.orderTypes || { food: { count: 0, revenue: 0 }, shopping: { count: 0, revenue: 0 } });
      setMerchantsByType(data.merchantsByType || []);

      // Fetch merchants
      const merchantsResponse = await fetch('/api/merchant/earnings?action=merchants');
      const merchantsData = await merchantsResponse.json();
      setMerchants(merchantsData.merchants || []);
    } catch (error) {
      console.error('Failed to fetch earnings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayout = async () => {
    if (!payoutDialog.merchant || !payoutAmount) return;

    try {
      const response = await fetch('/api/merchant/earnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record-payout',
          merchantId: payoutDialog.merchant.id,
          amount: parseFloat(payoutAmount),
          reference: payoutReference,
        }),
      });

      const data = await response.json();
      if (data.success) {
        fetchEarningsData();
        setPayoutDialog({ open: false, merchant: null });
        setPayoutAmount('');
        setPayoutReference('');
      }
    } catch (error) {
      console.error('Failed to process payout:', error);
    }
  };

  const filteredMerchants = merchants.filter(merchant => {
    const matchesSearch = merchant.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || merchant.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  const getMerchantTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'RESTAURANT': 'bg-orange-50 text-orange-700 border-orange-200',
      'SUPERMARKET': 'bg-blue-50 text-blue-700 border-blue-200',
      'RETAIL_STORE': 'bg-purple-50 text-purple-700 border-purple-200',
      'PHARMACY': 'bg-rose-50 text-rose-700 border-rose-200',
      'GROCERY': 'bg-teal-50 text-teal-700 border-teal-200',
    };
    return colors[type] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getMerchantTypeIcon = (type: string) => {
    switch (type) {
      case 'RESTAURANT': return <Utensils className="h-4 w-4" />;
      case 'SUPERMARKET': return <ShoppingCart className="h-4 w-4" />;
      case 'RETAIL_STORE': return <Building className="h-4 w-4" />;
      case 'GROCERY': return <ShoppingCart className="h-4 w-4" />;
      default: return <Store className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="h-6 w-6 text-orange-500" />
            Merchant Earnings & Finance
          </h1>
          <p className="text-gray-500 mt-1">Monitor merchant revenue, commissions, and payouts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button className="bg-orange-600 hover:bg-orange-700">
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
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-sm text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span>+8.3% from last month</span>
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
              <span>15% average commission rate</span>
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
                <p className="text-sm text-gray-500">Active Merchants</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '...' : merchantStats.active}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <Store className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-sm text-gray-500">
              <Power className="h-4 w-4 text-green-500" />
              <span>of {merchantStats.total} total</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="merchants">Merchant Earnings</TabsTrigger>
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
                      <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <Store className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium">Merchant Earnings</p>
                        <p className="text-sm text-gray-500">85% of subtotal (avg)</p>
                      </div>
                    </div>
                    <p className="font-bold text-lg">{formatCurrency(summary?.totalMerchantEarnings || 0)}</p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <PiggyBank className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium">Platform Commission</p>
                        <p className="text-sm text-gray-500">15% of subtotal (avg)</p>
                      </div>
                    </div>
                    <p className="font-bold text-lg text-emerald-600">{formatCurrency(summary?.totalPlatformCommission || 0)}</p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-purple-600" />
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
                <CardDescription>Food delivery vs Shopping orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Utensils className="h-5 w-5 text-orange-600" />
                        <span className="font-medium">Food Delivery</span>
                      </div>
                      <Badge className="bg-orange-100 text-orange-700">{orderTypes.food.count} orders</Badge>
                    </div>
                    <p className="text-2xl font-bold text-orange-700">{formatCurrency(orderTypes.food.revenue)}</p>
                    <p className="text-sm text-orange-600 mt-1">Restaurants, cafes, fast food</p>
                  </div>

                  <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">Shopping Orders</span>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700">{orderTypes.shopping.count} orders</Badge>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(orderTypes.shopping.revenue)}</p>
                    <p className="text-sm text-blue-600 mt-1">Supermarkets, retail, grocery</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Merchant Types */}
            <Card>
              <CardHeader>
                <CardTitle>Merchants by Type</CardTitle>
                <CardDescription>Distribution of merchant categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {merchantsByType.map((item) => (
                    <div key={item.type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getMerchantTypeColor(item.type)} variant="outline">
                          {getMerchantTypeIcon(item.type)}
                          <span className="ml-1">{item.type.replace(/_/g, ' ')}</span>
                        </Badge>
                      </div>
                      <span className="font-medium">{item.count} merchants</span>
                    </div>
                  ))}
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
                    <p className="font-medium text-emerald-800 mb-2">Default Commission Rate: 15%</p>
                    <p className="text-sm text-emerald-700">
                      For every food/shopping order, the platform earns 15% of the subtotal (item cost).
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Merchant earns 85%</p>
                        <p className="text-sm text-gray-500">Of subtotal for items sold</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Platform earns 15%</p>
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

        {/* Merchants Tab */}
        <TabsContent value="merchants" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Merchant Earnings</CardTitle>
              <CardDescription>Earnings breakdown by merchant</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search merchants..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Merchant Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="RESTAURANT">Restaurant</SelectItem>
                    <SelectItem value="SUPERMARKET">Supermarket</SelectItem>
                    <SelectItem value="RETAIL_STORE">Retail Store</SelectItem>
                    <SelectItem value="GROCERY">Grocery</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Earnings</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Rate</TableHead>
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
                    ) : filteredMerchants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          No merchants found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMerchants.slice(0, 20).map((merchant) => (
                        <TableRow key={merchant.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${merchant.isOpen ? 'bg-green-100' : 'bg-gray-100'}`}>
                                <Store className={`h-4 w-4 ${merchant.isOpen ? 'text-green-600' : 'text-gray-400'}`} />
                              </div>
                              <div>
                                <p className="font-medium">{merchant.name}</p>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <span>⭐ {merchant.rating.toFixed(1)}</span>
                                  <span>•</span>
                                  <span>{merchant.isOpen ? 'Open' : 'Closed'}</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getMerchantTypeColor(merchant.type)} variant="outline">
                              {merchant.type.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>{merchant.totalOrders}</TableCell>
                          <TableCell>{formatCurrency(merchant.revenue)}</TableCell>
                          <TableCell className="text-orange-600">{formatCurrency(merchant.earnings)}</TableCell>
                          <TableCell className="text-emerald-600">{formatCurrency(merchant.commission)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{(merchant.commissionRate * 100).toFixed(0)}%</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => setPayoutDialog({ open: true, merchant })}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                Pay
                              </Button>
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
                <CardTitle>Recent Payouts</CardTitle>
                <CardDescription>Merchant payout history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* This would show actual payout history */}
                  <div className="text-center py-8 text-gray-500">
                    <Banknote className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>Recent payouts will appear here</p>
                    <p className="text-sm">Process payouts from the Merchants tab</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payout Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Paid Out</p>
                    <p className="text-2xl font-bold">{formatCurrency(summary?.totalMerchantEarnings || 0)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Active Merchants</p>
                    <p className="text-2xl font-bold">{merchantStats.active}</p>
                  </div>
                  <Button className="w-full bg-orange-600 hover:bg-orange-700">
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
                  <p className="text-sm">Daily earnings trends, top merchants, and more</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payout Dialog */}
      <Dialog open={payoutDialog.open} onOpenChange={(open) => setPayoutDialog({ open, merchant: open ? payoutDialog.merchant : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payout</DialogTitle>
            <DialogDescription>
              Send payout to {payoutDialog.merchant?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">Merchant Type</span>
                <Badge className={getMerchantTypeColor(payoutDialog.merchant?.type || '')} variant="outline">
                  {payoutDialog.merchant?.type}
                </Badge>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">Total Orders</span>
                <span className="font-medium">{payoutDialog.merchant?.totalOrders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Commission Rate</span>
                <span className="font-medium">{((payoutDialog.merchant?.commissionRate || 0.15) * 100).toFixed(0)}%</span>
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
            <Button variant="outline" onClick={() => setPayoutDialog({ open: false, merchant: null })}>
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
