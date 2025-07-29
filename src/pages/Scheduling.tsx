"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Calendar, Clock, Bell, MapPin, Filter,  ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Navigation from "@/components/Navigation";
import CalendarMaker from "@/services/calendarmaker";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils"; 

// Firebase
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

// Import your centralized Firestore functions and types
import {
  getVetClinics,
  getUserPets,
  addAppointment,
  updateAppointment,
  deleteAppointment,
  getUserAppointments,
} from "@/services/firestore";

import {
  VetClinic,
  Pet,
  Appointment,
} from "@/types";

const Scheduling = () => {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState("calendar");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<any[]>([]);
  const [vetClinics, setVetClinics] = useState<VetClinic[]>([]);
  const [userPets, setUserPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddAppointment, setShowAddAppointment] = useState(false);
  const [newAppointment, setNewAppointment] = useState<Omit<Appointment, 'id' | 'createdAt' | 'userId' | 'status'>>({
    petId: "", title: "", date: "", time: "", type: "",
    vet: { id: "", trade_name: "", business_address: "" },
    vetId: "", notes: ""
  });
  const [showEditAppointment, setShowEditAppointment] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  const fetchAllData = useCallback(async (userId: string) => {
    try {
      const clinics = await getVetClinics();
      setVetClinics(clinics);

      const petsList = await getUserPets(userId);
      setUserPets(petsList);

      const fetchedAppointments = await getUserAppointments(userId);

      const isTodayOrFuture = (dateStr: string) => {
        if (!dateStr) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);
        return date >= today;
      };

      const augmentedAppointments: Appointment[] = fetchedAppointments
        .filter((apt) => isTodayOrFuture(apt.date))
        .map((apt) => {
          const pet = petsList.find((p) => p.id === apt.petId);
          const clinic = clinics.find((c) => c.id === (apt.vet?.id || apt.vetId));
          return {
            ...apt,
            petName: pet?.name || "Unknown Pet",
            vetName: clinic?.trade_name || apt.vet?.trade_name || "Unknown Vet",
            address: clinic?.business_address || apt.vet?.business_address || "",
            status: apt.status || "pending",
          };
        });

      setAppointments(augmentedAppointments);

      const reminders: any[] = [];
      petsList.forEach((pet) => {
        const petName = pet.name || "Unnamed Pet";
        if (Array.isArray(pet.vaccines)) {
          pet.vaccines.forEach((vaccine, index) => {
            if (vaccine.nextDue && isTodayOrFuture(vaccine.nextDue)) {
              reminders.push({
                id: `vax-${pet.id}-${index}`,
                title: `${petName}'s ${vaccine.name} vaccine due`,
                time: new Date(vaccine.nextDue).toLocaleDateString(),
                type: "medication",
              });
            }
          });
        }
      });
      setUpcomingReminders(reminders);
    } catch (err) {
      console.error("Error fetching all data:", err);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) fetchAllData(user.uid);
      else {
        setUserPets([]);
        setAppointments([]);
        setUpcomingReminders([]);
      }
    });

    return () => unsubscribe();
  }, [fetchAllData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-success text-success-foreground";
      case "pending":
        return "bg-warning text-warning-foreground";
      case "cancelled":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "checkup":
        return "🩺";
      case "vaccine":
        return "💉";
      case "dental":
        return "🦷";
      case "surgery":
        return "🏥";
      default:
        return "📅";
    }
  };

  const selectedDayAppointments = selectedDate
    ? appointments.filter((apt) => {
        const aptDate = new Date(apt.date);
        return (
          aptDate.getFullYear() === selectedDate.getFullYear() &&
          aptDate.getMonth() === selectedDate.getMonth() &&
          aptDate.getDate() === selectedDate.getDate()
        );
      })
    : [];

  const handleDeleteAppointment = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this appointment?")) return;
    try {
      setLoading(true);
      await deleteAppointment(id);
      setShowEditAppointment(false);
      setEditingAppointment(null);
      const user = auth.currentUser;
      if (user) await fetchAllData(user.uid);
    } catch (error) {
      console.error("Error deleting appointment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAppointment = async (id: string, data: Partial<Appointment>) => {
    try {
      if (!id || !data) {
        console.error("Invalid appointment data for update");
        return;
      }
      
      setLoading(true);
      await updateAppointment(id, data);
     
      setShowEditAppointment(false);
      setEditingAppointment(null);
      const user = auth.currentUser;
      if (user) await fetchAllData(user.uid);
    } catch (error) {
      console.error("Error updating appointment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAppointment = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error("User not authenticated");
        return;
      }

      const selectedVet = vetClinics.find((c) => c.id === newAppointment.vetId);

      const appointmentToSave: Omit<Appointment, 'id' | 'createdAt'> = {
        ...newAppointment,
        vet: {
          id: selectedVet?.id || "",
          trade_name: selectedVet?.trade_name || "",
          business_address: selectedVet?.business_address || "",
        },
        userId: user.uid,
        status: "pending",
      };

      await addAppointment(appointmentToSave);

      console.log("Appointment added successfully:", appointmentToSave);

      setShowAddAppointment(false);
      setNewAppointment({
        petId: "",
        title: "",
        date: "",
        time: "",
        type: "",
        vet: { id: "", trade_name: "", business_address: "" },
        vetId: "",
        notes: "",
      });

      await fetchAllData(user.uid);

    } catch (error) {
      console.error("Error adding appointment:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-primary p-6 rounded-b-3xl">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold">Schedule & Reminders</h1>
                <p className="text-white/90 text-sm">
                  Never miss an appointment
                </p>
              </div>
            </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="p-6 pb-0">
        <div className="flex gap-2 mb-4">
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("calendar")}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Calendar
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <Filter className="w-4 h-4 mr-2" />
            List
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <CalendarMaker
          appointments={appointments}
          setSelectedDate={setSelectedDate}
          selectedDate={selectedDate}
        />
      )}

      {/* Selected Date Section */}
      {selectedDate && (
        <div className="p-6 pt-4">
          <h2 className="font-semibold mb-4">
            Appointments on {selectedDate.toLocaleDateString()}
          </h2>
          {selectedDayAppointments.length > 0 ? (
            <div className="space-y-4">
              {selectedDayAppointments.map((appointment) => (
                <Card key={appointment.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{getTypeIcon(appointment.type)}</div>
                        <div>
                          <h3 className="font-semibold">{appointment.title}</h3>
                          <p className="text-sm text-muted-foreground">{appointment.petName}</p>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status || 'pending')}`}>
                        {appointment.status || 'pending'}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {appointment.time}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {appointment.vetName}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => {
                      setEditingAppointment(appointment);
                      setShowEditAppointment(true);
                    }}>
                      Reschedule
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No appointments on this day.</p>
          )}
        </div>
      )}

      {/* Upcoming Appointments */}
      <div className="p-6 pt-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Upcoming Appointments</h2>
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowAddAppointment(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
        <div className="space-y-4">
          {appointments.length > 0 ? (
            appointments.map((appointment) => (
              <Card key={appointment.id} className="hover:shadow-medium transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{getTypeIcon(appointment.type)}</div>
                      <div>
                        <h3 className="font-semibold">{appointment.title}</h3>
                        <p className="text-sm text-muted-foreground">{appointment.petName}</p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status || 'pending')}`}>
                      {appointment.status || 'pending'}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(appointment.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {appointment.time}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{appointment.vetName}</p>
                      <p className="text-muted-foreground">{appointment.address}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => {
                              setEditingAppointment(appointment);
                              setShowEditAppointment(true);
                            }}
                      >
                      Reschedule
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4">No upcoming appointments.</p>
          )}
        </div>
      </div>

      {/* Reminders */}
      <div className="p-6 pt-0">
        <h2 className="font-semibold mb-4">Reminders</h2>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {upcomingReminders.length > 0 ? (
                upcomingReminders.map((reminder) => (
                  <div key={reminder.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="w-7 h-7 text-warning" />
                      <div>
                        <p className="font-medium">{reminder.title}</p>
                        <p className="text-sm text-muted-foreground">{reminder.time}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No upcoming reminders.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Appointment Dialog */}
      <Dialog open={showAddAppointment} onOpenChange={setShowAddAppointment}>
        <DialogContent className="sm:max-w-4xl max-w-xs rounded-lg sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add New Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="petId">Pet</Label>
              <Select
                value={newAppointment.petId}
                onValueChange={(value) => {
                  setNewAppointment({
                    ...newAppointment,
                    petId: value,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pet" />
                </SelectTrigger>
                <SelectContent>
                  {userPets.map((pet) => (
                    <SelectItem key={pet.id} value={pet.id}>
                      {pet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="title">Appointment Title</Label>
              <Input
                id="title"
                value={newAppointment.title}
                onChange={(e) => setNewAppointment({ ...newAppointment, title: e.target.value })}
                placeholder="e.g., Annual Check-up"
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={newAppointment.type} onValueChange={(value) => setNewAppointment({ ...newAppointment, type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checkup">Check-up</SelectItem>
                  <SelectItem value="vaccine">Vaccination</SelectItem>
                  <SelectItem value="dental">Dental</SelectItem>
                  <SelectItem value="surgery">Surgery</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={newAppointment.date}
                  onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={newAppointment.time}
                  onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                />
              </div>
            </div>
            <div>
            <Label htmlFor="vetId">Veterinary Clinic</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-64 max-w-full justify-between">
                   <span className="truncate  block text-left">
                      {newAppointment.vet?.trade_name || "Select clinic"}
                    </span>
                   <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="max-w-full p-1">
                <Command>
                  <CommandInput placeholder="Search clinics..." />
                  <CommandList>
                    <CommandEmpty>No clinic found.</CommandEmpty>
                    {vetClinics.map((clinic) => (
                      <CommandItem
                        key={clinic.id}
                        value={clinic.trade_name}
                        onSelect={() => {
                          setNewAppointment({
                            ...newAppointment,
                            vetId: clinic.id,
                            vet: {
                              id: clinic.id,
                              trade_name: clinic.trade_name,
                              business_address: clinic.business_address,
                            },
                          });
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            newAppointment.vetId === clinic.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {clinic.trade_name}
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newAppointment.notes}
                onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                placeholder="Any special notes or instructions..."
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddAppointment(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddAppointment} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                Add Appointment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={showEditAppointment} onOpenChange={setShowEditAppointment}>
        <DialogContent className="sm:max-w-4xl max-w-xs rounded-lg sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
          </DialogHeader>
          {editingAppointment && (
            <div className="space-y-4">
              {/* Pet Select */}
              <div>
                <Label htmlFor="edit-petId">Pet</Label>
                <Select
                  value={editingAppointment.petId}
                  onValueChange={(value) =>
                    setEditingAppointment({ ...editingAppointment, petId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pet" />
                  </SelectTrigger>
                  <SelectContent>
                    {userPets.map((pet) => (
                      <SelectItem key={pet.id} value={pet.id}>
                        {pet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Title */}
              <div>
                <Label htmlFor="edit-title">Appointment Title</Label>
                <Input
                  id="edit-title"
                  value={editingAppointment.title}
                  onChange={(e) =>
                    setEditingAppointment({ ...editingAppointment, title: e.target.value })
                  }
                />
              </div>
              {/* Type */}
              <div>
                <Label htmlFor="edit-type">Type</Label>
                <Select
                  value={editingAppointment.type}
                  onValueChange={(value) =>
                    setEditingAppointment({ ...editingAppointment, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checkup">Check-up</SelectItem>
                    <SelectItem value="vaccine">Vaccination</SelectItem>
                    <SelectItem value="dental">Dental</SelectItem>
                    <SelectItem value="surgery">Surgery</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-date">Date</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editingAppointment.date}
                    onChange={(e) =>
                      setEditingAppointment({ ...editingAppointment, date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-time">Time</Label>
                  <Input
                    id="edit-time"
                    type="time"
                    value={editingAppointment.time}
                    onChange={(e) =>
                      setEditingAppointment({ ...editingAppointment, time: e.target.value })
                    }
                  />
                </div>
              </div>
              {/* Vet */}
              <div>
                <Label htmlFor="edit-vetId">Veterinary Clinic</Label>
                {/* <Label htmlFor="edit-vetId">Veterinarian</Label>
                <Select
                  value={editingAppointment.vetId}
                  onValueChange={(value) => {
                    const selected = vetClinics.find((c) => c.id === value);
                    setEditingAppointment({
                      ...editingAppointment,
                      vetId: value,
                      vet: selected
                        ? {
                            id: selected.id,
                            trade_name: selected.trade_name,
                            business_address: selected.business_address,
                          }
                        : { id: "", trade_name: "", business_address: "" },
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vet" />
                  </SelectTrigger>
                  <SelectContent>
                    {vetClinics.map((clinic) => (
                      <SelectItem key={clinic.id} value={clinic.id}>
                        {clinic.trade_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select> */}
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-64 max-w-full justify-between"
                    >
                      <span className="truncate block text-left">
                        {editingAppointment.vet?.trade_name || "Select vet"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="max-w-full p-1">
                    <Command>
                      <CommandInput placeholder="Search clinics..." />
                      <CommandList>
                        <CommandEmpty>No clinic found.</CommandEmpty>
                        {vetClinics.map((clinic) => (
                          <CommandItem
                            key={clinic.id}
                            value={clinic.trade_name}
                            onSelect={() => {
                              setEditingAppointment({
                                ...editingAppointment,
                                vetId: clinic.id,
                                vet: {
                                  id: clinic.id,
                                  trade_name: clinic.trade_name,
                                  business_address: clinic.business_address,
                                },
                              });
                              setOpen(false);
                            }}
                            className="break-words"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                editingAppointment.vetId === clinic.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {clinic.trade_name}
                          </CommandItem>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={editingAppointment.notes}
                  onChange={(e) =>
                    setEditingAppointment({ ...editingAppointment, notes: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button
                    variant="destructive"
                    onClick={() => {
                      if (!editingAppointment) return;
                      handleDeleteAppointment(editingAppointment.id);
                    }}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? "Deleting..." : "Delete"}
                </Button>
                <Button
                  onClick={() => {
                     if (!editingAppointment) return;
                     handleUpdateAppointment(editingAppointment.id, editingAppointment);
                  }}
                  disabled={loading}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Navigation />
    </div>
  );
};

export default Scheduling;