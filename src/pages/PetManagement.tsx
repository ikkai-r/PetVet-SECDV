import { useState } from "react";
import { Plus, Edit, Camera, Heart, Calendar, FileText, Weight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/Navigation";
import PetCard from "@/components/PetCard";

const PetManagement = () => {
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [showAddPet, setShowAddPet] = useState(false);
  const [newPet, setNewPet] = useState({
    name: "",
    species: "",
    breed: "",
    dateOfBirth: "",
    weight: "",
    notes: "",
  });

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
      weight: "65 lbs",
      dateOfBirth: "2021-03-15",
      vaccines: [
        { name: "Rabies", date: "2024-03-15", nextDue: "2025-03-15" },
        { name: "DHPP", date: "2024-03-15", nextDue: "2025-03-15" },
      ],
      medications: [
        { name: "Flea Treatment", date: "2024-11-01", nextDue: "2024-12-01" },
      ],
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
      weight: "10 lbs",
      dateOfBirth: "2022-06-10",
      vaccines: [
        { name: "FVRCP", date: "2024-01-20", nextDue: "2025-01-20" },
        { name: "Rabies", date: "2024-01-20", nextDue: "2025-01-20" },
      ],
      medications: [],
    },
  ];

  const handleAddPet = () => {
    console.log("Adding new pet:", newPet);
    setShowAddPet(false);
    setNewPet({ name: "", species: "", breed: "", dateOfBirth: "", weight: "", notes: "" });
  };

  const PetDetailsDialog = ({ pet, onClose }: { pet: any; onClose: () => void }) => (
    <Dialog open={!!pet} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{pet?.name} - Pet Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-soft flex items-center justify-center mx-auto mb-4">
              {pet?.photo ? (
                <img src={pet.photo} alt={pet.name} className="w-full h-full object-cover rounded-full" />
              ) : (
                <Heart className="w-12 h-12 text-primary" />
              )}
            </div>
            <Button variant="outline" size="sm">
              <Camera className="w-4 h-4 mr-2" />
              Update Photo
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Species</Label>
              <p className="text-sm text-muted-foreground">{pet?.species}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Breed</Label>
              <p className="text-sm text-muted-foreground">{pet?.breed}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Date of Birth</Label>
              <p className="text-sm text-muted-foreground">{pet?.dateOfBirth}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Weight</Label>
              <p className="text-sm text-muted-foreground">{pet?.weight}</p>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Vaccinations</Label>
            <div className="space-y-2">
              {pet?.vaccines.map((vaccine: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-muted rounded-lg">
                  <span className="text-sm">{vaccine.name}</span>
                  <span className="text-xs text-muted-foreground">Due: {vaccine.nextDue}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Medications</Label>
            <div className="space-y-2">
              {pet?.medications.length > 0 ? (
                pet?.medications.map((med: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-muted rounded-lg">
                    <span className="text-sm">{med.name}</span>
                    <span className="text-xs text-muted-foreground">Due: {med.nextDue}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No medications recorded</p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
              <FileText className="w-4 h-4 mr-2" />
              Records
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-accent p-6 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <h1 className="text-white font-bold">My Pets</h1>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => setShowAddPet(true)}
            className="bg-white/20 text-white hover:bg-white/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Pet
          </Button>
        </div>
        <p className="text-white/90 mt-2">Manage your furry family members</p>
      </div>

      {/* Pet List */}
      <div className="p-6 space-y-4">
        {pets.map((pet) => (
          <PetCard
            key={pet.id}
            pet={pet}
            onEdit={(pet) => setSelectedPet(pet)}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="px-6">
        <h2 className="font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center">
            <Calendar className="w-6 h-6 mb-2" />
            <span className="text-sm">Add Appointment</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center">
            <Weight className="w-6 h-6 mb-2" />
            <span className="text-sm">Track Weight</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center">
            <FileText className="w-6 h-6 mb-2" />
            <span className="text-sm">Upload Records</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center">
            <Heart className="w-6 h-6 mb-2" />
            <span className="text-sm">Health Log</span>
          </Button>
        </div>
      </div>

      {/* Add Pet Dialog */}
      <Dialog open={showAddPet} onOpenChange={setShowAddPet}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Pet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Pet Name</Label>
              <Input
                id="name"
                value={newPet.name}
                onChange={(e) => setNewPet({ ...newPet, name: e.target.value })}
                placeholder="Enter pet name"
              />
            </div>
            <div>
              <Label htmlFor="species">Species</Label>
              <Select value={newPet.species} onValueChange={(value) => setNewPet({ ...newPet, species: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select species" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dog">Dog</SelectItem>
                  <SelectItem value="cat">Cat</SelectItem>
                  <SelectItem value="bird">Bird</SelectItem>
                  <SelectItem value="rabbit">Rabbit</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="breed">Breed</Label>
              <Input
                id="breed"
                value={newPet.breed}
                onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })}
                placeholder="Enter breed"
              />
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={newPet.dateOfBirth}
                onChange={(e) => setNewPet({ ...newPet, dateOfBirth: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="weight">Weight</Label>
              <Input
                id="weight"
                value={newPet.weight}
                onChange={(e) => setNewPet({ ...newPet, weight: e.target.value })}
                placeholder="e.g., 25 lbs"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newPet.notes}
                onChange={(e) => setNewPet({ ...newPet, notes: e.target.value })}
                placeholder="Any special notes about your pet..."
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddPet(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddPet} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                Add Pet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pet Details Dialog */}
      <PetDetailsDialog pet={selectedPet} onClose={() => setSelectedPet(null)} />

      <Navigation />
    </div>
  );
};

export default PetManagement;