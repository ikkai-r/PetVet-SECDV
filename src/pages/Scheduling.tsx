import { useState } from "react";
import { Plus, Calendar, Clock, Bell, MapPin, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Navigation from "@/components/Navigation";

const Scheduling = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddAppointment, setShowAddAppointment] = useState(false);
  const [viewMode, setViewMode] = useState("calendar");
  const [newAppointment, setNewAppointment] = useState({
    petId: "",
    title: "",
    date: "",
    time: "",
    type: "",
    vetId: "",
    notes: "",
  });

  // Mock data - in real app, this would come from Supabase
  const appointments = [
    {
      id: "1",
      petName: "Buddy",
      title: "Annual Check-up",
      date: "2024-12-15",
      time: "10:00 AM",
      type: "checkup",
      vetName: "Happy Paws Veterinary Clinic",
      address: "123 Main St, Downtown",
      status: "confirmed",
    },
    {
      id: "2",
      petName: "Whiskers",
      title: "Vaccination",
      date: "2024-12-20",
      time: "2:30 PM",
      type: "vaccine",
      vetName: "City Animal Hospital",
      address: "456 Oak Ave, Midtown",
      status: "pending",
    },
    {
      id: "3",
      petName: "Buddy",
      title: "Dental Cleaning",
      date: "2024-12-25",
      time: "9:00 AM",
      type: "dental",
      vetName: "Happy Paws Veterinary Clinic",
      address: "123 Main St, Downtown",
      status: "confirmed",
    },
  ];

  const upcomingReminders = [
    { id: "1", title: "Buddy's Check-up Tomorrow", time: "10:00 AM", type: "appointment" },
    { id: "2", title: "Whiskers Flea Treatment", time: "Next week", type: "medication" },
    { id: "3", title: "Refill Buddy's Medication", time: "In 3 days", type: "medication" },
  ];

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

  const handleAddAppointment = () => {
    console.log("Adding appointment:", newAppointment);
    setShowAddAppointment(false);
    setNewAppointment({
      petId: "",
      title: "",
      date: "",
      time: "",
      type: "",
      vetId: "",
      notes: "",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-secondary p-6 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <h1 className="text-white font-bold">Schedule & Reminders</h1>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => setShowAddAppointment(true)}
            className="bg-white/20 text-white hover:bg-white/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
        <p className="text-white/90 mt-2">Never miss an appointment</p>
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
        <div className="p-6 pt-0">
          <div className="bg-card rounded-2xl p-4 mb-6">
            <h2 className="font-semibold mb-4">December 2024</h2>
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="p-2 font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                const hasAppointment = appointments.some(
                  (apt) => new Date(apt.date).getDate() === day
                );
                return (
                  <div
                    key={day}
                    className={`p-2 rounded-lg relative ${
                      hasAppointment ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}
                  >
                    {day}
                    {hasAppointment && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Appointments */}
      <div className="p-6 pt-0">
        <h2 className="font-semibold mb-4">Upcoming Appointments</h2>
        <div className="space-y-4">
          {appointments.map((appointment) => (
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
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                    {appointment.status}
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
                  <Button variant="outline" size="sm" className="flex-1">
                    Reschedule
                  </Button>
                  <Button size="sm" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Reminders */}
      <div className="p-6 pt-0">
        <h2 className="font-semibold mb-4">Reminders</h2>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {upcomingReminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-warning" />
                    <div>
                      <p className="font-medium">{reminder.title}</p>
                      <p className="text-sm text-muted-foreground">{reminder.time}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Dismiss
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Appointment Dialog */}
      <Dialog open={showAddAppointment} onOpenChange={setShowAddAppointment}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="petId">Pet</Label>
              <Select value={newAppointment.petId} onValueChange={(value) => setNewAppointment({ ...newAppointment, petId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Buddy</SelectItem>
                  <SelectItem value="2">Whiskers</SelectItem>
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
              <Label htmlFor="vetId">Veterinarian</Label>
              <Select value={newAppointment.vetId} onValueChange={(value) => setNewAppointment({ ...newAppointment, vetId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Happy Paws Veterinary Clinic</SelectItem>
                  <SelectItem value="2">City Animal Hospital</SelectItem>
                  <SelectItem value="3">Furry Friends Vet</SelectItem>
                </SelectContent>
              </Select>
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

      <Navigation />
    </div>
  );
};

export default Scheduling;