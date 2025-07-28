import { useEffect, useState } from "react";
import { Bell, Plus, MapPin, MessageSquare, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import PetCard from "@/components/PetCard";
import { Link } from "react-router-dom";

import { db, auth } from "@/lib/firebase";
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

  const user = auth.currentUser;
  const [greeting, setGreeting] = useState("Good day!");
  const quickActions = [
    { title: "Find Nearby Vets", icon: MapPin, path: "/vet-finder", color: "bg-primary" },
    { title: "Chat with Dr. Purr", icon: MessageSquare, path: "/dr-purr", color: "bg-accent" },
    { title: "Add Appointment", icon: Calendar, path: "/schedule", color: "bg-secondary" },
  ];

useEffect(() => {
    if (!user?.uid) return;

    const petsRef = collection(db, "pets");
    const petsQuery = query(petsRef, where("userId", "==", user.uid));
    const hour = new Date().getHours();

    if (hour < 12) {
      setGreeting("Good morning!");
    } else if (hour < 18) {
      setGreeting("Good afternoon!");
    } else {
      setGreeting("Good evening!");
    }
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


  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-soft p-6 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground font-bold">{greeting}</h1>
            <p className="text-muted-foreground">How are your furry friends today?</p>
          </div>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-6">
        <h2 className="font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3">
          {quickActions.map((action) => (
            <Link key={action.title} to={action.path}>
              <Card className="hover:shadow-medium transition-shadow cursor-pointer">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium">{action.title}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* My Pets */}
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
        <div className="lg:grid gap-4 2xl:grid-cols-5  xl:grid-cols-4 lg:grid-cols-3 flex flex-col">
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

      {/* Upcoming Reminders */}
      <div className="p-6">
        <h2 className="font-semibold mb-4">Upcoming Reminders</h2>
        {reminders.filter(r => new Date(r.date).getTime() > Date.now()).length > 0 ? (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                {[...reminders]
                  .filter((reminder) => new Date(reminder.date).getTime() > Date.now())
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((reminder) => (
                    <div key={reminder.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {reminder.title}
                          {reminder.petId && petsMap[reminder.petId]?.name
                            ? ` – ${petsMap[reminder.petId].name}`
                            : ""}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(reminder.date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs bg-warning/20 text-warning-foreground px-2 py-1 rounded-full capitalize">
                          {reminder.type}
                        </span>
                      </div>
                    </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">No upcoming reminders found.</p>
        )}
      </div>


      <Navigation />
    </div>
  );
};

export default Home;
