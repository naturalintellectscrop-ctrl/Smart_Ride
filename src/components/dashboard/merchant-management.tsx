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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { 
  Store, 
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
  Utensils,
  ShoppingCart,
  Pill,
  Building,
  Settings,
  Power,
  PowerOff
} from 'lucide-react';

// Mock data
const mockMerchants = [
  { 
    id: 'M001', 
    name: 'Cafe Java', 
    type: 'RESTAURANT',
    status: 'APPROVED',
    isOpen: true,
    phone: '+256 700 111 222',
    email: 'orders@cafejava.ug',
    address: 'Kampala Mall, Kampala',
    city: 'Kampala',
    rating: 4.5,
    totalOrders: 3456,
    commission: 0.15,
    avgPrepTime: 25,
    openingTime: '07:00',
    closingTime: '22:00',
    joinedAt: '2023-06-15',
  },
  { 
    id: 'M002', 
    name: 'Uchumi Supermarket', 
    type: 'SUPERMARKET',
    status: 'APPROVED',
    isOpen: true,
    phone: '+256 701 222 333',
    email: 'orders@uchumi.ug',
    address: 'Jinja Road, Kampala',
    city: 'Kampala',
    rating: 4.2,
    totalOrders: 1234,
    commission: 0.12,
    avgPrepTime: 15,
    openingTime: '08:00',
    closingTime: '21:00',
    joinedAt: '2023-08-20',
  },
  { 
    id: 'M003', 
    name: 'Pizza Hut Uganda', 
    type: 'RESTAURANT',
    status: 'APPROVED',
    isOpen: false,
    phone: '+256 702 333 444',
    email: 'orders@pizzahut.ug',
    address: 'Acacia Mall, Kisementi',
    city: 'Kampala',
    rating: 4.3,
    totalOrders: 2345,
    commission: 0.15,
    avgPrepTime: 30,
    openingTime: '10:00',
    closingTime: '23:00',
    joinedAt: '2023-05-10',
  },
  { 
    id: 'M004', 
    name: 'Health Plus Pharmacy', 
    type: 'PHARMACY',
    status: 'PENDING_APPROVAL',
    isOpen: false,
    phone: '+256 703 444 555',
    email: 'orders@healthplus.ug',
    address: 'Entebbe Road',
    city: 'Kampala',
    rating: 0,
    totalOrders: 0,
    commission: 0.10,
    avgPrepTime: 10,
    openingTime: '08:00',
    closingTime: '20:00',
    joinedAt: '2024-03-01',
  },
  { 
    id: 'M005', 
    name: 'Fresh Mart Grocery', 
    type: 'GROCERY',
    status: 'PENDING_APPROVAL',
    isOpen: false,
    phone: '+256 704 555 666',
    email: 'orders@freshmart.ug',
    address: 'Ntinda',
    city: 'Kampala',
    rating: 0,
    totalOrders: 0,
    commission: 0.10,
    avgPrepTime: 15,
    openingTime: '07:00',
    closingTime: '19:00',
    joinedAt: '2024-03-05',
  },
  { 
    id: 'M006', 
    name: 'Quick Shop Express', 
    type: 'RETAIL_STORE',
    status: 'REJECTED',
    isOpen: false,
    phone: '+256 705 666 777',
    email: 'info@quickshop.ug',
    address: 'Kabalagala',
    city: 'Kampala',
    rating: 0,
    totalOrders: 0,
    commission: 0.12,
    avgPrepTime: 10,
    openingTime: '08:00',
    closingTime: '22:00',
    joinedAt: '2024-02-28',
  },
];

