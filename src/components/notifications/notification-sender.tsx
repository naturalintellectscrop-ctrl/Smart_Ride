'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Zap, 
  Gift, 
  MapPin, 
  DollarSign, 
  Users, 
  Megaphone,
  Loader2
} from 'lucide-react';

interface NotificationSenderProps {
  zones?: { id: string; name: string }[];
  onSend?: () => void;
}

const broadcastTypes = [
  { value: 'SURGE_ACTIVATION', label: 'Surge Activation', icon: Zap, description: 'Notify riders about surge pricing' },
  { value: 'HIGH_DEMAND_ALERT', label: 'High Demand Alert', icon: MapPin, description: 'Alert riders to high demand zones' },
  { value: 'INCENTIVE_CREATED', label: 'New Incentive', icon: Gift, description: 'Announce new driver incentives' },
  { value: 'EARNINGS_OPPORTUNITY', label: 'Earnings Opportunity', icon: DollarSign, description: 'Highlight earning opportunities' },
  { value: 'DRIVER_REQUEST', label: 'Driver Request', icon: Users, description: 'Request drivers to move to a zone' },
  { value: 'PROMOTION_CREATED', label: 'Client Promotion', icon: Megaphone, description: 'Announce promotions to clients' },
];

const targetAudiences = [
  { value: 'ALL_ONLINE_RIDERS', label: 'All Online Riders' },
  { value: 'RIDERS', label: 'All Riders' },
  { value: 'ZONE_RIDERS', label: 'Riders in Zone' },
  { value: 'CLIENTS', label: 'All Clients' },
  { value: 'ZONE_CLIENTS', label: 'Clients in Zone' },
  { value: 'ALL', label: 'All Users' },
];

export function NotificationSender({ zones = [], onSend }: NotificationSenderProps) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    broadcastType: '',
    title: '',
    message: '',
    targetAudience: 'ALL_ONLINE_RIDERS',
    zoneId: '',
    expiresInMinutes: '60',
  });
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!formData.broadcastType || !formData.title || !formData.message) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broadcastType: formData.broadcastType,
          title: formData.title,
          message: formData.message,
          targetAudience: formData.targetAudience,
          zoneId: formData.zoneId || undefined,
          expiresInMinutes: parseInt(formData.expiresInMinutes) || 60,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Notification Sent',
          description: `Successfully sent to ${data.data.recipientCount} recipients`,
        });
        setOpen(false);
        setFormData({
          broadcastType: '',
          title: '',
          message: '',
          targetAudience: 'ALL_ONLINE_RIDERS',
          zoneId: '',
          expiresInMinutes: '60',
        });
        onSend?.();
      } else {
        throw new Error(data.error || 'Failed to send notification');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send notification',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const selectedType = broadcastTypes.find(t => t.value === formData.broadcastType);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Send className="h-4 w-4 mr-2" />
          Send Notification
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Broadcast Notification</DialogTitle>
          <DialogDescription>
            Send notifications to drivers or clients
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Broadcast Type */}
          <div className="space-y-2">
            <Label>Notification Type *</Label>
            <Select 
              value={formData.broadcastType} 
              onValueChange={(v) => setFormData({ ...formData, broadcastType: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select notification type" />
              </SelectTrigger>
              <SelectContent>
                {broadcastTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {selectedType && (
              <p className="text-xs text-muted-foreground">{selectedType.description}</p>
            )}
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label>Target Audience *</Label>
            <Select 
              value={formData.targetAudience} 
              onValueChange={(v) => setFormData({ ...formData, targetAudience: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select target audience" />
              </SelectTrigger>
              <SelectContent>
                {targetAudiences.map((audience) => (
                  <SelectItem key={audience.value} value={audience.value}>
                    {audience.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Zone Selection */}
          {(formData.targetAudience === 'ZONE_RIDERS' || formData.targetAudience === 'ZONE_CLIENTS') && (
            <div className="space-y-2">
              <Label>Zone *</Label>
              <Select 
                value={formData.zoneId} 
                onValueChange={(v) => setFormData({ ...formData, zoneId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select zone" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., ⚡ Surge 1.5x Active!"
              maxLength={100}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Enter the notification message..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.message.length}/500
            </p>
          </div>

          {/* Expiration */}
          <div className="space-y-2">
            <Label htmlFor="expires">Expires After (minutes)</Label>
            <Input
              id="expires"
              type="number"
              value={formData.expiresInMinutes}
              onChange={(e) => setFormData({ ...formData, expiresInMinutes: e.target.value })}
              min={5}
              max={1440}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Notification
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default NotificationSender;
