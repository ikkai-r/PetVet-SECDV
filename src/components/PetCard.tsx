import { Heart, Calendar } from "lucide-react";
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
  showProfileButton?: boolean; // Optional
}

const PetCard = ({ pet, onEdit }: PetCardProps) => {
  return (
    <div
      className="min-w-[250px] bg-white shadow-md rounded-xl overflow-hidden flex-shrink-0 cursor-pointer transition-transform transform hover:scale-105 hover:shadow-lg"
      onClick={() => onEdit(pet)}
    >
      <div className="w-full h-52 bg-gray-100 flex items-center justify-center overflow-hidden">
        {pet.photo ? (
          <img src={pet.photo} alt={pet.name} className="w-full h-full object-cover" />
        ) : (
          <Heart className="w-10 h-10 text-primary" />
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg text-center">{pet.name}</h3>
        <p className="text-sm text-muted-foreground text-center">{pet.age}</p>
      </div>
    </div>
  );
};

export default PetCard;