export function MerchantManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredMerchants = mockMerchants.filter(merchant => {
    const matchesSearch = merchant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         merchant.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || merchant.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || merchant.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const pendingMerchants = filteredMerchants.filter(m => m.status === 'PENDING_APPROVAL');
  const approvedMerchants = filteredMerchants.filter(m => m.status === 'APPROVED');
  const rejectedMerchants = filteredMerchants.filter(m => m.status === 'REJECTED');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-100 text-emerald-700';
      case 'PENDING_APPROVAL': return 'bg-amber-100 text-amber-700';
      case 'REJECTED': return 'bg-red-100 text-red-700';
      case 'SUSPENDED': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'RESTAURANT': return 'bg-orange-100 text-orange-700';
      case 'SUPERMARKET': return 'bg-blue-100 text-blue-700';
      case 'RETAIL_STORE': return 'bg-purple-100 text-purple-700';
      case 'PHARMACY': return 'bg-green-100 text-green-700';
      case 'GROCERY': return 'bg-teal-100 text-teal-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'RESTAURANT': return <Utensils className="h-4 w-4" />;
      case 'SUPERMARKET': return <ShoppingCart className="h-4 w-4" />;
      case 'RETAIL_STORE': return <Building className="h-4 w-4" />;
      case 'PHARMACY': return <Pill className="h-4 w-4" />;
      case 'GROCERY': return <ShoppingCart className="h-4 w-4" />;
      default: return <Store className="h-4 w-4" />;
    }
  };

  const renderMerchantTable = (merchants: typeof mockMerchants) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Merchant</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Orders</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Commission</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {merchants.map((merchant) => (
            <TableRow key={merchant.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {merchant.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{merchant.name}</p>
                      {merchant.isOpen && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{merchant.id}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm">
                    <Phone className="h-3 w-3 text-gray-400" />
                    {merchant.phone}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <MapPin className="h-3 w-3" />
                    {merchant.city}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getTypeColor(merchant.type)} variant="secondary">
                  <span className="flex items-center gap-1">
                    {getTypeIcon(merchant.type)}
                    {merchant.type}
                  </span>
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(merchant.status)} variant="secondary">
                  {merchant.status.replace(/_/g, ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="font-medium">{merchant.totalOrders.toLocaleString()}</span>
              </TableCell>
              <TableCell>
                {merchant.rating > 0 ? (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{merchant.rating.toFixed(1)}</span>
                  </div>
                ) : (
                  <span className="text-gray-400">N/A</span>
                )}
              </TableCell>
              <TableCell>
                <span className="font-medium">{(merchant.commission * 100).toFixed(0)}%</span>
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
                    <DropdownMenuItem>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Menu
                    </DropdownMenuItem>
                    {merchant.status === 'APPROVED' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          {merchant.isOpen ? (
                            <>
                              <PowerOff className="h-4 w-4 mr-2" />
                              Close Shop
                            </>
                          ) : (
                            <>
                              <Power className="h-4 w-4 mr-2" />
                              Open Shop
                            </>
                          )}
                        </DropdownMenuItem>
                      </>
                    )}
                    {merchant.status === 'PENDING_APPROVAL' && (
                      <>
                        <DropdownMenuSeparator />
                        <Dialog>
                          <DialogTrigger asChild>
                            <DropdownMenuItem className="text-emerald-600">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve Merchant
                            </DropdownMenuItem>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Approve Merchant: {merchant.name}</DialogTitle>
                              <DialogDescription>
                                Review and approve this merchant application.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-gray-500">Type:</span> {merchant.type}</div>
                                <div><span className="text-gray-500">City:</span> {merchant.city}</div>
                                <div><span className="text-gray-500">Hours:</span> {merchant.openingTime} - {merchant.closingTime}</div>
                                <div><span className="text-gray-500">Avg Prep:</span> {merchant.avgPrepTime} min</div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Commission Rate (%)</label>
                                <Input type="number" defaultValue={(merchant.commission * 100).toString()} />
                              </div>
                              <Textarea placeholder="Approval notes..." />
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
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject Merchant
                            </DropdownMenuItem>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reject Merchant: {merchant.name}</DialogTitle>
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Merchant Management</h1>
          <p className="text-gray-500 mt-1">Manage restaurants, shops, and delivery partners</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Merchant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Merchant</DialogTitle>
                <DialogDescription>
                  Register a new merchant partner.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input placeholder="Business Name" />
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Business Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RESTAURANT">Restaurant</SelectItem>
                    <SelectItem value="SUPERMARKET">Supermarket</SelectItem>
                    <SelectItem value="RETAIL_STORE">Retail Store</SelectItem>
                    <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                    <SelectItem value="GROCERY">Grocery</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Phone Number" type="tel" />
                <Input placeholder="Email Address" type="email" />
                <Input placeholder="Address" />
                <Input placeholder="City" />
              </div>
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button>Add Merchant</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Merchants</p>
                <p className="text-2xl font-bold">156</p>
              </div>
              <Store className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Restaurants</p>
                <p className="text-2xl font-bold text-orange-600">89</p>
              </div>
              <Utensils className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Shops & Stores</p>
                <p className="text-2xl font-bold text-blue-600">67</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Open Now</p>
                <p className="text-2xl font-bold text-green-600">98</p>
              </div>
              <Power className="h-8 w-8 text-green-500" />
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
                  placeholder="Search merchants..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="RESTAURANT">Restaurant</SelectItem>
                  <SelectItem value="SUPERMARKET">Supermarket</SelectItem>
                  <SelectItem value="RETAIL_STORE">Retail Store</SelectItem>
                  <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                  <SelectItem value="GROCERY">Grocery</SelectItem>
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

      {/* Merchants Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Merchants</TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending
            <Badge variant="secondary" className="ml-1">{pendingMerchants.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Merchants</CardTitle>
              <CardDescription>Complete list of registered merchants</CardDescription>
            </CardHeader>
            <CardContent>
              {renderMerchantTable(filteredMerchants)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approval</CardTitle>
              <CardDescription>Merchants awaiting verification</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingMerchants.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No pending merchants
                </div>
              ) : (
                renderMerchantTable(pendingMerchants)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle>Approved Merchants</CardTitle>
              <CardDescription>Active merchant partners</CardDescription>
            </CardHeader>
            <CardContent>
              {renderMerchantTable(approvedMerchants)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card>
            <CardHeader>
              <CardTitle>Rejected Applications</CardTitle>
              <CardDescription>Merchants who were not approved</CardDescription>
            </CardHeader>
            <CardContent>
              {rejectedMerchants.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No rejected merchants
                </div>
              ) : (
                renderMerchantTable(rejectedMerchants)
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
