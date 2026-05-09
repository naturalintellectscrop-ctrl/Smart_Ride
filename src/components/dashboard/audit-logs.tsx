'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  CheckCircle
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
}

const getActionStyle = (action: string) => {
  if (action.includes('CREATE') || action.includes('APPROVE')) return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' };
  if (action.includes('UPDATE') || action.includes('MODIFY')) return { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' };
  if (action.includes('DELETE') || action.includes('REJECT') || action.includes('CANCEL')) return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' };
  if (action.includes('LOGIN')) return { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' };
  if (action.includes('LOGOUT')) return { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400' };
  return { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400' };
};

const getActionIcon = (action: string) => {
  if (action.includes('CREATE')) return PlusCircle;
  if (action.includes('UPDATE') || action.includes('MODIFY')) return Edit;
  if (action.includes('DELETE')) return Trash2;
  if (action.includes('APPROVE')) return CheckCircle;
  if (action.includes('LOGIN')) return LogIn;
  if (action.includes('LOGOUT')) return LogOut;
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

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/audit?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      } else {
        throw new Error('Failed to fetch audit logs');
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setError('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#00FF88]" />
          <p className="text-gray-400 text-sm">Loading audit logs...</p>
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
            onClick={fetchLogs}
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
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
            <FileText className="h-5 w-5 text-purple-400" />
          </div>
          Audit Logs
        </h1>
        <p className="text-gray-400 mt-1">Track all system activities</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Logs</p>
                <p className="text-2xl font-bold text-white">{logs.length}</p>
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
                <p className="text-sm text-gray-400">Create Actions</p>
                <p className="text-2xl font-bold text-emerald-400">{logs.filter(l => l.action.includes('CREATE')).length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <PlusCircle className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Update Actions</p>
                <p className="text-2xl font-bold text-blue-400">{logs.filter(l => l.action.includes('UPDATE')).length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Edit className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Login Events</p>
                <p className="text-2xl font-bold text-purple-400">{logs.filter(l => l.action.includes('LOGIN')).length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <LogIn className="h-5 w-5 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card className="glass-card rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#00FF88]" />
            Activity Log
          </CardTitle>
          <CardDescription className="text-gray-500">All system actions are recorded here</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gray-500/10 flex items-center justify-center mx-auto mb-4 border border-gray-500/20">
                <FileText className="h-8 w-8 text-gray-500" />
              </div>
              <p className="text-gray-400">No audit logs yet</p>
              <p className="text-gray-500 text-sm mt-1">System activities will be recorded here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-gray-400">Action</TableHead>
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
                        <TableCell className="text-gray-400">{new Date(log.timestamp).toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
