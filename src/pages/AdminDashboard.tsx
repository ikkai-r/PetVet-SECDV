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
import { AlertCircle, Plus, Edit, Trash2, Users, PawPrint, Shield, Activity, UserPlus, Stethoscope } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  createUserAccount, 
  getAllUsers, 
  getAllPets, 
  assignVetToPetOwner,
  getUserAssignments,
  deleteUser,
  updateUserRole,
  getSystemLogs ,
} from '@/services/adminService';
import { UserRole } from '@/types';
import { AccountSecurityManagement } from '@/components/AccountSecurityManagement';
import { BruteForceTestComponent } from '@/components/BruteForceTestComponent';
import Navigation from '@/components/Navigation';
import { db } from '@/lib/firebase';

interface User {
  id: string;
  email: string;
  role: UserRole;
  displayName?: string;
  createdAt: any;
  assignedVet?: string;
  assignedPetOwners?: string[];
}

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  ownerId: string;
  ownerEmail: string;
  medicalHistory?: string;
  createdAt: any;
}

interface VetAssignment {
  petOwnerId: string;
  petOwnerEmail: string;
  vetId: string;
  vetEmail: string;
  assignedAt: any;
}

export interface Log {
  id: string;
  action: string;
  details: string;
  userEmail?: string;
  timestamp: string;
  success: boolean;
}

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [assignments, setAssignments] = useState<VetAssignment[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form states
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'vet' as UserRole,
    displayName: ''
  });

  const [assignmentForm, setAssignmentForm] = useState({
    petOwnerId: '',
    vetId: ''
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [usersData, petsData, assignmentsData, logsData] = await Promise.all([
        getAllUsers(),
        getAllPets(),
        getUserAssignments(),
        getSystemLogs()
      ]);


      setUsers(usersData);
      setPets(petsData);
      setAssignments(assignmentsData);
      setLogs(logsData);
      
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

  const handleCreateUser = async () => {
    try {
      await createUserAccount(newUser.email, newUser.password, newUser.role, newUser.displayName);
      toast({
        title: "Success",
        description: `${newUser.role} account created successfully`
      });
      setNewUser({ email: '', password: '', role: 'vet', displayName: '' });
      setIsCreateDialogOpen(false);
      loadDashboardData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create user account",
        variant: "destructive"
      });
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      await updateUserRole(userId, newRole);
      toast({
        title: "Success",
        description: "User role updated successfully"
      });
      loadDashboardData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteUser(userId);
      toast({
        title: "Success",
        description: "User deleted successfully"
      });
      loadDashboardData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  const handleAssignVet = async () => {
    try {
      await assignVetToPetOwner(assignmentForm.petOwnerId, assignmentForm.vetId);
      toast({
        title: "Success",
        description: "Vet assigned to pet owner successfully"
      });
      setAssignmentForm({ petOwnerId: '', vetId: '' });
      setIsAssignDialogOpen(false);
      loadDashboardData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to assign vet",
        variant: "destructive"
      });
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'vet': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pet_owner': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const vets = users.filter(user => user.role === 'vet');
  const petOwners = users.filter(user => user.role === 'pet_owner');

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage users, pets, and system assignments</p>
        </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Admins</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Stethoscope className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Vets</p>
                <p className="text-2xl font-bold">{vets.length}</p>
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
                <p className="text-2xl font-bold">{petOwners.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <PawPrint className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Pets</p>
                <p className="text-2xl font-bold">{pets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="pets">Pet Data</TabsTrigger>
          <TabsTrigger value="assignments">Vet Assignments</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="logs">System Logs</TabsTrigger>
        </TabsList>

        {/* User Management Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>User Management</CardTitle>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New User Account</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                          placeholder="user@example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                          placeholder="Enter password"
                        />
                      </div>
                      <div>
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input
                          id="displayName"
                          value={newUser.displayName}
                          onChange={(e) => setNewUser({...newUser, displayName: e.target.value})}
                          placeholder="Dr. John Smith"
                        />
                      </div>
                      <div>
                        <Label htmlFor="role">Role</Label>
                        <Select 
                          value={newUser.role} 
                          onValueChange={(value: UserRole) => setNewUser({...newUser, role: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrator</SelectItem>
                            <SelectItem value="vet">Veterinarian</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateUser}>
                        Create Account
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.displayName || 'Not set'}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Select
                            value={user.role}
                            onValueChange={(newRole: UserRole) => handleUpdateUserRole(user.id, newRole)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="vet">Vet</SelectItem>
                              <SelectItem value="pet_owner">Pet Owner</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Pet Data Tab */}
        <TabsContent value="pets">
          <Card>
            <CardHeader>
              <CardTitle>Pet Data Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pet Name</TableHead>
                    <TableHead>Species</TableHead>
                    <TableHead>Breed</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Owner Email</TableHead>
                    <TableHead>Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pets.map((pet) => (
                    <TableRow key={pet.id}>
                      <TableCell className="font-medium">{pet.name}</TableCell>
                      <TableCell>{pet.species}</TableCell>
                      <TableCell>{pet.breed}</TableCell>
                      <TableCell>{pet.age} years</TableCell>
                      <TableCell>{pet.ownerEmail}</TableCell>
                      <TableCell>
                        {pet.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vet Assignments Tab */}
        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Vet Assignments</CardTitle>
                <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Assign Vet
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign Vet to Pet Owner</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="petOwner">Pet Owner</Label>
                        <Select 
                          value={assignmentForm.petOwnerId} 
                          onValueChange={(value) => setAssignmentForm({...assignmentForm, petOwnerId: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select pet owner" />
                          </SelectTrigger>
                          <SelectContent>
                            {petOwners.map((owner) => (
                              <SelectItem key={owner.id} value={owner.id}>
                                {owner.email} {owner.displayName && `(${owner.displayName})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="vet">Veterinarian</Label>
                        <Select 
                          value={assignmentForm.vetId} 
                          onValueChange={(value) => setAssignmentForm({...assignmentForm, vetId: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select veterinarian" />
                          </SelectTrigger>
                          <SelectContent>
                            {vets.map((vet) => (
                              <SelectItem key={vet.id} value={vet.id}>
                                {vet.email} {vet.displayName && `(${vet.displayName})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAssignVet}>
                        Assign Vet
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pet Owner</TableHead>
                    <TableHead>Assigned Vet</TableHead>
                    <TableHead>Assigned Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{assignment.petOwnerEmail}</TableCell>
                      <TableCell>{assignment.vetEmail}</TableCell>
                      <TableCell>
                        {assignment.assignedAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Management Tab */}
        <TabsContent value="security">
          <div className="space-y-6">
            <Tabs defaultValue="security-mgmt" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="security-mgmt">Security Management</TabsTrigger>
                <TabsTrigger value="test">Brute Force Test</TabsTrigger>
              </TabsList>
              
              <TabsContent value="security-mgmt">
                <AccountSecurityManagement />
              </TabsContent>
              
              <TabsContent value="test">
                <div className="container mx-auto p-6">
                  <h2 className="text-2xl font-bold mb-4">🧪 Brute Force Protection Testing</h2>
                  <p className="text-gray-600 mb-6">
                    Use this tool to test the brute force protection mechanism. Try failed logins to see the lockout in action.
                  </p>
                  <BruteForceTestComponent />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        {/* System Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>System Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.action}</TableCell>
                      <TableCell>{log.timestamp}</TableCell>
                      <TableCell>
                        {log.success ? (
                          <span className="text-green-600 font-semibold">Success</span>
                        ) : (
                          <span className="text-red-600 font-semibold">Failure</span>
                        )}
                      </TableCell>
                      <TableCell>{log.userEmail || 'N/A'}</TableCell>
                      <TableCell>{log.details || 'No details'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* <Alert>
                <Activity className="h-4 w-4" />
                <AlertDescription>
                  System logging interface is currently under development. This will include:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>User authentication logs</li>
                    <li>Failed login attempts</li>
                    <li>Account security events</li>
                    <li>System administration actions</li>
                    <li>Pet data modifications</li>
                  </ul>
                </AlertDescription>
              </Alert> */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
      
      <Navigation />
    </div>
  );
};

export default AdminDashboard;