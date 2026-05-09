'use client';

import Image from 'next/image';
import { 
  LayoutDashboard, 
  Users, 
  Bike, 
  Store, 
  ShoppingCart, 
  ClipboardList, 
  CreditCard, 
  FileText, 
  Settings,
  Menu,
  X,
  Car,
  Package,
  Activity,
  Heart,
  Shield,
  ShieldAlert,
  LogOut
} from 'lucide-react';
import { ActiveView } from '@/components/dashboard/admin-dashboard';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
}

const menuItems = [
  { id: 'dashboard' as ActiveView, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'monitoring' as ActiveView, label: 'Live Monitoring', icon: Activity },
  { id: 'sos' as ActiveView, label: 'SOS Safety', icon: Shield },
  { id: 'fraud' as ActiveView, label: 'Fraud Detection', icon: ShieldAlert },
  { id: 'users' as ActiveView, label: 'User Management', icon: Users },
  { id: 'riders' as ActiveView, label: 'Rider Management', icon: Bike },
  { id: 'merchants' as ActiveView, label: 'Merchants', icon: Store },
  { id: 'health' as ActiveView, label: 'Smart Health', icon: Heart },
  { id: 'orders' as ActiveView, label: 'Orders', icon: ShoppingCart },
  { id: 'tasks' as ActiveView, label: 'Tasks', icon: ClipboardList },
  { id: 'payments' as ActiveView, label: 'Payments & Finance', icon: CreditCard },
  { id: 'audit' as ActiveView, label: 'Audit Logs', icon: FileText },
  { id: 'settings' as ActiveView, label: 'Settings', icon: Settings },
];

export function Sidebar({ activeView, setActiveView }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/';
  };

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden text-white hover:bg-white/10 glass-button"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-40 flex flex-col glass-sidebar transition-all duration-300",
        collapsed ? "w-20" : "w-64",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Image 
                src="/images/logo.png"
                alt="Smart Ride"
                width={42}
                height={42}
                className="rounded-xl"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#00FF88] rounded-full border-2 border-[#0D0D12]" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="font-bold text-lg text-white tracking-tight">Smart Ride</h1>
                <p className="text-xs text-gray-500">Admin Dashboard</p>
              </div>
            )}
          </div>
        </div>

        {/* Services Overview */}
        {!collapsed && (
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Services</p>
            <div className="flex gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20 backdrop-blur-sm">
                <Bike className="h-3 w-3 text-emerald-400" />
                <span className="text-xs text-emerald-400 font-medium">Boda</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20 backdrop-blur-sm">
                <Car className="h-3 w-3 text-blue-400" />
                <span className="text-xs text-blue-400 font-medium">Car</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 rounded-lg border border-orange-500/20 backdrop-blur-sm">
                <Package className="h-3 w-3 text-orange-400" />
                <span className="text-xs text-orange-400 font-medium">Food</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-rose-500/10 rounded-lg border border-rose-500/20 backdrop-blur-sm">
                <Heart className="h-3 w-3 text-rose-400" />
                <span className="text-xs text-rose-400 font-medium">Health</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 rounded-lg border border-purple-500/20 backdrop-blur-sm">
                <ShoppingCart className="h-3 w-3 text-purple-400" />
                <span className="text-xs text-purple-400 font-medium">Shop</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-teal-500/10 rounded-lg border border-teal-500/20 backdrop-blur-sm">
                <Package className="h-3 w-3 text-teal-400" />
                <span className="text-xs text-teal-400 font-medium">Courier</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto glass-scrollbar">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setActiveView(item.id);
                    setMobileOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200",
                    activeView === item.id
                      ? "bg-gradient-to-r from-[#00FF88]/15 to-[#00FF88]/5 text-[#00FF88] font-medium border border-[#00FF88]/20 shadow-[0_0_20px_rgba(0,255,136,0.1)]"
                      : "text-gray-400 hover:bg-white/5 hover:text-white border border-transparent"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout button */}
        <div className="px-3 py-3 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all duration-200"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

        {/* Collapse button */}
        <div className="hidden lg:block p-3 border-t border-white/5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/5"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {!collapsed && <span className="ml-2">Collapse</span>}
          </Button>
        </div>
      </aside>
    </>
  );
}
