'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Globe,
  DollarSign,
  Clock,
  Save,
  RefreshCw,
  Sparkles
} from 'lucide-react';

export function Settings() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Background Glow Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00FF88]/5 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00FFF3]/5 rounded-full blur-[128px]" />
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <SettingsIcon className="h-8 w-8 text-[#00FF88]" />
            Settings
          </h1>
          <p className="text-white/50 mt-1 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#00FF88]" />
            Configure platform settings and preferences
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          className={`bg-gradient-to-r from-[#00FF88] to-[#00FFF3] text-[#0D0D12] font-semibold hover:shadow-lg hover:shadow-[#00FF88]/30 transition-all ${saved ? 'opacity-80' : ''}`}
        >
          {saved ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Saved!
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4 relative z-10">
        <TabsList className="bg-[#1A1A24] border border-white/10">
          <TabsTrigger value="general" className="data-[state=active]:bg-[#00FF88]/20 data-[state=active]:text-[#00FF88]">General</TabsTrigger>
          <TabsTrigger value="pricing" className="data-[state=active]:bg-[#00FF88]/20 data-[state=active]:text-[#00FF88]">Pricing</TabsTrigger>
          <TabsTrigger value="sla" className="data-[state=active]:bg-[#00FF88]/20 data-[state=active]:text-[#00FF88]">SLA Timers</TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-[#00FF88]/20 data-[state=active]:text-[#00FF88]">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-6">
            <Card className="bg-[#1A1A24] border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Globe className="h-5 w-5 text-[#00FF88]" />
                  Platform Settings
                </CardTitle>
                <CardDescription className="text-white/50">General platform configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="platformName" className="text-white/70">Platform Name</Label>
                    <Input id="platformName" defaultValue="Smart Ride" className="bg-[#252530] border-white/10 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency" className="text-white/70">Default Currency</Label>
                    <Select defaultValue="UGX">
                      <SelectTrigger className="bg-[#252530] border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#252530] border-white/10">
                        <SelectItem value="UGX">UGX - Ugandan Shilling</SelectItem>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone" className="text-white/70">Timezone</Label>
                    <Select defaultValue="EAT">
                      <SelectTrigger className="bg-[#252530] border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#252530] border-white/10">
                        <SelectItem value="EAT">East Africa Time (EAT)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language" className="text-white/70">Default Language</Label>
                    <Select defaultValue="en">
                      <SelectTrigger className="bg-[#252530] border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#252530] border-white/10">
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="sw">Swahili</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1A1A24] border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Shield className="h-5 w-5 text-[#00FF88]" />
                  Security Settings
                </CardTitle>
                <CardDescription className="text-white/50">Configure security and access controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#252530] rounded-xl border border-white/5">
                  <div>
                    <Label className="text-white">Two-Factor Authentication</Label>
                    <p className="text-sm text-white/50">Require 2FA for admin accounts</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 bg-[#252530] rounded-xl border border-white/5">
                  <div>
                    <Label className="text-white">Session Timeout</Label>
                    <p className="text-sm text-white/50">Auto-logout after inactivity</p>
                  </div>
                  <Select defaultValue="30">
                    <SelectTrigger className="w-32 bg-[#1A1A24] border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#252530] border-white/10">
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pricing">
          <Card className="bg-[#1A1A24] border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <DollarSign className="h-5 w-5 text-[#00FF88]" />
                Pricing Configuration
              </CardTitle>
              <CardDescription className="text-white/50">Set base fares and commission rates per service</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { service: 'Smart Boda Ride', baseFare: 2000, perKm: 150, commission: 15 },
                { service: 'Smart Car Ride', baseFare: 5000, perKm: 300, commission: 20 },
                { service: 'Food Delivery', baseFare: 3000, perKm: 200, commission: 15 },
                { service: 'Shopping Delivery', baseFare: 3000, perKm: 200, commission: 12 },
                { service: 'Item Delivery', baseFare: 1000, perKm: 100, commission: 10 },
              ].map((item, index) => (
                <div key={index} className="p-4 bg-[#252530] rounded-xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-white">{item.service}</h4>
                    <Badge className="bg-[#00FF88]/20 text-[#00FF88] border-[#00FF88]/30">{item.commission}% commission</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white/70">Base Fare (UGX)</Label>
                      <Input type="number" defaultValue={item.baseFare} className="bg-[#1A1A24] border-white/10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/70">Per Km Rate (UGX)</Label>
                      <Input type="number" defaultValue={item.perKm} className="bg-[#1A1A24] border-white/10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/70">Commission (%)</Label>
                      <Input type="number" defaultValue={item.commission} className="bg-[#1A1A24] border-white/10 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla">
          <Card className="bg-[#1A1A24] border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="h-5 w-5 text-[#00FF88]" />
                SLA Timer Configuration
              </CardTitle>
              <CardDescription className="text-white/50">Set timeout thresholds for order states</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium text-white">Food Delivery SLA</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/70">Merchant Accept/Reject (minutes)</Label>
                    <Input type="number" defaultValue={3} className="bg-[#252530] border-white/10 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Preparation Time (minutes)</Label>
                    <Input type="number" defaultValue={20} className="bg-[#252530] border-white/10 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Rider Pickup (minutes)</Label>
                    <Input type="number" defaultValue={10} className="bg-[#252530] border-white/10 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Delivery Timeout (minutes)</Label>
                    <Input type="number" defaultValue={30} className="bg-[#252530] border-white/10 text-white" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-white">Shopping Delivery SLA</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/70">Merchant Accept/Reject (minutes)</Label>
                    <Input type="number" defaultValue={5} className="bg-[#252530] border-white/10 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Item Collection (minutes)</Label>
                    <Input type="number" defaultValue={30} className="bg-[#252530] border-white/10 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Rider Pickup (minutes)</Label>
                    <Input type="number" defaultValue={10} className="bg-[#252530] border-white/10 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Delivery Timeout (minutes)</Label>
                    <Input type="number" defaultValue={45} className="bg-[#252530] border-white/10 text-white" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-white">Ride Services SLA</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/70">Rider Matching Timeout (minutes)</Label>
                    <Input type="number" defaultValue={5} className="bg-[#252530] border-white/10 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Rider Response Timeout (minutes)</Label>
                    <Input type="number" defaultValue={2} className="bg-[#252530] border-white/10 text-white" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="bg-[#1A1A24] border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Bell className="h-5 w-5 text-[#00FF88]" />
                Notification Settings
              </CardTitle>
              <CardDescription className="text-white/50">Configure system notifications and alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'New Rider Registrations', desc: 'Alert when new riders register' },
                { label: 'Rider Approval Pending', desc: 'Alert for pending rider approvals' },
                { label: 'Order Cancellations', desc: 'Alert when orders are cancelled' },
                { label: 'Payment Failures', desc: 'Alert for failed payment transactions' },
                { label: 'SLA Breaches', desc: 'Alert when SLA timers are exceeded' },
                { label: 'Merchant Issues', desc: 'Alert for merchant-related problems' },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-[#252530] rounded-xl border border-white/5">
                  <div>
                    <Label className="text-white">{item.label}</Label>
                    <p className="text-sm text-white/50">{item.desc}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
