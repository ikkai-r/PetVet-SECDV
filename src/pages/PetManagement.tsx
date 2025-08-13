import { useState, useEffect, useRef } from "react";
import { Plus, Edit, Camera, Heart, Calendar, FileText, Weight, Trash2, PawPrint} from "lucide-react"; // Added Trash2 icon
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import Navigation from "@/components/Navigation";
import PetCard from "@/components/PetCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

import { db, auth, storage } from "@/lib/firebase"; // Import storage
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Import storage functions
import { User } from "firebase/auth";
import { deletePet } from "@/services/firestore"; 
import { petSchema, vaccinationRecordSchema, medicalRecordSchema, validateImageFile } from '@/lib/validation';
import { logEvent } from "@/services/adminService";

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

const fetchCloudinaryConfig = async () => {
  return {
    cloudName:  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
    uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
  };
};

/*const fetchCloudinaryConfig = async () => {
  try {
    const res = await fetch('http://localhost:3001/api/cloudinary-params');
    if (!res.ok) {
      throw new Error(`Failed to fetch Cloudinary config: ${res.status} ${res.statusText}`);
    }
    const { cloudName, uploadPreset } = await res.json();
    return { cloudName, uploadPreset };
  } catch (error) {
    console.error("Error fetching Cloudinary config:", error);
    throw new Error("Failed to get Cloudinary configuration from server");
  }
};*/

interface Pet {
  id: string;
  name: string;
  age: string;
  species: string;
  breed: string;
  dateOfBirth: string;
  weight: string;
  notes?: string;
  userId: string;
  photo: string;
  nextVaccine?: string;
  status: 'healthy' | 'warning' | 'overdue';
  vaccines?: { id: string; name: string; date: string; nextDue: string }[]; // Added id for vaccines
  medications?: { name: string; date: string; nextDue: string }[]; // Keeping as is, assuming 'records' are medical records
  records?: { id: string; title: string; description: string; date: string }[]; // Added id for records
}

