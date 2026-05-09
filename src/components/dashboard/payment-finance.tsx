'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  DollarSign, 
  TrendingUp,
  Download,
  Wallet,
  Receipt,
  Loader2,
  AlertCircle,
  CreditCard,
  ArrowUpRight
} from 'lucide-react';

interface Payment {
  id: string;
  paymentReference: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  createdAt: string;
}

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  taskCount: number;
}

interface Stats {
  totalRevenue: number;
  totalCommission: number;
  totalPayouts: number;
  pendingPayouts: number;
  totalTransactions: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
  }).format(amount);
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'COMPLETED': return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' };
    case 'PENDING': return { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' };
    case 'FAILED': return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' };
    default: return { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400' };
  }
};

export function PaymentFinance() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      
      const [paymentsRes, payoutsRes, statsRes] = await Promise.all([
        fetch('/api/payments?limit=10', { headers }),
        fetch('/api/admin/payouts?limit=10', { headers }),
        fetch('/api/admin/stats', { headers }),
      ]);

      if (paymentsRes.ok) {
        const data = await paymentsRes.json();
        setPayments(data.payments || []);
      }

      if (payoutsRes.ok) {
        const data = await payoutsRes.json();
        setPayouts(data.payouts || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats || data);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load financial data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#00FF88]" />
          <p className="text-gray-400 text-sm">Loading financial data...</p>
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
            onClick={fetchData}
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
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <DollarSign className="h-5 w-5 text-emerald-400" />
            </div>
            Payments & Finance
          </h1>
          <p className="text-gray-400 mt-1">Track payments, commissions, and payouts</p>
        </div>
        <Button variant="outline" size="sm" className="glass-button text-gray-300 border-white/10 hover:bg-white/5">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(stats?.totalRevenue || 0)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Platform Commission</p>
                <p className="text-2xl font-bold text-amber-400">{formatCurrency(stats?.totalCommission || 0)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <TrendingUp className="h-5 w-5 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Rider Payouts</p>
                <p className="text-2xl font-bold text-blue-400">{formatCurrency(stats?.totalPayouts || 0)}</p>
                <p className="text-xs text-gray-500 mt-1">Pending: {formatCurrency(stats?.pendingPayouts || 0)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Wallet className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Transactions</p>
                <p className="text-2xl font-bold text-white">{stats?.totalTransactions || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <Receipt className="h-5 w-5 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList className="glass-card border-white/10 p-1">
          <TabsTrigger value="transactions" className="data-[state=active]:bg-[#00FF88]/20 data-[state=active]:text-[#00FF88]">Transactions</TabsTrigger>
          <TabsTrigger value="payouts" className="data-[state=active]:bg-[#00FF88]/20 data-[state=active]:text-[#00FF88]">Rider Payouts</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card className="glass-card rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#00FF88]" />
                Recent Transactions
              </CardTitle>
              <CardDescription className="text-gray-500">All payment transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-gray-500/10 flex items-center justify-center mx-auto mb-4 border border-gray-500/20">
                    <Receipt className="h-8 w-8 text-gray-500" />
                  </div>
                  <p className="text-gray-400">No transactions yet</p>
                  <p className="text-gray-500 text-sm mt-1">Transactions will appear here when orders are completed</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="text-gray-400">Reference</TableHead>
                        <TableHead className="text-gray-400">Amount</TableHead>
                        <TableHead className="text-gray-400">Method</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => {
                        const statusStyle = getStatusStyle(payment.status);
                        return (
                          <TableRow key={payment.id} className="border-white/5 hover:bg-white/5">
                            <TableCell className="font-medium text-white">{payment.paymentReference}</TableCell>
                            <TableCell className="font-medium text-white">{formatCurrency(payment.amount)}</TableCell>
                            <TableCell className="text-gray-300">{payment.paymentMethod}</TableCell>
                            <TableCell>
                              <Badge className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} border`}>
                                {payment.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-400">{new Date(payment.createdAt).toLocaleString()}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card className="glass-card rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Wallet className="h-5 w-5 text-[#00FF88]" />
                Rider Payouts
              </CardTitle>
              <CardDescription className="text-gray-500">Weekly and monthly rider earnings</CardDescription>
            </CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-gray-500/10 flex items-center justify-center mx-auto mb-4 border border-gray-500/20">
                    <Wallet className="h-8 w-8 text-gray-500" />
                  </div>
                  <p className="text-gray-400">No payouts yet</p>
                  <p className="text-gray-500 text-sm mt-1">Payouts will appear here when processed</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="text-gray-400">Period</TableHead>
                        <TableHead className="text-gray-400">Tasks</TableHead>
                        <TableHead className="text-gray-400">Amount</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts.map((payout) => {
                        const statusStyle = getStatusStyle(payout.status);
                        return (
                          <TableRow key={payout.id} className="border-white/5 hover:bg-white/5">
                            <TableCell className="text-white">{new Date(payout.periodStart).toLocaleDateString()} - {new Date(payout.periodEnd).toLocaleDateString()}</TableCell>
                            <TableCell className="text-gray-300">{payout.taskCount}</TableCell>
                            <TableCell className="font-medium text-white">{formatCurrency(payout.amount)}</TableCell>
                            <TableCell>
                              <Badge className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} border`}>
                                {payout.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
