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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Download,
  Search,
  Wallet,
  Receipt,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

// Mock data
const mockPayments = [
  { id: 'P001', reference: 'PAY-2024-28471', type: 'RIDE_PAYMENT', amount: 8500, commission: 1275, status: 'COMPLETED', method: 'MOBILE_MONEY_MTN', createdAt: '2024-03-15 14:55' },
  { id: 'P002', reference: 'PAY-2024-28472', type: 'FOOD_ORDER_PAYMENT', amount: 50000, commission: 5000, status: 'COMPLETED', method: 'VISA', createdAt: '2024-03-15 14:30' },
  { id: 'P003', reference: 'PAY-2024-28473', type: 'ITEM_DELIVERY_PAYMENT', amount: 15000, commission: 1500, status: 'PENDING', method: 'CASH', createdAt: '2024-03-15 15:20' },
];

const mockPayouts = [
  { id: 'PO001', rider: 'Emmanuel Okello', amount: 245000, period: 'Mar 1-15, 2024', tasks: 45, status: 'COMPLETED', createdAt: '2024-03-15' },
  { id: 'PO002', rider: 'Grace Nakamya', amount: 189000, period: 'Mar 1-15, 2024', tasks: 38, status: 'PENDING', createdAt: '2024-03-15' },
];

export function PaymentFinance() {
  const [searchQuery, setSearchQuery] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Payments & Finance</h1>
          <p className="text-gray-500 mt-1">Track payments, commissions, and payouts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold">UGX 152.4M</p>
                <p className="text-xs text-emerald-600 flex items-center mt-1">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +15% this month
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Platform Commission</p>
                <p className="text-2xl font-bold text-amber-600">UGX 18.2M</p>
                <p className="text-xs text-gray-500 mt-1">12% average</p>
              </div>
              <TrendingUp className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Rider Payouts</p>
                <p className="text-2xl font-bold text-blue-600">UGX 124.8M</p>
                <p className="text-xs text-gray-500 mt-1">Pending: UGX 2.1M</p>
              </div>
              <Wallet className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Transactions</p>
                <p className="text-2xl font-bold">8,456</p>
                <p className="text-xs text-emerald-600 flex items-center mt-1">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +8% this week
                </p>
              </div>
              <Receipt className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="payouts">Rider Payouts</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>All payment transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.reference}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.type.replace(/_/g, ' ')}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                        <TableCell className="text-amber-600">{formatCurrency(payment.commission)}</TableCell>
                        <TableCell>{payment.method.replace(/_/g, ' ')}</TableCell>
                        <TableCell>
                          <Badge className={payment.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-500">{payment.createdAt}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card>
            <CardHeader>
              <CardTitle>Rider Payouts</CardTitle>
              <CardDescription>Weekly and monthly rider earnings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rider</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Tasks</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockPayouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell className="font-medium">{payout.rider}</TableCell>
                        <TableCell>{payout.period}</TableCell>
                        <TableCell>{payout.tasks}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(payout.amount)}</TableCell>
                        <TableCell>
                          <Badge className={payout.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                            {payout.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-500">{payout.createdAt}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions">
          <Card>
            <CardHeader>
              <CardTitle>Platform Commissions</CardTitle>
              <CardDescription>Revenue breakdown by service</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { service: 'Smart Boda Ride', rate: '15%', revenue: 4500000, transactions: 1245 },
                  { service: 'Smart Car Ride', rate: '20%', revenue: 5200000, transactions: 892 },
                  { service: 'Food Delivery', rate: '15%', revenue: 3800000, transactions: 1456 },
                  { service: 'Shopping', rate: '12%', revenue: 1200000, transactions: 567 },
                  { service: 'Item Delivery', rate: '10%', revenue: 540000, transactions: 389 },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.service}</p>
                      <p className="text-sm text-gray-500">{item.transactions} transactions</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{item.rate} commission</Badge>
                      <p className="text-lg font-bold mt-1">{formatCurrency(item.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