const PetManagement = () => {
  const [imageError, setImageError] = useState<string | null>(null);
  const [editPetErrors, setEditPetErrors] = useState<{ name?: string; species?: string; breed?: string; dateOfBirth?: string; weight?: string; notes?: string }>({});
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [currentRecordToEdit, setCurrentRecordToEdit] = useState<Pet['records'][0] | null>(null);
  const [currentVaccineToEdit, setCurrentVaccineToEdit] = useState<Pet['vaccines'][0] | null>(null);

  // Log validation failures (can be replaced with backend logging)
  function addLog(action: string, details: string) {
    if (!details) return;
    const date = new Date();
    const userEmail = user?.email || "anonymous";
    const timestamp = date.toLocaleDateString() + " " + date.toLocaleTimeString();
    const success = details.includes("successfully") || details.includes("added") || details.includes("updated");
    
    logEvent(action, timestamp, details, userEmail, success);
  }

  const [editPetData, setEditPetData] = useState({
    name: "",
    species: "",
    breed: "",
    dateOfBirth: "",
    weight: "",
    notes: "",
    photo: "", // Added photo to editPetData
  });
  const [newPet, setNewPet] = useState<{
    name: string;
    species: string;
    breed: string;
    dateOfBirth: string;
    weight: number | "";
    notes: string;
    photo: string;
  }>({
    name: "",
    species: "",
    breed: "",
    dateOfBirth: "",
    weight: "",
    notes: "",
    photo: "", // Added photo to newPet
  });

  const [pets, setPets] = useState<Pet[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null); // For image upload
  const [newPetErrors, setNewPetErrors] = useState<{ name?: string; species?: string; breed?: string; dateOfBirth?: string; weight?: string; notes?: string }>({});
 
  // Use refs to prevent form resets during real-time updates
  const isFormActiveRef = useRef(false);
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      setLoading(true);
      setError(null);
      const q = query(collection(db, "pets"), where("userId", "==", user.uid));
      const unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          const fetchedPets: Pet[] = snapshot.docs.map((doc) => {
            const data = doc.data();
            const dateOfBirth = data.dateOfBirth || '';
            const age = dateOfBirth ? calculateAge(dateOfBirth) : '0 years';

            return {
              id: doc.id,
              ...data,
              age,
              status: data.status || 'healthy',
              photo: data.photo || ''
            };
          }) as Pet[];

          setPets(fetchedPets);
          setLoading(false);
        },
        (err) => {
          setError("Failed to load pets. Please try again.");
          setLoading(false);
        }
      );
      return () => unsubscribeFirestore();
    } else {
      setPets([]);
    }
  }, [user]);

  // Separate effect to update selectedPet when pets data changes
  useEffect(() => {
    if (selectedPet && pets.length > 0 && !isFormActiveRef.current) {
      const updatedSelectedPet = pets.find(pet => pet.id === selectedPet.id);
      if (updatedSelectedPet) {
        setSelectedPet(updatedSelectedPet);
      }
    }
  }, [pets]);

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

  function validatePetField(field: keyof typeof petSchema.shape, value: any) {
    const result = petSchema.shape[field].safeParse(value);
    return result.success ? undefined : result.error.errors[0].message;
  }

  const handleAddPet = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let photoURL = "";
      if (imageFile) {
        photoURL = await uploadImage(imageFile);
      }

      const petData = {
        ...newPet, 
        photo: photoURL
      };

      const docRef = await addDoc(collection(db, "pets"), {
        ...petData,
        userId: user.uid,
        createdAt: new Date(),
        vaccines: [],
        records: [],
        medications: [],
      });

      setActiveModal(null);
      // setShowAddPet(false);
      setNewPet({ name: "", species: "", breed: "", dateOfBirth: "", weight: "", notes: "", photo: "" });
      setImageFile(null); // Clear image file
      addLog("Add Pet", `Pet profile added successfully. Pet ID: ${docRef.id}`);
    } catch (e) {
      console.error("Error adding pet:", e);
      setError("Failed to add pet. Please try again.");
      addLog("Add Pet", "Error adding pet:" + e);
    } finally {
      setLoading(false);
    }
  };

  const openEditProfile = (pet: Pet) => {
    setEditPetData({
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      dateOfBirth: pet.dateOfBirth,
      weight: pet.weight,
      notes: pet.notes || "",
      photo: pet.photo || "", // Set existing photo
    });
    setImageFile(null); // Clear any previously selected file
    setActiveModal("editProfile");
  };

    const [activeModal, setActiveModal] = useState<
      | null
      | "addRecord"
      | "editRecord"
      | "addVaccine"
      | "editVaccine"
      | "editProfile"
      | "addPet"
      | "petDetails"
    >(null);


  const handleDeleteRecord = async (recordId: string | number) => {
    if (!selectedPet || !user) return;

    if (!window.confirm("Are you sure you want to delete this medical record?")) {
      return;
    }

    setLoading(true);
    try {
      const petRef = doc(db, "pets", selectedPet.id);
      const updatedRecords = selectedPet.records?.filter(rec => (rec.id || selectedPet.records.indexOf(rec)) !== recordId) || []; // Handle both ID and index
      await updateDoc(petRef, {
        records: updatedRecords
      });
      // Force update selectedPet if it was not done by the onSnapshot listener already
      if (selectedPet.id) {
        const updatedPet = { ...selectedPet, records: updatedRecords };
        setSelectedPet(updatedPet);
      }
    } catch (error) {
      console.error("Error deleting record:", error);
      setError("Failed to delete record. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVaccine = async (vaccineId: string | number) => {
    if (!selectedPet || !user) return;

    if (!window.confirm("Are you sure you want to delete this vaccination record?")) {
      return;
    }

    setLoading(true);
    try {
      const petRef = doc(db, "pets", selectedPet.id);
      const updatedVaccines = selectedPet.vaccines?.filter(vac => (vac.id || selectedPet.vaccines.indexOf(vac)) !== vaccineId) || []; // Handle both ID and index
      await updateDoc(petRef, {
        vaccines: updatedVaccines
      });
      // Force update selectedPet if it was not done by the onSnapshot listener already
      if (selectedPet.id) {
        const updatedPet = { ...selectedPet, vaccines: updatedVaccines };
        setSelectedPet(updatedPet);
      }
    } catch (error) {
      console.error("Error deleting vaccine:", error);
      setError("Failed to delete vaccine. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDialogCloseRecord = (open: boolean) => {
    if (!open) {
      setActiveModal(null);
      isFormActiveRef.current = false;
    }
  };

  const [localRecord, setLocalRecord] = useState({ title: "", description: "", date: "" });


  ///iffy here
  // Initialize form when dialog opens
  useEffect(() => {
    if (activeModal === "addRecord") {
      isFormActiveRef.current = true;
      const today = new Date().toISOString().split('T')[0];
      setLocalRecord({ title: "", description: "", date: today });
    } else {
      isFormActiveRef.current = false;
    }
  }, [activeModal]);

  
  const handleSaveRecord = async () => {
    if (!selectedPet || !user || !localRecord.title || !localRecord.date) return;

    setLoading(true);
    try {
      const petRef = doc(db, "pets", selectedPet.id);
      const newRecord = { ...localRecord, id: Date.now().toString() }; // Generate unique ID
      const updatedRecords = [...(selectedPet.records || []), newRecord];

      await updateDoc(petRef, {
        records: updatedRecords
      });

      setActiveModal(null);
      // setShowAddRecord(false);
      isFormActiveRef.current = false;
    } catch (error) {
      console.error("Error adding record:", error);
      setError("Failed to add record. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const [localRecordForm, setLocalRecordForm] = useState(currentRecordToEdit || { id: "", title: "", description: "", date: "" });

  // iffy here 5215
  useEffect(() => {
    if (activeModal === "editRecord" && currentRecordToEdit) {
      isFormActiveRef.current = true;
      setLocalRecordForm(currentRecordToEdit);
    } else {
      isFormActiveRef.current = false;
      setLocalRecordForm({ id: "", title: "", description: "", date: "" });
    }
  }, [activeModal, currentRecordToEdit]);


  const handleDialogCloseRecordForm = (open: boolean) => {
    if (!open) {
      setActiveModal(null);
      isFormActiveRef.current = false;
      setCurrentRecordToEdit(null);
    }
  };

  const handleSaveRecordForm = async () => {
    if (!selectedPet || !user || !localRecordForm.title || !localRecordForm.date || !localRecordForm.id) return;

    setLoading(true);
    try {
      const petRef = doc(db, "pets", selectedPet.id);
      const updatedRecords = (selectedPet.records || []).map((rec, idx) => {
        const recId = rec.id ?? idx.toString(); // fallback
        if (recId === localRecordForm.id) {
          return { ...localRecordForm };
        }
        return rec;
      });

      await updateDoc(petRef, { records: updatedRecords });
      setSelectedPet(prev => prev ? { ...prev, records: updatedRecords } : prev);
      setCurrentRecordToEdit(null);
      setActiveModal(null);

    } catch (error) {
      setError("Failed to update record. Please try again.");
    } finally {
      setLoading(false);
    }
  };
    

  
  const [localVaccine, setLocalVaccine] = useState({ name: "", date: "", nextDue: "" });

  // iffy here 2
  // Initialize form when dialog opens
  useEffect(() => {
    if (activeModal === "addVaccine") {
      isFormActiveRef.current = true;
      const today = new Date().toISOString().split('T')[0];
      setLocalVaccine({ name: "", date: today, nextDue: "" });
    } else {
      isFormActiveRef.current = false;
    }
  }, [activeModal]);

  const handleDialogCloseVaccine = (open: boolean) => {
    if (!open) {
      setActiveModal(null);
      isFormActiveRef.current = false;
    }
  };

  const handleSaveVaccine = async () => {
    if (!selectedPet || !user || !localVaccine.name || !localVaccine.date) return;

    setLoading(true);
    try {
      const petRef = doc(db, "pets", selectedPet.id);
      const newVaccine = { ...localVaccine, id: Date.now().toString() }; // Generate unique ID
      const updatedVaccines = [...(selectedPet.vaccines || []), newVaccine];

      await updateDoc(petRef, {
        vaccines: updatedVaccines
      });
      
      setActiveModal(null);
      // setShowAddVaccine(false);
      isFormActiveRef.current = false;
    } catch (error) {
      console.error("Error adding vaccine:", error);
      setError("Failed to add vaccine. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  
  const [localVaccineForm, setLocalVaccineForm] = useState(currentVaccineToEdit || { id: "", name: "", date: "", nextDue: "" });

  useEffect(() => {
    if (activeModal === "editVaccine" && currentVaccineToEdit) {
      isFormActiveRef.current = true;
      setLocalVaccineForm(currentVaccineToEdit);
    } else {
      isFormActiveRef.current = false;
      setLocalVaccineForm({ id: "", name: "", date: "", nextDue: "" }); 
    }
  }, [activeModal, currentVaccineToEdit]);


  const handleDialogCloseVaccineForm = (open: boolean) => {
    if (!open) {
      setActiveModal(null);
      isFormActiveRef.current = false;
      setCurrentVaccineToEdit(null);
    }
  };

  const handleSaveVaccineForm = async () => {
    console.log("[Save handler] localVaccineForm:", localVaccineForm);

    if (!selectedPet || !user || !localVaccineForm.name || !localVaccineForm.date || !localVaccineForm.id) {
      console.warn("Missing fields; aborting update.");
      return;
    }

    setLoading(true);
    try {
      const petRef = doc(db, "pets", selectedPet.id);
      const updatedVaccines = (selectedPet.vaccines || []).map((vac, idx) => {
        const vacId = vac.id ?? idx.toString(); 
        if (vacId === localVaccineForm.id) {
          return { ...localVaccineForm };
        }
        return vac;
      });
      await updateDoc(petRef, { vaccines: updatedVaccines });
      setSelectedPet(prev => prev ? { ...prev, vaccines: updatedVaccines } : prev);
      setCurrentVaccineToEdit(null);
      setActiveModal(null);
    } catch (error) {
      setError("Failed to update vaccine. Please try again.");
    } finally {
      setLoading(false);
    }
  };



  const [localEditDataForm, setLocalEditDataForm] = useState({
      name: "",
      species: "",
      breed: "",
      dateOfBirth: "",
      weight: "",
      notes: "",
      photo: "",
    });

    //iffy here 3 
    useEffect(() => {
      if (activeModal == "editProfile" && selectedPet) {
        isFormActiveRef.current = true;
        setLocalEditDataForm({
          name: selectedPet.name,
          species: selectedPet.species,
          breed: selectedPet.breed,
          dateOfBirth: selectedPet.dateOfBirth,
          weight: selectedPet.weight,
          notes: selectedPet.notes || "",
          photo: selectedPet.photo || "",
        });
        setEditPetErrors({});
        setImageError(null);
        setImageFile(null); // Clear image file on dialog open
      } else {
        isFormActiveRef.current = false;
        setEditPetErrors({});
        setImageError(null);
      }
    }, [activeModal, selectedPet]);

    const handleFileChangeEditPetForm = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const errorMsg = validateImageFile(file);
        if (errorMsg) {
          setImageError(errorMsg.error);
          addLog("Edit Pet", errorMsg.error);
          setImageFile(null);
          return;
        }
        setImageError(null);
        setImageFile(file);
        addLog("Edit Pet", "Image file uploaded successfully");
        // Optionally, display a preview
        const reader = new FileReader();
        reader.onload = (event) => {
          setLocalEditDataForm(prev => ({ ...prev, photo: event.target?.result as string }));
        };
        reader.readAsDataURL(file);
      }
    };

    const handleEditPet = async () => {
      if (!selectedPet || !user) return;
      // Check for validation errors before saving
      if (Object.values(editPetErrors).some(Boolean)) {
        setError("Please fix validation errors before saving.");
        return;
      }
      setLoading(true);
      try {
        const petRef = doc(db, "pets", selectedPet.id);
        let photoURL = localEditDataForm.photo; // Use current photo by default

        if (imageFile) {
          photoURL = await uploadImage(imageFile);
        }

        await updateDoc(petRef, { ...localEditDataForm, photo: photoURL });

        setActiveModal(null);
        isFormActiveRef.current = false;
        setImageFile(null);
      } catch (error) {
        console.error("Error updating pet profile:", error);
        setError("Failed to update pet profile. Please try again.");
        addLog("Edit Pet", `Error updating pet profile. Pet ID: ${selectedPet.id}. ${error.message}`);
      } finally {
        setLoading(false);
        addLog("Edit Pet", `Pet profile updated successfully. Pet ID: ${selectedPet.id}`);
      }
    };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const errorMsg = validateImageFile(file);
      if (errorMsg) {
        setImageError(errorMsg.error);
        addLog("Add Pet", errorMsg.error);
        setImageFile(null);
        return;
      }
      addLog("Add Pet", "Image file uploaded successfully");
      setImageError(null);
      setImageFile(file);
      // Optionally, display a preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewPet(prev => ({ ...prev, photo: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

   const handleDeletePet = async () => {
    if (!selectedPet || !user) return;
    if (!window.confirm("Are you sure you want to delete this pet? This action cannot be undone.")) return;
      setLoading(true);
    try {
      await deletePet(selectedPet.id);
      setActiveModal(null);
      setSelectedPet(null);
    } catch (error) {
      setError("Failed to delete pet. Please try again.");
      addLog("Delete Pet", "Failed to delete pet. Please try again");
    } finally {
      setLoading(false);
      addLog("Delete Pet", "Pet profile deleted successfully");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading pets...</p>
        </div>
      </div>
    );
  }

 const PetDetailsDialog = ({ pet, open, onClose }: { pet: Pet | null; open: boolean; onClose: () => void }) => (
     <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="sm:max-w-4xl max-w-xs sm:h-[65vh] h-[70vh] p-6 sm:p-2 animate-in fade-in zoom-in-95 slide-in-from-top-10 sm:mb-0 rounded-lg sm:rounded-2xl">
        <VisuallyHidden>
          <DialogTitle>Pet Profile</DialogTitle>
        </VisuallyHidden>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 items-start">
          
          {/* Left: Pet Photo + Info */}
          <div className="sm:w-1/3 size-full flex flex-col items-center justify-center p-2 sm:p-4 sm:mb-0">
            <div className="w-40 h-40 rounded-full bg-gradient-soft flex items-center justify-center overflow-hidden mb-4">
              {pet?.photo ? (
                <img src={pet.photo} alt={pet.name} className="w-full h-full object-cover rounded-full" />
              ) : (
                <Heart className="w-12 h-12 text-primary" />
              )}
            </div>
            <div className="text-center space-y-1 hidden sm:block">
              <h3 className="font-semibold text-lg">{pet?.name}</h3>
               <div className="flex text-sm text-muted-foreground">
                  <span className="font-medium w-[80px]">Species:</span>
                  <span>{pet?.species}</span>
                </div>
                <div className="flex text-sm text-muted-foreground">
                  <span className="font-medium w-[80px]">Breed:</span>
                  <span>{pet?.breed}</span>
                </div>
                <div className="flex text-sm text-muted-foreground">
                  <span className="font-medium w-[80px]">Birthday:</span>
                  <span>{pet?.dateOfBirth}</span>
                </div>
                <div className="flex text-sm text-muted-foreground">
                  <span className="font-medium w-[80px]">Weight:</span>
                  <span>{pet?.weight} kg</span>
                </div>
            </div>
          </div>

          {/* Right: Tabs with scroll */}
          <div defaultValue={window.innerWidth < 640 ? "info" : "vaccines"} className="sm:w-2/3 w-full h-full justify-between flex flex-col pr-0 sm:pr-2 sm:mt-7 ">
            <Tabs defaultValue={window.innerWidth < 640 ? "info" : "records"} className="space-y-1 flex flex-col h-5/6 mb-3">
                <TabsList className="grid grid-cols-3 sm:grid-cols-2 w-full sm:mb-2">
                  <TabsTrigger value="info" className="block sm:hidden">Details</TabsTrigger>
                  <TabsTrigger value="records">Records</TabsTrigger>
                  <TabsTrigger value="vaccines">Vaccines</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="block sm:hidden">
                  <div className="flex flex-col justify-center items-center text-center space-y-1 p-4 h-52 sm:max-h-80">
                    {/* <h3 className="font-semibold text-lg">{pet?.name}</h3> */}
                    <div className="flex text-sm text-muted-foreground justify-center">
                      <span className="font-medium w-[80px]">Name:</span>
                      <span>{pet?.name}</span>
                    </div>
                    <div className="flex text-sm text-muted-foreground justify-center">
                      <span className="font-medium w-[80px]">Species:</span>
                      <span>{pet?.species}</span>
                    </div>
                    <div className="flex text-sm text-muted-foreground justify-center">
                      <span className="font-medium w-[80px]">Breed:</span>
                      <span>{pet?.breed}</span>
                    </div>
                    <div className="flex text-sm text-muted-foreground justify-center">
                      <span className="font-medium w-[80px]">Birthday:</span>
                      <span>{pet?.dateOfBirth}</span>
                    </div>
                    <div className="flex text-sm text-muted-foreground justify-center">
                      <span className="font-medium w-[80px]">Weight:</span>
                      <span>{pet?.weight} kg</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="vaccines">
                  <div className="flex items-center justify-between sm:mb-2">
                    <Label>Vaccinations</Label>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setActiveModal("addVaccine")}
                      className="ml-2"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>

                  <div className="max-h-52 h-40 sm:max-h-[340px] sm:h-[340px] overflow-y-auto scrollbar-thin">
                    {pet?.vaccines?.length ? (
                      pet.vaccines.map((vaccine, idx) => (
                        <div key={vaccine.id || idx} className="text-sm text-muted-foreground mb-2 p-2 bg-muted/50 rounded flex justify-between items-center">
                          <div>
                            <strong>{vaccine.name}</strong><br />
                            Given: {vaccine.date}<br />
                            {vaccine.nextDue && `Next Due: ${vaccine.nextDue}`}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => {
                              setCurrentVaccineToEdit({ ...vaccine, id: vaccine.id || idx.toString() });
                              setTimeout(() => setActiveModal("editVaccine"), 0);
                            }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteVaccine(vaccine.id || idx)} className="text-red-500 hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No vaccines recorded</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="records">
                  <div className="flex items-center justify-between sm:mb-2">
                    <Label>Medical Records</Label>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setActiveModal("addRecord")}
                      className="ml-2"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                  
                  {/* max-h-[200px] */}
                  <div className="max-h-52 h-40 sm:max-h-[340px] sm:h-[340px] overflow-y-auto scrollbar-thin">
                    {pet?.records?.length ? (
                      pet.records.map((record, idx) => (
                        <div key={record.id || idx} className="text-sm text-muted-foreground mb-2 p-2 bg-muted/50 rounded flex justify-between items-center">
                          <div>
                            <strong>{record.title}</strong> ({record.date})<br />
                            {record.description}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => {
                              setCurrentRecordToEdit({ ...record, id: record.id || idx.toString() });
                              setTimeout(() => setActiveModal("editRecord"), 0);
                            }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteRecord(record.id || idx)} className="text-red-500 hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No records</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
 
            {/* Action buttons */}
            <div className="flex justify-center gap-3 border-t pt-3 h-1/6 ">
              <Button className="w-full" variant="destructive" onClick={handleDeletePet} disabled={loading}>
                {loading ? "Deleting..." : "Delete"}
              </Button>
              <Button className="w-full" onClick={() => openEditProfile(pet!)}>Edit</Button>
            </div>
            
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );


  return (
    <div className="min-h-screen bg-background pb-20">
      {/* <div className="gradient-primary p-6 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <h1 className="text-white font-bold">My Pets</h1>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setActiveModal("addPet")}
            className="bg-white/20 text-white hover:bg-white/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Pet
          </Button>
        </div>
        <p className="text-white/90 mt-2">Manage your furry family members</p>
      </div> */}

      <div className="gradient-primary p-6 rounded-b-3xl">
        <div className="flex items-center justify-between">
          {/* Left: Icon + Text */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <PawPrint className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold">My Pets</h1>
              <p className="text-white/90 text-sm">
                Manage your furry family members
              </p>
            </div>
          </div>

          {/* Right: + Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setActiveModal("addPet")}
            className="bg-white/20 text-white hover:bg-white/30"
          >
            +
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      <div className="p-6 gap-4 lg:grid 2xl:grid-cols-5  xl:grid-cols-4 lg:grid-cols-3 flex flex-col">
        {pets.length > 0 ? (
          pets.map((pet) => (
            <PetCard
              key={pet.id}
              pet={pet}
              onEdit={() => {
                setSelectedPet(pet);
                setActiveModal("petDetails");
              }}
            />
          ))
        ) : (
          <p className="text-center text-muted-foreground">No pets added yet. Click "Add Pet" to get started! 🐾</p>
        )}
      </div>

      {selectedPet && (
        <PetDetailsDialog
          pet={selectedPet}
          open={activeModal === "petDetails"}
          onClose={() => {
            setActiveModal(null);
            setSelectedPet(null);
          }}
        />
      )}


      {/* Add Record Dialog */}
      <Dialog open={activeModal === "addRecord"} onOpenChange={(open) => { if (!open) setActiveModal(null); }}>
        <DialogContent className="sm:max-w-4xl max-w-xs rounded-lg sm:rounded-2xl  animate-in fade-in zoom-in-95 slide-in-from-top-10">
          <DialogHeader>
            <DialogTitle>Add Medical Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                placeholder="e.g., Annual Checkup, Surgery, etc."
                value={localRecord.title}
                onChange={(e) => setLocalRecord(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Enter details about the medical record..."
                value={localRecord.description}
                onChange={(e) => setLocalRecord(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div>
              <Label>Date *</Label>
              <DatePicker
                date={localRecord.date ? new Date(localRecord.date + 'T00:00:00') : undefined}
                onDateChange={(date) => setLocalRecord(prev => ({ 
                  ...prev, 
                  date: date ? format(date, 'yyyy-MM-dd') : "" 
                }))}
                placeholder="Select date"
                maxDate={new Date()}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSaveRecord}
                disabled={!localRecord.title || !localRecord.date}
              >
                Save Record
              </Button>
              <Button variant="outline" onClick={() => handleDialogCloseRecord(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Record Dialog */}
      <Dialog open={activeModal === "editRecord"} onOpenChange={(open) => { if (!open) setActiveModal(null); }}>
        <DialogContent className="sm:max-w-4xl max-w-xs rounded-lg sm:rounded-2xl  animate-in fade-in zoom-in-95 slide-in-from-top-10">
          <DialogHeader>
            <DialogTitle>Edit Medical Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                placeholder="e.g., Annual Checkup, Surgery, etc."
                value={localRecordForm.title}
                onChange={(e) =>
                  setLocalRecordForm((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Enter details about the medical record..."
                value={localRecordForm.description}
                onChange={(e) =>
                  setLocalRecordForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Date *</Label>
              <DatePicker
                date={localRecordForm.date ? new Date(localRecordForm.date + 'T00:00:00') : undefined}
                onDateChange={(date) => setLocalRecordForm(prev => ({ 
                  ...prev, 
                  date: date ? format(date, 'yyyy-MM-dd') : "" 
                }))}
                placeholder="Select date"
                maxDate={new Date()}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSaveRecordForm}
                disabled={loading || !localRecordForm.title || !localRecordForm.date}
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={() => handleDialogCloseRecordForm(false)}>
                Cancel
              </Button>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Vaccine Dialog */}
      <Dialog open={activeModal === "addVaccine"} onOpenChange={(open) => { if (!open) setActiveModal(null); }}>
        <DialogContent className="sm:max-w-4xl max-w-xs rounded-lg sm:rounded-2xl  animate-in fade-in zoom-in-95 slide-in-from-top-10">
          <DialogHeader>
            <DialogTitle>Add Vaccination</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vaccine Name *</Label>
              <Input
                placeholder="e.g., Rabies, DHPP, etc."
                value={localVaccine.name}
                onChange={(e) => setLocalVaccine(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Date Given *</Label>
              <DatePicker
                date={localVaccine.date ? new Date(localVaccine.date + 'T00:00:00') : undefined}
                onDateChange={(date) => setLocalVaccine(prev => ({ 
                  ...prev, 
                  date: date ? format(date, 'yyyy-MM-dd') : "" 
                }))}
                placeholder="Select date given"
                maxDate={new Date()}
              />
            </div>
            <div>
              <Label>Next Due Date</Label>
              <DatePicker
                date={localVaccine.nextDue ? new Date(localVaccine.nextDue + 'T00:00:00') : undefined}
                onDateChange={(date) => setLocalVaccine(prev => ({ 
                  ...prev, 
                  nextDue: date ? format(date, 'yyyy-MM-dd') : "" 
                }))}
                placeholder="Select next due date"
                minDate={localVaccine.date ? new Date(localVaccine.date + 'T00:00:00') : undefined}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSaveVaccine}
                disabled={!localVaccine.name || !localVaccine.date}
              >
                Save Vaccine
              </Button>
              <Button variant="outline" onClick={() => handleDialogCloseVaccine(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Vaccine Dialog */}
      <Dialog
        open={activeModal === "editVaccine"}
        onOpenChange={(open) => {
          if (!open) {
            setActiveModal(null);
            setCurrentVaccineToEdit(null); 
          }
        }}
      >

        <DialogContent className="sm:max-w-4xl max-w-xs rounded-lg sm:rounded-2xl animate-in fade-in zoom-in-95 slide-in-from-top-10">
          <DialogHeader>
            <DialogTitle>Edit Vaccination</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vaccine Name *</Label>
              <Input
                placeholder="e.g., Rabies, DHPP, etc."
                value={localVaccineForm.name || ""}
                onChange={(e) => setLocalVaccineForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Date Given *</Label>
              <DatePicker
                date={localVaccineForm.date ? new Date(localVaccineForm.date + 'T00:00:00') : undefined}
                onDateChange={(date) => setLocalVaccineForm(prev => ({ 
                  ...prev, 
                  date: date ? format(date, 'yyyy-MM-dd') : "" 
                }))}
                placeholder="Select date given"
                maxDate={new Date()}
              />
            </div>
            <div>
              <Label>Next Due Date</Label>
              <DatePicker
                date={localVaccineForm.nextDue ? new Date(localVaccineForm.nextDue + 'T00:00:00') : undefined}
                onDateChange={(date) => setLocalVaccineForm(prev => ({ 
                  ...prev, 
                  nextDue: date ? format(date, 'yyyy-MM-dd') : "" 
                }))}
                placeholder="Select next due date"
                minDate={localVaccineForm.date ? new Date(localVaccineForm.date + 'T00:00:00') : undefined}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSaveVaccineForm}
                disabled={!localVaccineForm.name || !localVaccineForm.date}
              >
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => handleDialogCloseVaccineForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={activeModal === "editProfile"} onOpenChange={(open) => {
        if (!open) {
          isFormActiveRef.current = false;
          setImageFile(null);
          setEditPetErrors({});
          setImageError(null);
          setActiveModal(null);
        } else {
          setEditPetErrors({});
          setImageError(null);
        }
      }}>
        <DialogContent className="sm:max-w-4xl max-w-xs rounded-lg sm:rounded-2xl  animate-in fade-in zoom-in-95 slide-in-from-top-10">
          <DialogHeader>
            <DialogTitle>Edit Pet Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pet Photo</Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {localEditDataForm.photo ? (
                    <img src={localEditDataForm.photo} alt="Pet" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <Camera className="w-10 h-10 text-muted-foreground" />
                  )}
                </div>
                <Input type="file" accept="image/*" onChange={handleFileChangeEditPetForm} />
              </div>
              {imageError && <span className="text-red-500 text-xs">{imageError}</span>}
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={localEditDataForm.name}
                onChange={(e) => {
                  const value = e.target.value;
                  const errorMsg = validatePetField("name", value);
                  setLocalEditDataForm(prev => ({ ...prev, name: value }));
                  setEditPetErrors(prev => {
                    if (prev.name !== errorMsg && errorMsg) {
                      addLog("Edit Pet", errorMsg);
                    }
                    return { ...prev, name: errorMsg };
                  });
                }}
                className={editPetErrors.name ? "border-red-500" : ""}
              />
              {editPetErrors.name && <span className="text-red-500 text-xs">{editPetErrors.name}</span>}
            </div>
            <div>
              <Label>Species</Label>
              <Select
                value={localEditDataForm.species}
                onValueChange={(value) => {
                  const errorMsg = validatePetField("species", value);
                  setLocalEditDataForm(prev => ({ ...prev, species: value }));
                  setEditPetErrors(prev => {
                    if (prev.species !== errorMsg && errorMsg) {
                      addLog("Edit Pet", errorMsg);
                    }
                    return { ...prev, species: errorMsg };
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dog">Dog</SelectItem>
                  <SelectItem value="Cat">Cat</SelectItem>
                  <SelectItem value="Bird">Bird</SelectItem>
                  <SelectItem value="Fish">Fish</SelectItem>
                  <SelectItem value="Rabbit">Rabbit</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {editPetErrors.species && <span className="text-red-500 text-xs">{editPetErrors.species}</span>}
            </div>
            <div>
              <Label>Breed</Label>
              <Input
                value={localEditDataForm.breed}
                onChange={(e) => {
                  const value = e.target.value;
                  const errorMsg = value === "" ? undefined : validatePetField("breed", value);
                  setLocalEditDataForm(prev => ({ ...prev, breed: value }));
                  setEditPetErrors(prev => {
                    if (prev.breed !== errorMsg && errorMsg) {
                      addLog("Edit Pet", errorMsg);
                    }
                    return { ...prev, breed: errorMsg };
                  });
                }}
                className={editPetErrors.breed ? "border-red-500" : ""}
              />
              {editPetErrors.breed && <span className="text-red-500 text-xs">{editPetErrors.breed}</span>}
            </div>
            <div>
              <Label>Date of Birth</Label>
              <DatePicker
                date={newPet.dateOfBirth ? new Date(newPet.dateOfBirth + 'T00:00:00') : undefined}
                onDateChange={(date) => setNewPet({ 
                  ...newPet, 
                  dateOfBirth: date ? format(date, 'yyyy-MM-dd') : "" 
                })}
                placeholder="Select date of birth"
                maxDate={new Date()}
              />
            </div>
            <div>
              <Label>Weight (kg)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                placeholder="e.g., 15, 7.5, 2.3"
                value={localEditDataForm.weight === undefined || localEditDataForm.weight === null ? "" : localEditDataForm.weight}
                onChange={(e) => {
                  const value = e.target.value;
                  const errorMsg = validatePetField("weight", value === "" ? 0 : parseFloat(value));
                  setLocalEditDataForm(prev => ({ ...prev, weight: value }));
                  setEditPetErrors(prev => {
                    if (prev.weight !== errorMsg && errorMsg) {
                      addLog("Edit Pet", errorMsg);
                    }
                    return { ...prev, weight: errorMsg };
                  });
                }}
                className={editPetErrors.weight ? "border-red-500" : ""}
              />
              {editPetErrors.weight && <span className="text-red-500 text-xs">{editPetErrors.weight}</span>}
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Any additional notes about your pet..."
                value={localEditDataForm.notes}
                onChange={(e) => {
                  const value = e.target.value;
                  const errorMsg = value === "" ? undefined : validatePetField("notes", value);
                  setLocalEditDataForm(prev => ({ ...prev, notes: value }));
                  setEditPetErrors(prev => {
                    if (prev.notes !== errorMsg && errorMsg) {
                      addLog("Edit Pet", errorMsg);
                    }
                    return { ...prev, notes: errorMsg };
                  });
                }}
                className={editPetErrors.notes ? "border-red-500" : ""}
              />
              {editPetErrors.notes && <span className="text-red-500 text-xs">{editPetErrors.notes}</span>}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleEditPet} disabled={Object.values(editPetErrors).some(Boolean)}>
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => {
                setActiveModal(null);
                // setShowEditProfile(false);
                isFormActiveRef.current = false;
                setImageFile(null);
              }}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Pet Dialog */}
      <Dialog open={activeModal === "addPet"} onOpenChange={(open) => {
        if (!open) {
          setImageFile(null);
          setNewPet({ name: "", species: "", breed: "", dateOfBirth: "", weight: "", notes: "", photo: "" });
          setNewPetErrors({});
          setImageError(null);
          setActiveModal(null);
        } else {
          setNewPetErrors({});
          setImageError(null);
        }
      }}>
        <DialogContent className="sm:max-w-4xl max-w-xs rounded-lg sm:rounded-2xl  animate-in fade-in zoom-in-95 slide-in-from-top-10">
          <DialogHeader>
            <DialogTitle>Add New Pet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pet Photo</Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {newPet.photo ? (
                    <img src={newPet.photo} alt="Pet Preview" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <Camera className="w-10 h-10 text-muted-foreground" />
                  )}
                </div>
                <Input type="file" accept="image/*" onChange={handleFileChange} />
              </div>
              {imageError && <span className="text-red-500 text-xs">{imageError}</span>}
            </div>
            <div>
              <Label>Name *</Label>
              <Input
                value={newPet.name}
                onChange={(e) => {
                  const value = e.target.value;
                  const errorMsg = validatePetField("name", value);
                  setNewPet({ ...newPet, name: value });
                  setNewPetErrors(prev => {
                    if (prev.name !== errorMsg && errorMsg) {
                      addLog("Add Pet", errorMsg);
                    }
                    return { ...prev, name: errorMsg };
                  });
                }}
                className={newPetErrors.name ? "border-red-500" : ""}
              />
              {newPetErrors.name && <span className="text-red-500 text-xs">{newPetErrors.name}</span>}
            </div>
            <div>
              <Label>Species *</Label>
              <Select
                value={newPet.species}
                onValueChange={(value) => {
                  const errorMsg = validatePetField("species", value);
                  setNewPet({ ...newPet, species: value });
                  setNewPetErrors(prev => {
                    if (prev.species !== errorMsg && errorMsg) {
                      addLog("Add Pet", errorMsg);
                    }
                    return { ...prev, species: errorMsg };
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select species" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dog">Dog</SelectItem>
                  <SelectItem value="Cat">Cat</SelectItem>
                  <SelectItem value="Bird">Bird</SelectItem>
                  <SelectItem value="Fish">Fish</SelectItem>
                  <SelectItem value="Rabbit">Rabbit</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Breed</Label>
              <Input
                value={newPet.breed}
                onChange={(e) => {
                  const value = e.target.value;
                  const errorMsg = value === "" ? undefined : validatePetField("breed", value);
                  setNewPet({ ...newPet, breed: value });
                  setNewPetErrors(prev => {
                    if (prev.breed !== errorMsg && errorMsg) {
                      addLog("Add Pet", errorMsg);
                    }
                    return { ...prev, breed: errorMsg };
                  });
                }}
                className={newPetErrors.breed ? "border-red-500" : ""}
              />
              {newPetErrors.breed && <span className="text-red-500 text-xs">{newPetErrors.breed}</span>}
            </div>
            <div>
              <Label>Date of Birth *</Label>
              <DatePicker
                date={newPet.dateOfBirth ? new Date(newPet.dateOfBirth + 'T00:00:00') : undefined}
                onDateChange={(date) => setNewPet({ 
                  ...newPet, 
                  dateOfBirth: date ? format(date, 'yyyy-MM-dd') : "" 
                })}
                placeholder="Select date of birth"
                maxDate={new Date()}
              />
            </div>
            <div>
              <Label>Weight (kg)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                placeholder="e.g., 15, 7.5, 2.3"
                value={newPet.weight === undefined || newPet.weight === null ? "" : newPet.weight}
                onChange={(e) => {
                  const value = e.target.value;
                  const errorMsg = validatePetField("weight", value === "" ? 0 : parseFloat(value));
                  setNewPet({ ...newPet, weight: value === "" ? "" : parseFloat(value) });
                  setNewPetErrors(prev => {
                    if (prev.weight !== errorMsg && errorMsg) {
                      addLog("Add Pet", errorMsg);
                    }
                    return { ...prev, weight: errorMsg };
                  });
                }}
                className={newPetErrors.weight ? "border-red-500" : ""}
              />
               {newPetErrors.weight && <span className="text-red-500 text-xs">{newPetErrors.weight}</span>}
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={newPet.notes}
                onChange={(e) => {
                  const value = e.target.value;
                  const errorMsg = value === "" ? undefined : validatePetField("notes", value);
                  setNewPet({ ...newPet, notes: value });
                  setNewPetErrors(prev => {
                    if (prev.notes !== errorMsg && errorMsg) {
                      addLog("Add Pet", errorMsg);
                    }
                    return { ...prev, notes: errorMsg };
                  });
                }}
                placeholder="Any additional notes..."
                className={newPetErrors.notes ? "border-red-500" : ""}
              />
              {newPetErrors.notes && <span className="text-red-500 text-xs">{newPetErrors.notes}</span>}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddPet} disabled={!newPet.name || !newPet.species || !newPet.dateOfBirth ||  Object.values(newPetErrors).some(Boolean)}>
                Add Pet
              </Button>
              <Button variant="outline" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Navigation />
    </div>
  );
};

export default PetManagement;