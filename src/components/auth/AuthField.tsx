import React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AuthFieldProps extends React.ComponentProps<typeof Input> {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  trailing?: React.ReactNode;
}

export function AuthField({ label, icon: Icon, trailing, className, ...props }: AuthFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={props.id} className="block text-sm font-medium text-white/70">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
        <Input
          {...props}
          className={cn(
            'h-11 border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30 focus-visible:border-[#00D97E]/60 focus-visible:ring-[#00D97E]/20',
            trailing && 'pr-10',
            className,
          )}
        />
        {trailing && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{trailing}</div>
        )}
      </div>
    </div>
  );
}
