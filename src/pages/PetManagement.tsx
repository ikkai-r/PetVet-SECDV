import { useState, useEffect, useRef } from "react";
import { Plus, Edit, Camera, Heart, Calendar, FileText, Weight, Trash2 } from "lucide-react"; // Added Trash2 icon
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/Navigation";
import PetCard from "@/components/PetCard";

import { db, auth, storage } from "@/lib/firebase"; // Import storage
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Import storage functions
import { User } from "firebase/auth";

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
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [showPetDetails, setShowPetDetails] = useState(false);
  const [showAddPet, setShowAddPet] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showAddVaccine, setShowAddVaccine] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  // For editing existing records/vaccines
  const [showEditRecord, setShowEditRecord] = useState(false);
  const [currentRecordToEdit, setCurrentRecordToEdit] = useState<Pet['records'][0] | null>(null);
  const [showEditVaccine, setShowEditVaccine] = useState(false);
  const [currentVaccineToEdit, setCurrentVaccineToEdit] = useState<Pet['vaccines'][0] | null>(null);

  const [editPetData, setEditPetData] = useState({
    name: "",
    species: "",
    breed: "",
    dateOfBirth: "",
    weight: "",
    notes: "",
    photo: "", // Added photo to editPetData
  });
  const [newPet, setNewPet] = useState({
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

  const uploadImage = async (file: File) => {
    if (!user) throw new Error("User not authenticated for image upload.");
    const storageRef = ref(storage, `pet_photos/${user.uid}/${file.name}_${Date.now()}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const handleAddPet = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let photoURL = "";
      if (imageFile) {
        photoURL = await uploadImage(imageFile);
      }

      // Only use the uploaded photo URL, not the preview
      const petData = { ...newPet, photo: photoURL };

      await addDoc(collection(db, "pets"), {
        ...petData,
        userId: user.uid,
        createdAt: new Date(),
        vaccines: [],
        records: [],
        medications: [],
      });
      setShowAddPet(false);
      setNewPet({ name: "", species: "", breed: "", dateOfBirth: "", weight: "", notes: "", photo: "" });
      setImageFile(null); // Clear image file
    } catch (e) {
      console.error("Error adding pet:", e);
      setError("Failed to add pet. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  const handleEditProfile = async () => {
    if (!selectedPet || !user) return;

    setLoading(true);
    try {
      const petRef = doc(db, "pets", selectedPet.id);
      let photoURL = editPetData.photo; // Use existing photo by default
      if (imageFile) {
        photoURL = await uploadImage(imageFile);
      }

      await updateDoc(petRef, { ...editPetData, photo: photoURL });

      setShowEditProfile(false);
      isFormActiveRef.current = false;
      setImageFile(null); // Clear image file
    } catch (error) {
      console.error("Error updating pet profile:", error);
      setError("Failed to update pet profile. Please try again.");
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
    setShowEditProfile(true);
  };

  const PetDetailsDialog = ({ pet, open, onClose }: { pet: Pet | null; open: boolean; onClose: () => void }) => (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-md animate-in fade-in zoom-in-95 slide-in-from-top-10">
        <DialogHeader>
          <DialogTitle>{pet?.name} - Pet Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-soft flex items-center justify-center mx-auto mb-4 overflow-hidden">
              {pet?.photo ? (
                <img src={pet.photo} alt={pet.name} className="w-full h-full object-cover rounded-full" />
              ) : (
                <Heart className="w-12 h-12 text-primary" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">{pet?.species} • {pet?.breed}</p>
            <p className="text-sm text-muted-foreground">{pet?.dateOfBirth}</p>
            <p className="text-sm text-muted-foreground">{pet?.weight} kg</p>
          </div>

          <div>
            <Label className="block mb-1">Vaccinations</Label>
            {pet?.vaccines?.length ? (
              pet.vaccines.map((vaccine, idx) => (
                <div key={vaccine.id || idx} className="text-sm text-muted-foreground mb-2 p-2 bg-muted/50 rounded flex justify-between items-center">
                  <div>
                    <strong>{vaccine.name}</strong><br />
                    Given: {vaccine.date}<br />
                    {vaccine.nextDue && `Next Due: ${vaccine.nextDue}`}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCurrentVaccineToEdit(vaccine);
                        setShowEditVaccine(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteVaccine(vaccine.id || idx)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No vaccines recorded</p>
            )}
          </div>

          <div>
            <Label className="block mb-1">Medical Records</Label>
            {pet?.records?.length ? (
              pet.records.map((record, idx) => (
                <div key={record.id || idx} className="text-sm text-muted-foreground mb-2 p-2 bg-muted/50 rounded flex justify-between items-center">
                  <div>
                    <strong>{record.title}</strong> ({record.date})<br />
                    {record.description}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCurrentRecordToEdit(record);
                        setShowEditRecord(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRecord(record.id || idx)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No records</p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={() => openEditProfile(pet!)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
            <Button variant="secondary" onClick={() => setShowAddRecord(true)}>
              <FileText className="w-4 h-4 mr-2" />
              Add Record
            </Button>
            <Button variant="outline" onClick={() => setShowAddVaccine(true)}>
              <Calendar className="w-4 h-4 mr-2" />
              Add Vaccine
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

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

  const AddRecordDialog = () => {
    const [localRecord, setLocalRecord] = useState({ title: "", description: "", date: "" });

    // Initialize form when dialog opens
    useEffect(() => {
      if (showAddRecord) {
        isFormActiveRef.current = true;
        const today = new Date().toISOString().split('T')[0];
        setLocalRecord({ title: "", description: "", date: today });
      } else {
        isFormActiveRef.current = false;
      }
    }, [showAddRecord]);

    const handleDialogClose = (open: boolean) => {
      if (!open) {
        setShowAddRecord(false);
        isFormActiveRef.current = false;
      }
    };

    const handleSave = async () => {
      if (!selectedPet || !user || !localRecord.title || !localRecord.date) return;

      setLoading(true);
      try {
        const petRef = doc(db, "pets", selectedPet.id);
        const newRecord = { ...localRecord, id: Date.now().toString() }; // Generate unique ID
        const updatedRecords = [...(selectedPet.records || []), newRecord];

        await updateDoc(petRef, {
          records: updatedRecords
        });

        setShowAddRecord(false);
        isFormActiveRef.current = false;
      } catch (error) {
        console.error("Error adding record:", error);
        setError("Failed to add record. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    return (
      <Dialog open={showAddRecord} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md animate-in fade-in zoom-in-95 slide-in-from-top-10">
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
              <Input
                type="date"
                value={localRecord.date}
                onChange={(e) => setLocalRecord(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={!localRecord.title || !localRecord.date}
              >
                Save Record
              </Button>
              <Button variant="outline" onClick={() => handleDialogClose(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const EditRecordDialog = () => {
    const [localRecord, setLocalRecord] = useState(currentRecordToEdit || { id: "", title: "", description: "", date: "" });

    useEffect(() => {
      if (showEditRecord && currentRecordToEdit) {
        isFormActiveRef.current = true;
        setLocalRecord(currentRecordToEdit);
      } else {
        isFormActiveRef.current = false;
      }
    }, [showEditRecord, currentRecordToEdit]);

    const handleDialogClose = (open: boolean) => {
      if (!open) {
        setShowEditRecord(false);
        isFormActiveRef.current = false;
        setCurrentRecordToEdit(null);
      }
    };

    const handleSave = async () => {
      if (!selectedPet || !user || !localRecord.title || !localRecord.date || !localRecord.id) return;

      setLoading(true);
      try {
        const petRef = doc(db, "pets", selectedPet.id);
        const updatedRecords = (selectedPet.records || []).map(rec =>
          rec.id === localRecord.id ? localRecord : rec
        );
        await updateDoc(petRef, { records: updatedRecords });
        setSelectedPet(prev => prev ? { ...prev, records: updatedRecords } : prev);
        setShowEditRecord(false);
        setCurrentRecordToEdit(null);
      } catch (error) {
        setError("Failed to update record. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    return (
      <Dialog open={showEditRecord} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md animate-in fade-in zoom-in-95 slide-in-from-top-10">
          <DialogHeader>
            <DialogTitle>Edit Medical Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                placeholder="e.g., Annual Checkup, Surgery, etc."
                value={localRecord.title}
                onChange={(e) =>
                  setLocalRecord((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Enter details about the medical record..."
                value={localRecord.description}
                onChange={(e) =>
                  setLocalRecord((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={localRecord.date}
                onChange={(e) =>
                  setLocalRecord((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={loading || !localRecord.title || !localRecord.date}
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={() => handleDialogClose(false)}>
                Cancel
              </Button>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        </DialogContent>
      </Dialog>
    );
  };


  const AddVaccineDialog = () => {
    const [localVaccine, setLocalVaccine] = useState({ name: "", date: "", nextDue: "" });

    // Initialize form when dialog opens
    useEffect(() => {
      if (showAddVaccine) {
        isFormActiveRef.current = true;
        const today = new Date().toISOString().split('T')[0];
        setLocalVaccine({ name: "", date: today, nextDue: "" });
      } else {
        isFormActiveRef.current = false;
      }
    }, [showAddVaccine]);

    const handleDialogClose = (open: boolean) => {
      if (!open) {
        setShowAddVaccine(false);
        isFormActiveRef.current = false;
      }
    };

    const handleSave = async () => {
      if (!selectedPet || !user || !localVaccine.name || !localVaccine.date) return;

      setLoading(true);
      try {
        const petRef = doc(db, "pets", selectedPet.id);
        const newVaccine = { ...localVaccine, id: Date.now().toString() }; // Generate unique ID
        const updatedVaccines = [...(selectedPet.vaccines || []), newVaccine];

        await updateDoc(petRef, {
          vaccines: updatedVaccines
        });

        setShowAddVaccine(false);
        isFormActiveRef.current = false;
      } catch (error) {
        console.error("Error adding vaccine:", error);
        setError("Failed to add vaccine. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    return (
      <Dialog open={showAddVaccine} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md animate-in fade-in zoom-in-95 slide-in-from-top-10">
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
              <Input
                type="date"
                value={localVaccine.date}
                onChange={(e) => setLocalVaccine(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div>
              <Label>Next Due Date</Label>
              <Input
                type="date"
                value={localVaccine.nextDue}
                onChange={(e) => setLocalVaccine(prev => ({ ...prev, nextDue: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={!localVaccine.name || !localVaccine.date}
              >
                Save Vaccine
              </Button>
              <Button variant="outline" onClick={() => handleDialogClose(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const EditVaccineDialog = () => {
    const [localVaccine, setLocalVaccine] = useState(currentVaccineToEdit || { id: "", name: "", date: "", nextDue: "" });

    useEffect(() => {
      if (showEditVaccine && currentVaccineToEdit) {
        isFormActiveRef.current = true;
        setLocalVaccine(currentVaccineToEdit);
      } else {
        isFormActiveRef.current = false;
      }
    }, [showEditVaccine, currentVaccineToEdit]);

    const handleDialogClose = (open: boolean) => {
      if (!open) {
        setShowEditVaccine(false);
        isFormActiveRef.current = false;
        setCurrentVaccineToEdit(null);
      }
    };

    const handleSave = async () => {
      if (!selectedPet || !user || !localVaccine.name || !localVaccine.date || !localVaccine.id) return;

      setLoading(true);
      try {
        const petRef = doc(db, "pets", selectedPet.id);
        const updatedVaccines = (selectedPet.vaccines || []).map(vac =>
          vac.id === localVaccine.id ? localVaccine : vac
        );
        await updateDoc(petRef, { vaccines: updatedVaccines });
        setSelectedPet(prev => prev ? { ...prev, vaccines: updatedVaccines } : prev);
        setShowEditVaccine(false);
        setCurrentVaccineToEdit(null);
      } catch (error) {
        setError("Failed to update vaccine. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    return (
      <Dialog open={showEditVaccine} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md animate-in fade-in zoom-in-95 slide-in-from-top-10">
          <DialogHeader>
            <DialogTitle>Edit Vaccination</DialogTitle>
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
              <Input
                type="date"
                value={localVaccine.date}
                onChange={(e) => setLocalVaccine(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div>
              <Label>Next Due Date</Label>
              <Input
                type="date"
                value={localVaccine.nextDue}
                onChange={(e) => setLocalVaccine(prev => ({ ...prev, nextDue: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={loading || !localVaccine.name || !localVaccine.date}
              >
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => handleDialogClose(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };


  const EditProfileDialog = () => {
    const [localEditData, setLocalEditData] = useState({
      name: "",
      species: "",
      breed: "",
      dateOfBirth: "",
      weight: "",
      notes: "",
      photo: "",
    });

    useEffect(() => {
      if (showEditProfile && selectedPet) {
        isFormActiveRef.current = true;
        setLocalEditData({
          name: selectedPet.name,
          species: selectedPet.species,
          breed: selectedPet.breed,
          dateOfBirth: selectedPet.dateOfBirth,
          weight: selectedPet.weight,
          notes: selectedPet.notes || "",
          photo: selectedPet.photo || "",
        });
        setImageFile(null); // Clear image file on dialog open
      } else {
        isFormActiveRef.current = false;
      }
    }, [showEditProfile, selectedPet]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        setImageFile(e.target.files[0]);
        // Optionally, display a preview
        const reader = new FileReader();
        reader.onload = (event) => {
          setLocalEditData(prev => ({ ...prev, photo: event.target?.result as string }));
        };
        reader.readAsDataURL(e.target.files[0]);
      }
    };

    const handleSave = async () => {
      if (!selectedPet || !user) return;

      setLoading(true);
      try {
        const petRef = doc(db, "pets", selectedPet.id);
        let photoURL = localEditData.photo; // Use current photo by default

        if (imageFile) {
          photoURL = await uploadImage(imageFile);
        }

        await updateDoc(petRef, { ...localEditData, photo: photoURL });

        setShowEditProfile(false);
        isFormActiveRef.current = false;
        setImageFile(null);
      } catch (error) {
        console.error("Error updating pet profile:", error);
        setError("Failed to update pet profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    return (
      <Dialog open={showEditProfile} onOpenChange={(open) => {
        setShowEditProfile(open);
        if (!open) {
          isFormActiveRef.current = false;
          setImageFile(null); // Clear image file on close
        }
      }}>
        <DialogContent className="max-w-md animate-in fade-in zoom-in-95 slide-in-from-top-10">
          <DialogHeader>
            <DialogTitle>Edit Pet Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pet Photo</Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {localEditData.photo ? (
                    <img src={localEditData.photo} alt="Pet" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <Camera className="w-10 h-10 text-muted-foreground" />
                  )}
                </div>
                <Input type="file" accept="image/*" onChange={handleFileChange} />
              </div>
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={localEditData.name}
                onChange={(e) => setLocalEditData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Species</Label>
              <Select
                value={localEditData.species}
                onValueChange={(value) => setLocalEditData(prev => ({ ...prev, species: value }))}
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
            </div>
            <div>
              <Label>Breed</Label>
              <Input
                value={localEditData.breed}
                onChange={(e) => setLocalEditData(prev => ({ ...prev, breed: e.target.value }))}
              />
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={localEditData.dateOfBirth}
                onChange={(e) => setLocalEditData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
              />
            </div>
            <div>
              <Label>Weight (kg)</Label>
              <Input
                placeholder="e.g., 15, 7.5, 2.3"
                value={localEditData.weight}
                onChange={(e) => setLocalEditData(prev => ({ ...prev, weight: e.target.value }))}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Any additional notes about your pet..."
                value={localEditData.notes}
                onChange={(e) => setLocalEditData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave}>
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => {
                setShowEditProfile(false);
                isFormActiveRef.current = false;
                setImageFile(null);
              }}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const AddPetDialog = () => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        setImageFile(e.target.files[0]);
        // Optionally, display a preview
        const reader = new FileReader();
        reader.onload = (event) => {
          setNewPet(prev => ({ ...prev, photo: event.target?.result as string }));
        };
        reader.readAsDataURL(e.target.files[0]);
      }
    };

    return (
      <Dialog open={showAddPet} onOpenChange={(open) => {
        setShowAddPet(open);
        if (!open) {
          setImageFile(null); // Clear image file on close
          setNewPet({ name: "", species: "", breed: "", dateOfBirth: "", weight: "", notes: "", photo: "" }); // Reset form
        }
      }}>
        <DialogContent className="max-w-md animate-in fade-in zoom-in-95 slide-in-from-top-10">
          <DialogHeader>
            <DialogTitle>Add New Pet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pet Photo</Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {newPet.photo ? (
                    <img src={newPet.photo} alt="Pet Preview" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <Camera className="w-10 h-10 text-muted-foreground" />
                  )}
                </div>
                <Input type="file" accept="image/*" onChange={handleFileChange} />
              </div>
            </div>
            <div>
              <Label>Name *</Label>
              <Input
                value={newPet.name}
                onChange={(e) => setNewPet({ ...newPet, name: e.target.value })}
                placeholder="Enter pet's name"
              />
            </div>
            <div>
              <Label>Species *</Label>
              <Select
                value={newPet.species}
                onValueChange={(value) => setNewPet({ ...newPet, species: value })}
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
                onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })}
                placeholder="Enter breed"
              />
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={newPet.dateOfBirth}
                onChange={(e) => setNewPet({ ...newPet, dateOfBirth: e.target.value })}
              />
            </div>
            <div>
              <Label>Weight (kg)</Label>
              <Input
                placeholder="e.g., 15, 7.5, 2.3"
                value={newPet.weight}
                onChange={(e) => setNewPet({ ...newPet, weight: e.target.value })}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={newPet.notes}
                onChange={(e) => setNewPet({ ...newPet, notes: e.target.value })}
                placeholder="Any additional notes..."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddPet} disabled={!newPet.name || !newPet.species}>
                Add Pet
              </Button>
              <Button variant="outline" onClick={() => setShowAddPet(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
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

  return (
    <div className="min-h-screen bg-background pb-20">
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

      {error && (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      <div className="p-6 space-y-4">
        {pets.length > 0 ? (
          pets.map((pet) => (
            <PetCard
              key={pet.id}
              pet={pet}
              onEdit={() => {
                setSelectedPet(pet);
                setShowPetDetails(true);
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
          open={showPetDetails}
          onClose={() => {
            setShowPetDetails(false);
            setSelectedPet(null);
          }}
        />
      )}

      <AddRecordDialog />
      <EditRecordDialog /> {/* New Dialog */}
      <AddVaccineDialog />
      <EditVaccineDialog /> {/* New Dialog */}
      <EditProfileDialog />
      <AddPetDialog />
      <Navigation />
    </div>
  );
};

export default PetManagement;