import { useEffect, useState } from "react";
import { Bell, Plus, MapPin, MessageSquare, Calendar, Stethoscope, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import PetCard from "@/components/PetCard";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

const calculateAge = (dateOfBirth: string): string => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let years = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        years--;
    }

    if (years === 0) {
        const months = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
        return months === 1 ? '1 month' : `${months} months`;
    }

    return years === 1 ? '1 year' : `${years} years`;
};

const Home = () => {
  const [pets, setPets] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [petsMap, setPetsMap] = useState<Record<string, any>>({});
  const { user } = useAuth();
  const [greeting, setGreeting] = useState("Good day!");

  const getRoleBasedGreeting = () => {
    const hour = new Date().getHours();
    let timeGreeting = "Good day!";
    
    if (hour < 12) {
      timeGreeting = "Good morning!";
    } else if (hour < 18) {
      timeGreeting = "Good afternoon!";
    } else {
      timeGreeting = "Good evening!";
    }

    switch (user?.role) {
      case 'vet':
        return `${timeGreeting} Dr. ${user.displayName || 'Doctor'}`;
      case 'admin':
        return `${timeGreeting} Admin ${user.displayName || 'Administrator'}`;
      default:
        return timeGreeting;
    }
  };

  const getRoleBasedSubtitle = () => {
    switch (user?.role) {
      case 'vet':
        return "How are your patients today?";
      case 'admin':
        return "Ready to manage the platform?";
      default:
        return "How are your furry friends today?";
    }
  };

  const getRoleBasedIcon = () => {
    switch (user?.role) {
      case 'vet':
        return <Stethoscope className="w-5 h-5" />;
      case 'admin':
        return <Shield className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  useEffect(() => {
    if (user) {
      setGreeting(getRoleBasedGreeting());
    }
  }, [user]);

  useEffect(() => {
    if (!user?.uid || user.role !== 'pet_owner') return;

    const petsRef = collection(db, "pets");
    const petsQuery = query(petsRef, where("userId", "==", user.uid));

    const unsubscribePets = onSnapshot(petsQuery, (snapshot) => {
      const petsData = snapshot.docs.map((doc) => {
          const data = doc.data();
          const dateOfBirth = data.dateOfBirth || '';
          const age = dateOfBirth ? calculateAge(dateOfBirth) : '0 years';

          return {
              id: doc.id,
              ...doc.data(),
              age
          }
      });
      setPets(petsData);

      const map: Record<string, any> = {};
      petsData.forEach(pet => {
        map[pet.id] = pet;
      });
      setPetsMap(map);
    });

    const schedulesRef = collection(db, "schedules");
    const schedulesQuery = query(schedulesRef, where("userId", "==", user.uid));

    const unsubscribeReminders = onSnapshot(schedulesQuery, (snapshot) => {
      const remindersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReminders(remindersData);
    });

    return () => {
      unsubscribePets();
      unsubscribeReminders();
    };
  }, [user]);

  // Role-based content rendering
  const renderRoleBasedContent = () => {
    if (!user) return null;

    switch (user.role) {
      case 'pet_owner':
        return (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">My Pets ({pets.length})</h2>
              <Link to="/pets">
                <Button variant="ghost" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Pet
                </Button>
              </Link>
            </div>
            <div className="lg:grid gap-4 2xl:grid-cols-5 xl:grid-cols-4 lg:grid-cols-3 flex flex-col">
              {pets.length > 0 ? (
                pets.map((pet) => (
                  <PetCard
                    key={pet.id}
                    pet={pet}
                    onEdit={() => {}}
                    showProfileButton={false}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No pets found. Add one to get started!</p>
              )}
            </div>
          </div>
        );

      case 'vet':
        return (
          <div className="p-6">
            <div className="grid gap-4">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Today's Appointments</h3>
                  <p className="text-sm text-muted-foreground">
                    View and manage your appointments for today.
                  </p>
                  <Link to="/vetdb">
                    <Button className="mt-4">Go to Dashboard</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'admin':
        return (
          <div className="p-6">
            <div className="grid gap-4">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Platform Overview</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage users, verify accounts, and oversee platform operations.
                  </p>
                  <Link to="/admindb">
                    <Button className="mt-4">Go to Admin Dashboard</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-primary p-6 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold">{greeting}</h1>
            <p className="text-white">{getRoleBasedSubtitle()}</p>
          </div>
          <Button variant="ghost" size="icon" className="relative">
            {getRoleBasedIcon()}
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
          </Button>
        </div>
      </div>

      {/* Role-based content */}
      {renderRoleBasedContent()}

      <Navigation />
    </div>
  );
};

export default Home;
