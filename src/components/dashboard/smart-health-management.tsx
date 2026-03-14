'use client';

import { useState } from 'react';
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
  Shield
} from 'lucide-react';

export function SmartHealthManagement() {
  const [activeTab, setActiveTab] = useState('overview');

  // Sample data
  const stats = {
    totalPharmacies: 12,
    activePharmacies: 8,
    totalOrders: 156,
    pendingOrders: 23,
    todayRevenue: 2450000,
    pendingPrescriptions: 7,
  };

  const recentHealthOrders = [
    {
      id: 'HLTH-2024-001',
      pharmacy: 'HealthFirst Pharmacy',
      customer: 'John Doe',
      type: 'PRESCRIPTION_MEDICINE',
      status: 'PHARMACY_REVIEW',
      amount: 45000,
      createdAt: '2024-01-15 10:30',
    },
    {
      id: 'HLTH-2024-002',
      pharmacy: 'MediCare Plus',
      customer: 'Sarah N.',
      type: 'OVER_THE_COUNTER',
      status: 'OUT_FOR_DELIVERY',
      amount: 27000,
      createdAt: '2024-01-15 09:45',
    },
    {
      id: 'HLTH-2024-003',
      pharmacy: 'HealthFirst Pharmacy',
      customer: 'Mike K.',
      type: 'OVER_THE_COUNTER',
      status: 'DELIVERED',
      amount: 20000,
      createdAt: '2024-01-15 08:20',
    },
  ];

  const pharmacies = [
    {
      id: '1',
      name: 'HealthFirst Pharmacy',
      address: 'Kampala Central',
      status: 'APPROVED',
      isOpen: true,
      totalOrders: 89,
      rating: 4.7,
    },
    {
      id: '2',
      name: 'MediCare Plus',
      address: 'Nakasero',
      status: 'APPROVED',
      isOpen: true,
      totalOrders: 67,
      rating: 4.5,
    },
    {
      id: '3',
      name: 'QuickMeds Pharmacy',
      address: 'Ntinda',
      status: 'PENDING_APPROVAL',
      isOpen: false,
      totalOrders: 0,
      rating: 0,
    },
  ];

  const prescriptionDisputes = [
    {
      id: 'RX-2024-001',
      orderNumber: 'HLTH-2024-001',
      customer: 'John Doe',
      issue: 'Prescription rejected - unclear image',
      status: 'OPEN',
      createdAt: '2024-01-15 10:30',
    },
  ];

  const prescriptionAccessLogs = [
    {
      id: '1',
      prescriptionId: 'RX-2024-001',
      accessedBy: 'Dr. Mukasa (HealthFirst Pharmacy)',
      action: 'VIEW',
      timestamp: '2024-01-15 10:35',
    },
    {
      id: '2',
      prescriptionId: 'RX-2024-001',
      accessedBy: 'Dr. Mukasa (HealthFirst Pharmacy)',
      action: 'VERIFY',
      timestamp: '2024-01-15 10:40',
    },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
      'PHARMACY_REVIEW': { variant: 'outline', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
      'PREPARING_ORDER': { variant: 'outline', className: 'bg-purple-50 text-purple-700 border-purple-200' },
      'READY_FOR_PICKUP': { variant: 'outline', className: 'bg-teal-50 text-teal-700 border-teal-200' },
      'OUT_FOR_DELIVERY': { variant: 'outline', className: 'bg-orange-50 text-orange-700 border-orange-200' },
      'DELIVERED': { variant: 'outline', className: 'bg-green-50 text-green-700 border-green-200' },
      'APPROVED': { variant: 'outline', className: 'bg-green-50 text-green-700 border-green-200' },
      'PENDING_APPROVAL': { variant: 'outline', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
      'OPEN': { variant: 'outline', className: 'bg-red-50 text-red-700 border-red-200' },
    };
    const config = variants[status] || { variant: 'outline', className: '' };
    return <Badge variant={config.variant} className={config.className}>{status.replace(/_/g, ' ')}</Badge>;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Heart className="h-6 w-6 text-rose-500" />
            Smart Health Management
          </h1>
          <p className="text-gray-500">Manage pharmacies, prescriptions, and health orders</p>
        </div>
        <Button className="bg-rose-600 hover:bg-rose-700">
          <Store className="h-4 w-4 mr-2" />
          Add Pharmacy
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pharmacies">Pharmacies</TabsTrigger>
          <TabsTrigger value="orders">Health Orders</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Active Pharmacies</CardTitle>
                <Store className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activePharmacies}</div>
                <p className="text-xs text-gray-500">of {stats.totalPharmacies} registered</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Today's Orders</CardTitle>
                <Pill className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
                <p className="text-xs text-gray-500">{stats.pendingOrders} pending review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Today's Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">UGX {(stats.todayRevenue / 1000).toFixed(0)}K</div>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +12% from yesterday
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Pending Prescriptions</CardTitle>
                <FileText className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingPrescriptions}</div>
                <p className="text-xs text-amber-600">Awaiting verification</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders and Disputes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Health Orders */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Health Orders</CardTitle>
                <CardDescription>Latest pharmacy delivery orders</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Pharmacy</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentHealthOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.id}</TableCell>
                        <TableCell>{order.pharmacy}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={order.type === 'PRESCRIPTION_MEDICINE' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}>
                            {order.type === 'PRESCRIPTION_MEDICINE' ? 'Rx' : 'OTC'}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Prescription Disputes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Prescription Disputes
                </CardTitle>
                <CardDescription>Issues requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                {prescriptionDisputes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    No active disputes
                  </div>
                ) : (
                  <div className="space-y-3">
                    {prescriptionDisputes.map((dispute) => (
                      <div key={dispute.id} className="flex items-start justify-between p-3 bg-amber-50 rounded-lg">
                        <div>
                          <p className="font-medium">{dispute.id}</p>
                          <p className="text-sm text-gray-600">{dispute.issue}</p>
                        </div>
                        <Button size="sm" variant="outline">Review</Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pharmacies Tab */}
        <TabsContent value="pharmacies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Registered Pharmacies</CardTitle>
              <CardDescription>Manage pharmacy partners</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pharmacies.map((pharmacy) => (
                    <TableRow key={pharmacy.id}>
                      <TableCell className="font-medium">{pharmacy.name}</TableCell>
                      <TableCell>{pharmacy.address}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(pharmacy.status)}
                          {pharmacy.isOpen && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">Open</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{pharmacy.totalOrders}</TableCell>
                      <TableCell>
                        {pharmacy.rating > 0 ? (
                          <span className="flex items-center gap-1">
                            ⭐ {pharmacy.rating}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {pharmacy.status === 'PENDING_APPROVAL' && (
                            <>
                              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="destructive">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Health Orders</CardTitle>
              <CardDescription>All pharmacy delivery orders</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Pharmacy</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentHealthOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>{order.pharmacy}</TableCell>
                      <TableCell>{order.customer}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={order.type === 'PRESCRIPTION_MEDICINE' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}>
                          {order.type === 'PRESCRIPTION_MEDICINE' ? 'Prescription' : 'OTC'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>UGX {order.amount.toLocaleString()}</TableCell>
                      <TableCell>{order.createdAt}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prescriptions Tab */}
        <TabsContent value="prescriptions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-500" />
                Prescription Management
              </CardTitle>
              <CardDescription>Secure prescription handling and dispute resolution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Prescription Security</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      All prescription images are encrypted at rest
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Access restricted to verified pharmacy staff
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Complete audit trail for all access
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Automatic expiry detection
                    </li>
                  </ul>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold">Dispute Resolution</h4>
                  <div className="bg-amber-50 p-4 rounded-lg">
                    <p className="text-sm text-amber-800">
                      When a prescription is rejected by a pharmacy, clients can raise disputes.
                      Review the original prescription and pharmacy's reason for rejection.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-500" />
                Prescription Access Logs
              </CardTitle>
              <CardDescription>Track all prescription access for security compliance</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prescription ID</TableHead>
                    <TableHead>Accessed By</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prescriptionAccessLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.prescriptionId}</TableCell>
                      <TableCell>{log.accessedBy}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={log.action === 'VIEW' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.timestamp}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
