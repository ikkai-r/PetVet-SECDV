import { useState, useEffect, useRef} from "react";
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
import { getAuth, onAuthStateChanged, updateProfile } from "firebase/auth";
import { db, auth, storage } from "@/lib/firebase"; // Import storage
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDoc} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Import storage functions
import { logout } from '@/services/auth';
import { uploadImage } from '@/lib/uploadImage'; 

const Account = () => {
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    avatar: "",
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

  const menuItems = [
    { icon: Bell, label: "Notifications", action: () => setShowSettings(true) },
    { icon: Shield, label: "Privacy & Security", action: () => setShowSettings(true) },
    { icon: HelpCircle, label: "Help & Support", action: () => {} },
    { icon: Settings, label: "App Settings", action: () => setShowSettings(true) },
  ];

  useEffect(() => {
  const auth = getAuth();

  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    if (currentUser) {
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(userRef);

        const firestoreData = docSnap.exists() ? docSnap.data() : {};

        setUser({
          id: currentUser.uid,
          name:
            firestoreData.name ||
            currentUser.displayName ||
            currentUser.email?.split("@")[0] ||
            "Anonymous",
          email: currentUser.email,
          phone: firestoreData.phone || currentUser.phoneNumber || "",
          avatar: firestoreData.avatar || currentUser.photoURL || "",
          joinDate: new Date(currentUser.metadata.creationTime).toLocaleDateString(),
          role: firestoreData.role || "user",
        });

        console.log("Loaded user from Firestore:", firestoreData);
      } catch (error) {
        console.error("Error fetching Firestore user data:", error);
      }
    } else {
      setUser(null);
    }
  });

  return () => unsubscribe();
}, []);

  useEffect(() => {
    if (showEditProfile && user) {
      setFormData({
        name: user.name,
        phone: user.phone,
        avatar: user.avatar,
      });
    }
  }, [showEditProfile, user]);

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const currentUser = getAuth().currentUser;
      let photoURL = formData.avatar;

      if (selectedImageFile) {
        photoURL = await uploadImage(selectedImageFile);
      }


      if (currentUser) {
        await updateProfile(currentUser, {
          displayName: formData.name,
          photoURL: photoURL,
        });
      }

      const userRef = doc(db, "users", user.id);
      await updateDoc(userRef, {
        name: formData.name,
        phone: formData.phone,
        avatar: photoURL,
      });

      setUser(prev => ({
        ...prev!,
        name: formData.name,
        phone: formData.phone,
        avatar: photoURL,
      }));

      console.log("Profile saved successfully.");
      setShowEditProfile(false);
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);

      const previewURL = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, avatar: previewURL }));
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    try {
      const { cloudName, uploadPreset } = await fetchCloudinaryConfig();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Image upload failed: ${res.status} ${res.statusText} - ${errorText}`);
      }

      const data = await res.json();
      return data.secure_url;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

const fetchCloudinaryConfig = async () => {
  return {
    cloudName:  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
    uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
  };
};

  const handleSaveSettings = () => {
    console.log("Saving settings:", settings);
    setShowSettings(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading user information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-primary p-6 rounded-b-3xl">
        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar className="w-20 h-20">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-white/20 text-white text-xl">
                {user.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            {/* <Button
              size="icon"
              variant="secondary"
              className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
              onClick={() => setShowEditProfile(true)}
            >
              <Camera className="w-4 h-4" />
            </Button> */}
          </div>
          <div className="flex-1">
            <h1 className="text-white font-bold text-xl">{user.name}</h1>
            <p className="text-white/90 text-sm">{user.email}</p>
            <p className="text-white/70 text-xs">{"+" + user.phone || "No phone number provided"}</p>
            <p className="text-white/70 text-xs mt-1">Member since {user.joinDate}</p>
          </div>
        </div>
      </div>


      {/* Account Actions */}
      <div className="px-6">
        <br></br>
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
        <Button variant="destructive" className="w-full" onClick={logout}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="sm:max-w-4xl max-w-xs rounded-lg sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage src={formData.avatar} alt={formData.name} />
                <AvatarFallback className="text-xl">
                  {formData.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              {/* Hidden File Input */}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <Button variant="outline" size="sm"   
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}>
                <Camera className="w-4 h-4 mr-2" />
                {loading ? "Uploading..." : "Change Photo"}
              </Button>
            </div>
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            {/* <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                onChange={(e) => setUser({ ...user, email: e.target.value })}
              />
            </div> */}
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditProfile(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSaveProfile} className="flex-1" disabled={loading}>
                 {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-4xl max-w-xs rounded-lg sm:rounded-2xl">
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