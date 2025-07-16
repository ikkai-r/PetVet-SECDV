import { Heart, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: string;
  photo: string;
  nextVaccine?: string;
  status: "healthy" | "warning" | "overdue";
}

interface PetCardProps {
  pet: Pet;
  onEdit: (pet: Pet) => void;
}

const PetCard = ({ pet, onEdit }: PetCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-success text-success-foreground";
      case "warning":
        return "bg-warning text-warning-foreground";
      case "overdue":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="pet-card">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-16 h-16 rounded-full bg-gradient-soft flex items-center justify-center overflow-hidden">
          {pet.photo ? (
            <img src={pet.photo} alt={pet.name} className="w-full h-full object-cover" />
          ) : (
            <Heart className="w-8 h-8 text-primary" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{pet.name}</h3>
          <p className="text-muted-foreground text-sm">{pet.breed} • {pet.age}</p>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(pet.status)}`}>
          {pet.status}
        </div>
      </div>
      
      {pet.nextVaccine && (
        <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Next vaccine: {pet.nextVaccine}</span>
        </div>
      )}
      
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => onEdit(pet)}>
          Edit Profile
        </Button>
        <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
          View Details
        </Button>
      </div>
    </div>
  );
};

export default PetCard;