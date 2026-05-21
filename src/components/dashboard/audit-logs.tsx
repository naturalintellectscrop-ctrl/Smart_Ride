'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Loader2,
  User,
  Package,
  Shield,
  AlertCircle,
  Activity,
  Edit,
  Trash2,
  LogIn,
  LogOut,
  PlusCircle,
  CheckCircle,
  Download,
  Search,
  Filter,
  Smartphone,
  Monitor,
  Server,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string | null;
  timestamp: string;
  actor: string;
  actorType: string;
  source: string;
  ipAddress?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const getActionStyle = (action: string) => {
  if (action.includes('CREATE') || action.includes('APPROVE')) return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' };
  if (action.includes('UPDATE') || action.includes('MODIFY')) return { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' };
  if (action.includes('DELETE') || action.includes('REJECT') || action.includes('CANCEL')) return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' };
  if (action.includes('LOGIN')) return { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' };
  if (action.includes('LOGOUT')) return { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400' };
  if (action.includes('PAYMENT') || action.includes('WALLET')) return { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' };
  return { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400' };
};

const getActionIcon = (action: string) => {
  if (action.includes('CREATE')) return PlusCircle;
  if (action.includes('UPDATE') || action.includes('MODIFY')) return Edit;
  if (action.includes('DELETE')) return Trash2;
  if (action.includes('APPROVE')) return CheckCircle;
  if (action.includes('LOGIN')) return LogIn;
  if (action.includes('LOGOUT')) return LogOut;
  if (action.includes('PAYMENT') || action.includes('WALLET')) return Package;
  return Activity;
};

const getEntityStyle = (entityType: string) => {
  switch (entityType) {
    case 'USER': return { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: User };
    case 'ORDER': return { bg: 'bg-orange-500/10', text: 'text-orange-400', icon: Package };
    case 'TASK': return { bg: 'bg-purple-500/10', text: 'text-purple-400', icon: Package };
    case 'RIDER': return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: User };
    case 'MERCHANT': return { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: Shield };
    default: return { bg: 'bg-gray-500/10', text: 'text-gray-400', icon: Activity };
  }
};

const getSourceStyle = (source: string) => {
  switch (source) {
    case 'ADMIN_DASHBOARD': return { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', icon: Monitor, label: 'Admin Dashboard' };
    case 'MOBILE_APP': return { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', icon: Smartphone, label: 'Mobile App' };
    case 'API': return { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: Server, label: 'API' };
    default: return { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400', icon: Server, label: 'System' };
  }
};

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actorType, setActorType] = useState<string>('all');
  const [entityType, setEntityType] = useState<string>('all');
  const [source, setSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams({
        action: 'list',
        limit: '50',
        page: page.toString(),
      });
      if (actorType && actorType !== 'all') params.set('actorType', actorType);
      if (entityType && entityType !== 'all') params.set('entityType', entityType);
      if (source && source !== 'all') params.set('source', source);
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/audit?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setPagination(data.pagination || { page, limit: 50, total: 0, totalPages: 0 });
      } else {
        throw new Error('Failed to fetch audit logs');
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setError('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [actorType, entityType, source, searchQuery]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const handleExportDocx = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams({ action: 'export-docx' });
      if (actorType && actorType !== 'all') params.set('actorType', actorType);
      if (entityType && entityType !== 'all') params.set('entityType', entityType);
      if (source && source !== 'all') params.set('source', source);
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/audit?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smart-ride-audit-report-${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams({ action: 'export' });
      if (actorType && actorType !== 'all') params.set('actorType', actorType);
      if (entityType && entityType !== 'all') params.set('entityType', entityType);
      if (source && source !== 'all') params.set('source', source);

      const response = await fetch(`/api/audit?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const clearFilters = () => {
    setActorType('all');
    setEntityType('all');
    setSource('all');
    setSearchQuery('');
  };

  const hasActiveFilters = actorType !== 'all' || entityType !== 'all' || source !== 'all' || searchQuery !== '';

  if (error) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="glass-card rounded-2xl p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4 mx-auto" />
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => fetchLogs(1)}
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
      {/* Header with Export Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
              <FileText className="h-5 w-5 text-purple-400" />
            </div>
            Audit Logs
          </h1>
          <p className="text-gray-400 mt-1">Track all system activities across admin dashboard and mobile app</p>
        </div>

        {/* Export Buttons - Top Right */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => fetchLogs(pagination.page)}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white hover:bg-white/5"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            size="sm"
            className={`border-white/10 ${showFilters ? 'bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/30' : 'text-gray-400 hover:text-white'}`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1.5 w-2 h-2 rounded-full bg-[#00FF88]" />
            )}
          </Button>
          <Button
            onClick={handleExportCsv}
            variant="outline"
            size="sm"
            disabled={isExporting}
            className="border-white/10 text-gray-400 hover:text-white"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            CSV
          </Button>
          <Button
            onClick={handleExportDocx}
            size="sm"
            disabled={isExporting}
            className="bg-gradient-to-r from-[#00FF88] to-[#00CC6A] text-black font-medium hover:opacity-90"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            Export DOCX
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="glass-card rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Filter className="h-4 w-4 text-[#00FF88]" />
                Filter Audit Logs
              </h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-gray-400 hover:text-[#00FF88] flex items-center gap-1 transition-colors"
                >
                  <X className="h-3 w-3" />
                  Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search actions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00FF88]/50 transition-colors"
                />
              </div>

              {/* Actor Type */}
              <Select value={actorType} onValueChange={setActorType}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl">
                  <SelectValue placeholder="Actor Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actors</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="RIDER">Rider</SelectItem>
                  <SelectItem value="MERCHANT">Merchant</SelectItem>
                  <SelectItem value="SYSTEM">System</SelectItem>
                </SelectContent>
              </Select>

              {/* Entity Type */}
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl">
                  <SelectValue placeholder="Entity Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="User">User</SelectItem>
                  <SelectItem value="Rider">Rider</SelectItem>
                  <SelectItem value="Merchant">Merchant</SelectItem>
                  <SelectItem value="Order">Order</SelectItem>
                  <SelectItem value="Task">Task</SelectItem>
                  <SelectItem value="Payment">Payment</SelectItem>
                  <SelectItem value="HealthOrder">Health Order</SelectItem>
                  <SelectItem value="Prescription">Prescription</SelectItem>
                </SelectContent>
              </Select>

              {/* Source */}
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="ADMIN_DASHBOARD">Admin Dashboard</SelectItem>
                  <SelectItem value="MOBILE_APP">Mobile App</SelectItem>
                  <SelectItem value="API">API</SelectItem>
                  <SelectItem value="SYSTEM">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Logs</p>
                <p className="text-2xl font-bold text-white">{pagination.total}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <FileText className="h-5 w-5 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Admin Dashboard</p>
                <p className="text-2xl font-bold text-cyan-400">{logs.filter(l => l.source === 'ADMIN_DASHBOARD').length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                <Monitor className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Mobile App</p>
                <p className="text-2xl font-bold text-violet-400">{logs.filter(l => l.source === 'MOBILE_APP').length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                <Smartphone className="h-5 w-5 text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Create Actions</p>
                <p className="text-2xl font-bold text-emerald-400">{logs.filter(l => l.action.includes('CREATE')).length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <PlusCircle className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card className="glass-card rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#00FF88]" />
                Activity Log
              </CardTitle>
              <CardDescription className="text-gray-500">
                All system actions across admin dashboard and mobile app are recorded here
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-[#00FF88]" />
              <p className="text-gray-400 text-sm mt-3">Loading audit logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gray-500/10 flex items-center justify-center mx-auto mb-4 border border-gray-500/20">
                <FileText className="h-8 w-8 text-gray-500" />
              </div>
              <p className="text-gray-400">No audit logs found</p>
              <p className="text-gray-500 text-sm mt-1">
                {hasActiveFilters ? 'Try adjusting your filters' : 'System activities will be recorded here'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-gray-400">Action</TableHead>
                      <TableHead className="text-gray-400">Source</TableHead>
                      <TableHead className="text-gray-400">Entity</TableHead>
                      <TableHead className="text-gray-400">Description</TableHead>
                      <TableHead className="text-gray-400">Actor</TableHead>
                      <TableHead className="text-gray-400">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const actionStyle = getActionStyle(log.action);
                      const ActionIcon = getActionIcon(log.action);
                      const entityStyle = getEntityStyle(log.entityType);
                      const EntityIcon = entityStyle.icon;
                      const sourceStyle = getSourceStyle(log.source);
                      const SourceIcon = sourceStyle.icon;
                      return (
                        <TableRow key={log.id} className="border-white/5 hover:bg-white/5">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg ${actionStyle.bg} flex items-center justify-center border ${actionStyle.border}`}>
                                <ActionIcon className={`h-4 w-4 ${actionStyle.text}`} />
                              </div>
                              <Badge className={`${actionStyle.bg} ${actionStyle.text} ${actionStyle.border} border`}>
                                {log.action}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${sourceStyle.bg} border ${sourceStyle.border}`}>
                              <SourceIcon className={`h-3.5 w-3.5 ${sourceStyle.text}`} />
                              <span className={`text-xs font-medium ${sourceStyle.text}`}>{sourceStyle.label}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${entityStyle.bg} border border-white/10`}>
                              <EntityIcon className={`h-3.5 w-3.5 ${entityStyle.text}`} />
                              <span className={`text-sm ${entityStyle.text}`}>{log.entityType}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-gray-300">{log.description || '-'}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-white">{log.actor || 'System'}</p>
                              <p className="text-sm text-gray-500">{log.actorType}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-400 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                  <p className="text-sm text-gray-400">
                    Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => fetchLogs(pagination.page - 1)}
                      className="text-gray-400 hover:text-white"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const pageNum = pagination.page <= 3
                        ? i + 1
                        : pagination.page >= pagination.totalPages - 2
                          ? pagination.totalPages - 4 + i
                          : pagination.page - 2 + i;
                      if (pageNum < 1 || pageNum > pagination.totalPages) return null;
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === pagination.page ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => fetchLogs(pageNum)}
                          className={pageNum === pagination.page
                            ? 'bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/30'
                            : 'text-gray-400 hover:text-white'
                          }
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => fetchLogs(pagination.page + 1)}
                      className="text-gray-400 hover:text-white"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
