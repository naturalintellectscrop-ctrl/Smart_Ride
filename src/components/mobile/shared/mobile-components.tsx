'use client';

import { cn } from '@/lib/utils';
import { ArrowLeft, Bell, User } from 'lucide-react';

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  transparent?: boolean;
}

export function MobileHeader({ 
  title, 
  subtitle, 
  showBack, 
  onBack, 
  rightAction,
  transparent 
}: MobileHeaderProps) {
  return (
    <header className={cn(
      "sticky top-0 z-40 px-4 py-3",
      transparent ? "bg-transparent" : "bg-white border-b border-gray-100"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button 
              onClick={onBack}
              className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-95 transition-transform"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {rightAction || (
            <>
              <button className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
                <Bell className="h-5 w-5 text-gray-600" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <button className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100">
                <User className="h-5 w-5 text-gray-600" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
  }>;
}

export function BottomNav({ activeTab, onTabChange, tabs }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 z-50 safe-area-bottom max-w-md mx-auto">
      <div className="flex justify-around items-center">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all min-w-[64px]",
              activeTab === tab.id 
                ? "text-emerald-600 bg-emerald-50" 
                : "text-gray-500 hover:bg-gray-50"
            )}
          >
            {tab.icon}
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

export function MobileCard({ children, className, onClick }: { 
  children: React.ReactNode; 
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div 
      className={cn(
        "bg-white rounded-2xl shadow-sm border border-gray-100",
        onClick && "cursor-pointer active:scale-[0.98] transition-transform",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function ServiceButton({ 
  icon, 
  label, 
  color, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  color: string;
  onClick?: () => void;
}) {
  const colorClasses: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    teal: "bg-teal-50 text-teal-600 border-teal-200",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all active:scale-95",
        colorClasses[color] || colorClasses.emerald
      )}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
