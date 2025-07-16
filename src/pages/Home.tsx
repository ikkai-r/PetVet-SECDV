import { useState } from "react";
import { Bell, Plus, Heart, MapPin, MessageSquare, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import PetCard from "@/components/PetCard";
import { Link } from "react-router-dom";

const Home = () => {
  const [selectedPet, setSelectedPet] = useState(null);

  // Mock data - in real app, this would come from Supabase
  const pets = [
    {
      id: "1",
      name: "Buddy",
      species: "Dog",
      breed: "Golden Retriever",
      age: "3 years",
      photo: "",
      nextVaccine: "Dec 15, 2024",
      status: "healthy" as const,
    },
    {
      id: "2",
      name: "Whiskers",
      species: "Cat",
      breed: "Persian",
      age: "2 years",
      photo: "",
      nextVaccine: "Jan 20, 2025",
      status: "warning" as const,
    },
  ];

  const upcomingReminders = [
    { id: "1", title: "Buddy's Vaccination", date: "Dec 15", type: "vaccine" },
    { id: "2", title: "Whiskers Check-up", date: "Jan 5", type: "appointment" },
    { id: "3", title: "Flea Treatment", date: "Jan 10", type: "medication" },
  ];

  const quickActions = [
    { title: "Find Nearby Vets", icon: MapPin, path: "/vet-finder", color: "bg-primary" },
    { title: "Chat with Dr. Purr", icon: MessageSquare, path: "/dr-purr", color: "bg-accent" },
    { title: "Add Appointment", icon: Calendar, path: "/schedule", color: "bg-secondary" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-soft p-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-foreground font-bold">Good morning!</h1>
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
          <h2 className="font-semibold">My Pets</h2>
          <Link to="/pets">
            <Button variant="ghost" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Pet
            </Button>
          </Link>
        </div>
        <div className="space-y-4">
          {pets.map((pet) => (
            <PetCard
              key={pet.id}
              pet={pet}
              onEdit={(pet) => setSelectedPet(pet)}
            />
          ))}
        </div>
      </div>

      {/* Upcoming Reminders */}
      <div className="p-6">
        <h2 className="font-semibold mb-4">Upcoming Reminders</h2>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {upcomingReminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{reminder.title}</p>
                    <p className="text-sm text-muted-foreground">{reminder.date}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs bg-warning/20 text-warning-foreground px-2 py-1 rounded-full">
                      {reminder.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Navigation />
    </div>
  );
};

export default Home;