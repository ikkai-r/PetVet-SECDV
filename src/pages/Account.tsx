import { useState } from "react";
import { User, Settings, Bell, Shield, HelpCircle, LogOut, Edit, Camera, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Navigation from "@/components/Navigation";

const Account = () => {
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [user, setUser] = useState({
    name: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    phone: "+1 (555) 123-4567",
    avatar: "",
    joinDate: "March 2024",
  });

  const [settings, setSettings] = useState({
    notifications: {
      appointments: true,
      vaccines: true,
      medications: true,
      marketing: false,
    },
    privacy: {
      shareData: false,
      analytics: true,
    },
  });

  const accountStats = [
    { label: "Pets", value: "2", color: "bg-primary" },
    { label: "Appointments", value: "12", color: "bg-accent" },
    { label: "Reminders", value: "5", color: "bg-secondary" },
    { label: "Vets Saved", value: "3", color: "bg-success" },
  ];

  const menuItems = [
    { icon: Bell, label: "Notifications", action: () => setShowSettings(true) },
    { icon: Shield, label: "Privacy & Security", action: () => setShowSettings(true) },
    { icon: HelpCircle, label: "Help & Support", action: () => {} },
    { icon: Settings, label: "App Settings", action: () => setShowSettings(true) },
  ];

  const handleSaveProfile = () => {
    console.log("Saving profile:", user);
    setShowEditProfile(false);
  };

  const handleSaveSettings = () => {
    console.log("Saving settings:", settings);
    setShowSettings(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-primary p-6 rounded-b-3xl">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="w-20 h-20">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-white/20 text-white text-xl">
                {user.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <Button
              size="icon"
              variant="secondary"
              className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
              onClick={() => setShowEditProfile(true)}
            >
              <Camera className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1">
            <h1 className="text-white font-bold text-xl">{user.name}</h1>
            <p className="text-white/90 text-sm">{user.email}</p>
            <p className="text-white/70 text-xs mt-1">Member since {user.joinDate}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-6">
        <div className="grid grid-cols-4 gap-3">
          {accountStats.map((stat) => (
            <Card key={stat.label} className="text-center">
              <CardContent className="p-3">
                <div className={`w-8 h-8 ${stat.color} rounded-full flex items-center justify-center mx-auto mb-2`}>
                  <span className="text-white text-sm font-bold">{stat.value}</span>
                </div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Account Actions */}
      <div className="px-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start h-auto p-3"
              onClick={() => setShowEditProfile(true)}
            >
              <Edit className="w-4 h-4 mr-3" />
              <div className="text-left">
                <p className="font-medium">Edit Profile</p>
                <p className="text-xs text-muted-foreground">Update your personal information</p>
              </div>
            </Button>
            <Separator />
            {menuItems.map((item) => (
              <div key={item.label}>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-auto p-3"
                  onClick={item.action}
                >
                  <item.icon className="w-4 h-4 mr-3" />
                  <div className="text-left">
                    <p className="font-medium">{item.label}</p>
                  </div>
                </Button>
                <Separator />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Mail className="w-4 h-4 mr-3" />
              Contact Support
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <HelpCircle className="w-4 h-4 mr-3" />
              View Help Center
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sign Out */}
      <div className="px-6 pb-6">
        <Button variant="destructive" className="w-full">
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-xl">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm">
                <Camera className="w-4 h-4 mr-2" />
                Change Photo
              </Button>
            </div>
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={user.name}
                onChange={(e) => setUser({ ...user, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                onChange={(e) => setUser({ ...user, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={user.phone}
                onChange={(e) => setUser({ ...user, phone: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditProfile(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSaveProfile} className="flex-1">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Notifications</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="appointments">Appointment Reminders</Label>
                  <Switch
                    id="appointments"
                    checked={settings.notifications.appointments}
                    onCheckedChange={(checked) => 
                      setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, appointments: checked }
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="vaccines">Vaccine Reminders</Label>
                  <Switch
                    id="vaccines"
                    checked={settings.notifications.vaccines}
                    onCheckedChange={(checked) => 
                      setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, vaccines: checked }
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="medications">Medication Reminders</Label>
                  <Switch
                    id="medications"
                    checked={settings.notifications.medications}
                    onCheckedChange={(checked) => 
                      setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, medications: checked }
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="marketing">Marketing Emails</Label>
                  <Switch
                    id="marketing"
                    checked={settings.notifications.marketing}
                    onCheckedChange={(checked) => 
                      setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, marketing: checked }
                      })
                    }
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="font-semibold mb-3">Privacy</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="shareData">Share Data for Improvements</Label>
                  <Switch
                    id="shareData"
                    checked={settings.privacy.shareData}
                    onCheckedChange={(checked) => 
                      setSettings({
                        ...settings,
                        privacy: { ...settings.privacy, shareData: checked }
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="analytics">Analytics</Label>
                  <Switch
                    id="analytics"
                    checked={settings.privacy.analytics}
                    onCheckedChange={(checked) => 
                      setSettings({
                        ...settings,
                        privacy: { ...settings.privacy, analytics: checked }
                      })
                    }
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowSettings(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSaveSettings} className="flex-1">
                Save Settings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Navigation />
    </div>
  );
};

export default Account;