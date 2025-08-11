import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Stethoscope, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  PawPrint, 
  FileText, 
  Activity,
  CalendarIcon,
  Search,
  Heart
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import Navigation from '@/components/Navigation';
import {
  getAssignedPets,
  getAssignedPetOwners,
  updatePetDetails,
  getPetMedicalRecords,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
  getVetStatistics,
  VetPet,
  MedicalRecord,
  AssignedPetOwner
} from '@/services/vetService';

const VetDashboard: React.FC = () => {
  const [pets, setPets] = useState<VetPet[]>([]);
  const [petOwners, setPetOwners] = useState<AssignedPetOwner[]>([]);
  const [selectedPet, setSelectedPet] = useState<VetPet | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [statistics, setStatistics] = useState({
    totalPets: 0,
    totalOwners: 0,
    totalRecords: 0,
    recentRecords: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pets');
  
  // Dialog states
  const [isPetEditDialogOpen, setIsPetEditDialogOpen] = useState(false);
  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Form states
  const [petEditForm, setPetEditForm] = useState<Partial<VetPet>>({});
  const [recordForm, setRecordForm] = useState({
    visitType: 'routine' as const,
    symptoms: '',
    diagnosis: '',
    treatment: '',
    medications: '',
    notes: '',
    weight: '',
    temperature: '',
    heartRate: '',
    cost: '',
    nextVisitDate: undefined as Date | undefined
  });

  useEffect(() => {
    if (user?.uid) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      const [petsData, ownersData, statsData] = await Promise.all([
        getAssignedPets(user.uid),
        getAssignedPetOwners(user.uid),
        getVetStatistics(user.uid)
      ]);
      
      setPets(petsData);
      setPetOwners(ownersData);
      setStatistics(statsData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPetMedicalRecords = async (petId: string) => {
    try {
      const records = await getPetMedicalRecords(petId);
      setMedicalRecords(records);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load medical records",
        variant: "destructive"
      });
    }
  };

  const handleEditPet = (pet: VetPet) => {
    setSelectedPet(pet);
    setPetEditForm({
      weight: pet.weight,
      allergies: pet.allergies,
      medications: pet.medications,
      microchipId: pet.microchipId
    });
    setIsPetEditDialogOpen(true);
  };

  const handleUpdatePet = async () => {
    if (!selectedPet) return;

    try {
      await updatePetDetails(selectedPet.id, petEditForm);
      toast({
        title: "Success",
        description: "Pet details updated successfully"
      });
      setIsPetEditDialogOpen(false);
      loadDashboardData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update pet details",
        variant: "destructive"
      });
    }
  };

  const handleCreateRecord = async () => {
    if (!selectedPet || !user?.uid) return;

    try {
      await createMedicalRecord(selectedPet.id, user.uid, {
        ...recordForm,
        date: new Date(),
        weight: recordForm.weight ? parseFloat(recordForm.weight) : undefined,
        temperature: recordForm.temperature ? parseFloat(recordForm.temperature) : undefined,
        heartRate: recordForm.heartRate ? parseInt(recordForm.heartRate) : undefined,
        cost: recordForm.cost ? parseFloat(recordForm.cost) : undefined,
        nextVisitDate: recordForm.nextVisitDate ? new Date(recordForm.nextVisitDate) : undefined
      } as any);
      
      toast({
        title: "Success",
        description: "Medical record created successfully"
      });
      
      setIsRecordDialogOpen(false);
      resetRecordForm();
      loadPetMedicalRecords(selectedPet.id);
      loadDashboardData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create medical record",
        variant: "destructive"
      });
    }
  };

  const handleUpdateRecord = async () => {
    if (!editingRecord) return;

    try {
      await updateMedicalRecord(editingRecord.id, {
        ...recordForm,
        weight: recordForm.weight ? parseFloat(recordForm.weight) : undefined,
        temperature: recordForm.temperature ? parseFloat(recordForm.temperature) : undefined,
        heartRate: recordForm.heartRate ? parseInt(recordForm.heartRate) : undefined,
        cost: recordForm.cost ? parseFloat(recordForm.cost) : undefined,
        nextVisitDate: recordForm.nextVisitDate ? new Date(recordForm.nextVisitDate) : undefined
      });
      
      toast({
        title: "Success",
        description: "Medical record updated successfully"
      });
      
      setIsRecordDialogOpen(false);
      setEditingRecord(null);
      resetRecordForm();
      if (selectedPet) {
        loadPetMedicalRecords(selectedPet.id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update medical record",
        variant: "destructive"
      });
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!window.confirm('Are you sure you want to delete this medical record?')) {
      return;
    }

    try {
      await deleteMedicalRecord(recordId);
      toast({
        title: "Success",
        description: "Medical record deleted successfully"
      });
      
      if (selectedPet) {
        loadPetMedicalRecords(selectedPet.id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete medical record",
        variant: "destructive"
      });
    }
  };

  const resetRecordForm = () => {
    setRecordForm({
      visitType: 'routine',
      symptoms: '',
      diagnosis: '',
      treatment: '',
      medications: '',
      notes: '',
      weight: '',
      temperature: '',
      heartRate: '',
      cost: '',
      nextVisitDate: undefined
    });
  };

  const openNewRecordDialog = (pet: VetPet) => {
    setSelectedPet(pet);
    resetRecordForm();
    setEditingRecord(null);
    setIsRecordDialogOpen(true);
  };

  const openEditRecordDialog = (record: MedicalRecord) => {
    setEditingRecord(record);
    setRecordForm({
      visitType: record.visitType,
      symptoms: record.symptoms,
      diagnosis: record.diagnosis,
      treatment: record.treatment,
      medications: record.medications,
      notes: record.notes,
      weight: record.weight?.toString() || '',
      temperature: record.temperature?.toString() || '',
      heartRate: record.heartRate?.toString() || '',
      cost: record.cost?.toString() || '',
      nextVisitDate: record.nextVisitDate?.toDate()
    });
    setIsRecordDialogOpen(true);
  };

  const filteredPets = pets.filter(pet =>
    pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pet.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pet.species.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Veterinarian Dashboard</h1>
          <p className="text-gray-600">Manage your assigned pets and medical records</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <PawPrint className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Assigned Pets</p>
                  <p className="text-2xl font-bold">{statistics.totalPets}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pet Owners</p>
                  <p className="text-2xl font-bold">{statistics.totalOwners}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Records</p>
                  <p className="text-2xl font-bold">{statistics.totalRecords}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Recent (30d)</p>
                  <p className="text-2xl font-bold">{statistics.recentRecords}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pets">Pet Management</TabsTrigger>
            <TabsTrigger value="records">Medical Records</TabsTrigger>
            <TabsTrigger value="owners">Pet Owners</TabsTrigger>
          </TabsList>

          {/* Pet Management Tab */}
          <TabsContent value="pets">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Assigned Pets</CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search pets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pet Name</TableHead>
                      <TableHead>Species/Breed</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPets.map((pet) => (
                      <TableRow key={pet.id}>
                        <TableCell className="font-medium">{pet.name}</TableCell>
                        <TableCell>{pet.species} - {pet.breed}</TableCell>
                        <TableCell>{pet.age ? `${pet.age} years` : 'Unknown'}</TableCell>
                        <TableCell>{pet.ownerName || pet.ownerEmail}</TableCell>
                        <TableCell>{pet.weight ? `${pet.weight} kg` : 'Not set'}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPet(pet)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPet(pet);
                                loadPetMedicalRecords(pet.id);
                                setActiveTab('records');
                              }}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => openNewRecordDialog(pet)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medical Records Tab */}
          <TabsContent value="records">
            <Card>
              <CardHeader>
                <CardTitle>
                  Medical Records
                  {selectedPet && (
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      for {selectedPet.name}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPet ? (
                  <div>
                    <div className="mb-4">
                      <Button onClick={() => openNewRecordDialog(selectedPet)}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Record
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Visit Type</TableHead>
                          <TableHead>Diagnosis</TableHead>
                          <TableHead>Treatment</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {medicalRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>
                              {format(record.date.toDate(), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {record.visitType}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {record.diagnosis}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {record.treatment}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditRecordDialog(record)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteRecord(record.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <Alert>
                    <Heart className="h-4 w-4" />
                    <AlertDescription>
                      Select a pet from the Pet Management tab to view and manage medical records.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pet Owners Tab */}
          <TabsContent value="owners">
            <Card>
              <CardHeader>
                <CardTitle>Assigned Pet Owners</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Owner Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Pets Count</TableHead>
                      <TableHead>Assigned Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {petOwners.map((owner) => (
                      <TableRow key={owner.id}>
                        <TableCell className="font-medium">
                          {owner.displayName || 'Not set'}
                        </TableCell>
                        <TableCell>{owner.email}</TableCell>
                        <TableCell>{owner.petsCount}</TableCell>
                        <TableCell>
                          {format(owner.assignedAt.toDate(), 'MMM dd, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Pet Edit Dialog */}
        <Dialog open={isPetEditDialogOpen} onOpenChange={setIsPetEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Pet Details - {selectedPet?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={petEditForm.weight || ''}
                  onChange={(e) => setPetEditForm({
                    ...petEditForm,
                    weight: parseFloat(e.target.value) || 0
                  })}
                />
              </div>
              <div>
                <Label htmlFor="microchipId">Microchip ID</Label>
                <Input
                  id="microchipId"
                  value={petEditForm.microchipId || ''}
                  onChange={(e) => setPetEditForm({
                    ...petEditForm,
                    microchipId: e.target.value
                  })}
                />
              </div>
              <div>
                <Label htmlFor="allergies">Allergies (comma separated)</Label>
                <Input
                  id="allergies"
                  value={petEditForm.allergies?.join(', ') || ''}
                  onChange={(e) => setPetEditForm({
                    ...petEditForm,
                    allergies: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                  })}
                />
              </div>
              <div>
                <Label htmlFor="medications">Current Medications (comma separated)</Label>
                <Input
                  id="medications"
                  value={petEditForm.medications?.join(', ') || ''}
                  onChange={(e) => setPetEditForm({
                    ...petEditForm,
                    medications: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                  })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPetEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdatePet}>
                Update Pet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Medical Record Dialog */}
        <Dialog open={isRecordDialogOpen} onOpenChange={setIsRecordDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRecord ? 'Edit Medical Record' : 'New Medical Record'}
                {selectedPet && ` - ${selectedPet.name}`}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="visitType">Visit Type</Label>
                  <Select
                    value={recordForm.visitType}
                    onValueChange={(value: any) => setRecordForm({
                      ...recordForm,
                      visitType: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                      <SelectItem value="follow-up">Follow-up</SelectItem>
                      <SelectItem value="vaccination">Vaccination</SelectItem>
                      <SelectItem value="surgery">Surgery</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={recordForm.weight}
                    onChange={(e) => setRecordForm({
                      ...recordForm,
                      weight: e.target.value
                    })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="temperature">Temperature (°C)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    value={recordForm.temperature}
                    onChange={(e) => setRecordForm({
                      ...recordForm,
                      temperature: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
                  <Input
                    id="heartRate"
                    type="number"
                    value={recordForm.heartRate}
                    onChange={(e) => setRecordForm({
                      ...recordForm,
                      heartRate: e.target.value
                    })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="symptoms">Symptoms</Label>
                <Textarea
                  id="symptoms"
                  value={recordForm.symptoms}
                  onChange={(e) => setRecordForm({
                    ...recordForm,
                    symptoms: e.target.value
                  })}
                  placeholder="Describe the symptoms observed..."
                />
              </div>

              <div>
                <Label htmlFor="diagnosis">Diagnosis</Label>
                <Textarea
                  id="diagnosis"
                  value={recordForm.diagnosis}
                  onChange={(e) => setRecordForm({
                    ...recordForm,
                    diagnosis: e.target.value
                  })}
                  placeholder="Enter the diagnosis..."
                />
              </div>

              <div>
                <Label htmlFor="treatment">Treatment</Label>
                <Textarea
                  id="treatment"
                  value={recordForm.treatment}
                  onChange={(e) => setRecordForm({
                    ...recordForm,
                    treatment: e.target.value
                  })}
                  placeholder="Describe the treatment provided..."
                />
              </div>

              <div>
                <Label htmlFor="medications">Medications Prescribed</Label>
                <Textarea
                  id="medications"
                  value={recordForm.medications}
                  onChange={(e) => setRecordForm({
                    ...recordForm,
                    medications: e.target.value
                  })}
                  placeholder="List medications and dosages..."
                />
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={recordForm.notes}
                  onChange={(e) => setRecordForm({
                    ...recordForm,
                    notes: e.target.value
                  })}
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cost">Cost ($)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={recordForm.cost}
                    onChange={(e) => setRecordForm({
                      ...recordForm,
                      cost: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label>Next Visit Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {recordForm.nextVisitDate ? (
                          format(recordForm.nextVisitDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={recordForm.nextVisitDate}
                        onSelect={(date) => setRecordForm({
                          ...recordForm,
                          nextVisitDate: date
                        })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsRecordDialogOpen(false);
                setEditingRecord(null);
                resetRecordForm();
              }}>
                Cancel
              </Button>
              <Button onClick={editingRecord ? handleUpdateRecord : handleCreateRecord}>
                {editingRecord ? 'Update Record' : 'Create Record'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Navigation />
    </div>
  );
};

export default VetDashboard;
