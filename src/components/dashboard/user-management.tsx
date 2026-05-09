'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { 
  Users, 
  Search, 
  Plus, 
  MoreHorizontal, 
  Download,
  Mail,
  Phone,
  Shield,
  Ban,
  CheckCircle,
  Edit,
  Trash2,
  Eye,
  Loader2,
  AlertCircle,
  UserCheck,
  UserX,
  UserPlus
} from 'lucide-react';
import { EditUserDialog } from '@/components/dashboard/edit-user-dialog';

interface User {
  id: string;
  email: string;
  phone: string | null;
  name: string;
  role: string;
  status: string;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  orderCount: number;
  taskCount: number;
}

interface UserStats {
  total: number;
  active: number;
  suspended: number;
  inactive: number;
  banned: number;
  admins: number;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams();
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery || searchQuery === '') {
        fetchUsers();
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleUserAction = async (userId: string, action: string, role?: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, action, role }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      alert('Failed to update user');
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE': return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' };
      case 'INACTIVE': return { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400' };
      case 'SUSPENDED': return { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' };
      case 'BANNED': return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' };
      default: return { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400' };
    }
  };

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' };
      case 'ADMIN': return { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' };
      case 'OPERATIONS_ADMIN': return { bg: 'bg-teal-500/10', border: 'border-teal-500/20', text: 'text-teal-400' };
      case 'COMPLIANCE_ADMIN': return { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' };
      case 'FINANCE_ADMIN': return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' };
      default: return { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400' };
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#00FF88]" />
          <p className="text-gray-400 text-sm">Loading users...</p>
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
            onClick={fetchUsers}
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
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">User Management</h1>
          <p className="text-gray-400 mt-1">Manage clients and admin users</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="glass-button text-gray-300 border-white/10 hover:bg-white/5">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-to-r from-[#00FF88] to-[#00CC6A] text-black font-medium hover:opacity-90">
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="text-white">Add New User</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Create a new user account. They will receive an email to set their password.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input placeholder="Full Name" className="glass-input border-white/10 text-white placeholder:text-gray-500" />
                <Input placeholder="Email Address" type="email" className="glass-input border-white/10 text-white placeholder:text-gray-500" />
                <Input placeholder="Phone Number" type="tel" className="glass-input border-white/10 text-white placeholder:text-gray-500" />
                <Select>
                  <SelectTrigger className="glass-input border-white/10 text-white">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-white/10">
                    <SelectItem value="CLIENT">Client</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    <SelectItem value="OPERATIONS_ADMIN">Operations Admin</SelectItem>
                    <SelectItem value="COMPLIANCE_ADMIN">Compliance Admin</SelectItem>
                    <SelectItem value="FINANCE_ADMIN">Finance Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="w-full bg-gradient-to-r from-[#00FF88] to-[#00CC6A] text-black font-medium">Create User</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="glass-card glow-hover rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-white">{stats.total.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card glow-hover rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Users</p>
                  <p className="text-2xl font-bold text-emerald-400">{stats.active.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card glow-hover rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Suspended</p>
                  <p className="text-2xl font-bold text-amber-400">{stats.suspended}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <Ban className="h-5 w-5 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card glow-hover rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Banned</p>
                  <p className="text-2xl font-bold text-red-400">{stats.banned}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                  <UserX className="h-5 w-5 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card glow-hover rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Admin Users</p>
                  <p className="text-2xl font-bold text-purple-400">{stats.admins}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                  <Shield className="h-5 w-5 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card className="glass-card rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  className="pl-10 glass-input border-white/10 text-white placeholder:text-gray-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-36 glass-input border-white/10 text-white">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10">
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="CLIENT">Client</SelectItem>
                  <SelectItem value="RIDER">Rider</SelectItem>
                  <SelectItem value="MERCHANT">Merchant</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 glass-input border-white/10 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="BANNED">Banned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="glass-card rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white">Users</CardTitle>
          <CardDescription className="text-gray-500">A list of all registered users</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gray-500/10 flex items-center justify-center mx-auto mb-4 border border-gray-500/20">
                <Users className="h-8 w-8 text-gray-500" />
              </div>
              <p className="text-gray-400">No users found</p>
              <p className="text-gray-500 text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-gray-400">User</TableHead>
                    <TableHead className="text-gray-400">Contact</TableHead>
                    <TableHead className="text-gray-400">Role</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Joined</TableHead>
                    <TableHead className="text-gray-400">Orders</TableHead>
                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const statusStyle = getStatusStyle(user.status);
                    const roleStyle = getRoleStyle(user.role);
                    return (
                      <TableRow key={user.id} className="border-white/5 hover:bg-white/5">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-white/10">
                              <AvatarImage src={user.avatarUrl || ''} />
                              <AvatarFallback className="bg-[#00FF88]/20 text-[#00FF88]">
                                {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-white">{user.name}</p>
                              <p className="text-sm text-gray-500">{user.id.substring(0, 8)}...</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-sm text-gray-300">
                              <Mail className="h-3.5 w-3.5 text-gray-500" />
                              {user.email}
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                <Phone className="h-3.5 w-3.5" />
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${roleStyle.bg} ${roleStyle.text} ${roleStyle.border} border`} variant="secondary">
                            {user.role.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} border`} variant="secondary">
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-400">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium text-white">{user.orderCount}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/5">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="glass-card border-white/10">
                              <DropdownMenuLabel className="text-white">Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-white/5" />
                              <DropdownMenuItem 
                                className="text-gray-300 focus:text-white focus:bg-white/5"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsViewDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-gray-300 focus:text-white focus:bg-white/5"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-gray-300 focus:text-white focus:bg-white/5" onClick={() => handleUserAction(user.id, 'change_role')}>
                                <Shield className="h-4 w-4 mr-2" />
                                Change Role
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/5" />
                              {user.status !== 'ACTIVE' && (
                                <DropdownMenuItem className="text-emerald-400 focus:bg-emerald-500/10" onClick={() => handleUserAction(user.id, 'activate')}>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Activate User
                                </DropdownMenuItem>
                              )}
                              {user.status !== 'SUSPENDED' && (
                                <DropdownMenuItem className="text-amber-400 focus:bg-amber-500/10" onClick={() => handleUserAction(user.id, 'suspend')}>
                                  <Ban className="h-4 w-4 mr-2" />
                                  Suspend User
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-red-400 focus:bg-red-500/10" onClick={() => handleUserAction(user.id, 'ban')}>
                                <UserX className="h-4 w-4 mr-2" />
                                Ban User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Edit User Dialog */}
      <EditUserDialog 
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        user={selectedUser}
        onSuccess={() => {
          fetchUsers();
          setIsEditDialogOpen(false);
          setSelectedUser(null);
        }}
      />

      {/* View User Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md glass-card border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border border-white/10">
                  <AvatarImage src={selectedUser.avatarUrl || ''} />
                  <AvatarFallback className="bg-[#00FF88]/20 text-[#00FF88] text-xl">
                    {selectedUser.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedUser.name}</h3>
                  <p className="text-sm text-gray-400">{selectedUser.id}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="glass p-3 rounded-xl border border-white/5">
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm text-white truncate">{selectedUser.email}</p>
                </div>
                <div className="glass p-3 rounded-xl border border-white/5">
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm text-white">{selectedUser.phone || 'Not set'}</p>
                </div>
                <div className="glass p-3 rounded-xl border border-white/5">
                  <p className="text-xs text-gray-500">Role</p>
                  <Badge className={`${getRoleStyle(selectedUser.role).bg} ${getRoleStyle(selectedUser.role).text} ${getRoleStyle(selectedUser.role).border} border mt-1`}>
                    {selectedUser.role.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="glass p-3 rounded-xl border border-white/5">
                  <p className="text-xs text-gray-500">Status</p>
                  <Badge className={`${getStatusStyle(selectedUser.status).bg} ${getStatusStyle(selectedUser.status).text} ${getStatusStyle(selectedUser.status).border} border mt-1`}>
                    {selectedUser.status}
                  </Badge>
                </div>
                <div className="glass p-3 rounded-xl border border-white/5">
                  <p className="text-xs text-gray-500">Joined</p>
                  <p className="text-sm text-white">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="glass p-3 rounded-xl border border-white/5">
                  <p className="text-xs text-gray-500">Orders</p>
                  <p className="text-sm text-white">{selectedUser.orderCount}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
