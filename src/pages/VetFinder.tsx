import { useState } from "react";
import { Search, MapPin, Clock, Star, Phone, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/Navigation";

const VetFinder = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");

  // Mock vet data - in real app, this would come from a mapping service
  const vets = [
    {
      id: "1",
      name: "Happy Paws Veterinary Clinic",
      address: "123 Main St, Downtown",
      distance: "0.5 miles",
      rating: 4.8,
      isOpen: true,
      phone: "(555) 123-4567",
      specialties: ["Dogs", "Cats", "Birds"],
      hours: "8AM - 6PM",
    },
    {
      id: "2",
      name: "City Animal Hospital",
      address: "456 Oak Ave, Midtown",
      distance: "1.2 miles",
      rating: 4.6,
      isOpen: false,
      phone: "(555) 234-5678",
      specialties: ["Dogs", "Cats", "Exotic"],
      hours: "7AM - 8PM",
    },
    {
      id: "3",
      name: "Furry Friends Vet",
      address: "789 Pine Rd, Uptown",
      distance: "2.1 miles",
      rating: 4.9,
      isOpen: true,
      phone: "(555) 345-6789",
      specialties: ["Dogs", "Cats", "Emergency"],
      hours: "24/7",
    },
  ];

  const filters = [
    { id: "all", label: "All Vets" },
    { id: "open", label: "Open Now" },
    { id: "emergency", label: "Emergency" },
    { id: "dogs", label: "Dogs" },
    { id: "cats", label: "Cats" },
  ];

  const filteredVets = vets.filter((vet) => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "open") return vet.isOpen;
    if (selectedFilter === "emergency") return vet.specialties.includes("Emergency");
    return vet.specialties.some((specialty) => 
      specialty.toLowerCase().includes(selectedFilter.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-primary p-6 rounded-b-3xl">
        <h1 className="text-white font-bold mb-4">Find Veterinarians</h1>
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/90 border-0"
          />
        </div>
      </div>

      {/* Map Placeholder */}
      <div className="h-48 bg-muted m-6 rounded-2xl flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Interactive map will appear here</p>
          <p className="text-sm text-muted-foreground mt-1">
            Connect to Supabase for Mapbox integration
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <Button
              key={filter.id}
              variant={selectedFilter === filter.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter(filter.id)}
              className="whitespace-nowrap"
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Vet List */}
      <div className="px-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{filteredVets.length} Vets Found</h2>
          <Button variant="ghost" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Sort
          </Button>
        </div>

        {filteredVets.map((vet) => (
          <Card key={vet.id} className="hover:shadow-medium transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold">{vet.name}</h3>
                  <p className="text-sm text-muted-foreground">{vet.address}</p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  vet.isOpen 
                    ? "bg-success text-success-foreground" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  {vet.isOpen ? "Open" : "Closed"}
                </div>
              </div>

              <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {vet.distance}
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-current text-yellow-500" />
                  {vet.rating}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {vet.hours}
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {vet.specialties.map((specialty) => (
                  <span
                    key={specialty}
                    className="bg-secondary/20 text-secondary-foreground px-2 py-1 rounded-full text-xs"
                  >
                    {specialty}
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </Button>
                <Button size="sm" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Navigation />
    </div>
  );
};

export default VetFinder;