'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  FileText, 
  Search, 
  Download,
  Filter,
  User,
  Bike,
  Store,
  ShoppingCart,
  Clock,
  Eye
} from 'lucide-react';

// Mock data
const mockAuditLogs = [
  { id: 'AL001', action: 'USER_REGISTERED', actor: 'System', actorType: 'SYSTEM', entityType: 'User', entityId: 'U-12345', description: 'New user registered via Google', timestamp: '2024-03-15 15:30:45' },
  { id: 'AL002', action: 'RIDER_APPROVED', actor: 'Admin User', actorType: 'ADMIN', entityType: 'Rider', entityId: 'R-67890', description: 'Rider Emmanuel Okello approved after verification', timestamp: '2024-03-15 15:25:30' },
  { id: 'AL003', action: 'ORDER_CREATED', actor: 'John Doe', actorType: 'USER', entityType: 'Order', entityId: 'ORD-28471', description: 'Food order created for Cafe Java', timestamp: '2024-03-15 15:20:15' },
  { id: 'AL004', action: 'TASK_ASSIGNED', actor: 'System', actorType: 'SYSTEM', entityType: 'Task', entityId: 'T-9823', description: 'Task assigned to rider Grace Nakamya', timestamp: '2024-03-15 15:15:00' },
  { id: 'AL005', action: 'PAYMENT_COMPLETED', actor: 'System', actorType: 'SYSTEM', entityType: 'Payment', entityId: 'PAY-12345', description: 'Payment of UGX 50,000 processed via MTN Mobile Money', timestamp: '2024-03-15 15:10:45' },
  { id: 'AL006', action: 'MERCHANT_APPROVED', actor: 'Admin User', actorType: 'ADMIN', entityType: 'Merchant', entityId: 'M-456', description: 'Merchant Cafe Java approved', timestamp: '2024-03-15 15:05:30' },
  { id: 'AL007', action: 'RIDER_REJECTED', actor: 'Admin User', actorType: 'ADMIN', entityType: 'Rider', entityId: 'R-111', description: 'Rider application rejected - Invalid documents', timestamp: '2024-03-15 15:00:00' },
  { id: 'AL008', action: 'ORDER_CANCELLED', actor: 'Jane Smith', actorType: 'USER', entityType: 'Order', entityId: 'ORD-28470', description: 'Order cancelled by client - Reason: Changed mind', timestamp: '2024-03-15 14:55:45' },
];

export function AuditLogs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actorTypeFilter, setActorTypeFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  const filteredLogs = mockAuditLogs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesActorType = actorTypeFilter === 'all' || log.actorType === actorTypeFilter;
    const matchesAction = actionFilter === 'all' || log.action.includes(actionFilter);
    return matchesSearch && matchesActorType && matchesAction;
  });

  const getActorTypeIcon = (type: string) => {
    switch (type) {
      case 'USER': return <User className="h-4 w-4" />;
      case 'RIDER': return <Bike className="h-4 w-4" />;
      case 'MERCHANT': return <Store className="h-4 w-4" />;
      case 'ADMIN': return <User className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getActorTypeColor = (type: string) => {
    switch (type) {
      case 'SYSTEM': return 'bg-gray-100 text-gray-700';
      case 'USER': return 'bg-blue-100 text-blue-700';
      case 'RIDER': return 'bg-emerald-100 text-emerald-700';
      case 'MERCHANT': return 'bg-orange-100 text-orange-700';
      case 'ADMIN': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('APPROVED') || action.includes('COMPLETED')) return 'bg-emerald-100 text-emerald-700';
    if (action.includes('REJECTED') || action.includes('CANCELLED')) return 'bg-red-100 text-red-700';
    if (action.includes('CREATED') || action.includes('REGISTERED')) return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500 mt-1">Track all system activities and changes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Today's Logs</p>
                <p className="text-2xl font-bold">2,456</p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">User Actions</p>
                <p className="text-2xl font-bold text-blue-600">1,234</p>
              </div>
              <User className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">System Actions</p>
                <p className="text-2xl font-bold text-gray-600">987</p>
              </div>
              <Clock className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Admin Actions</p>
                <p className="text-2xl font-bold text-purple-600">235</p>
              </div>
              <User className="h-8 w-8 text-purple-500" />
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
                  placeholder="Search logs..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={actorTypeFilter} onValueChange={setActorTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Actor Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actors</SelectItem>
                  <SelectItem value="SYSTEM">System</SelectItem>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="RIDER">Rider</SelectItem>
                  <SelectItem value="MERCHANT">Merchant</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="APPROVED">Approvals</SelectItem>
                  <SelectItem value="REJECTED">Rejections</SelectItem>
                  <SelectItem value="CREATED">Creations</SelectItem>
                  <SelectItem value="CANCELLED">Cancellations</SelectItem>
                  <SelectItem value="PAYMENT">Payments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>Detailed record of all system events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-gray-500 whitespace-nowrap">
                      {log.timestamp}
                    </TableCell>
                    <TableCell>
                      <Badge className={getActionColor(log.action)} variant="secondary">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className={getActorTypeColor(log.actorType)} variant="secondary">
                          <span className="flex items-center gap-1">
                            {getActorTypeIcon(log.actorType)}
                            {log.actorType}
                          </span>
                        </Badge>
                        <span className="text-sm">{log.actor}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">{log.entityType}</p>
                        <p className="text-gray-500">{log.entityId}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{log.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
