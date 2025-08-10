import { AccountSecurityManagement } from '@/components/AccountSecurityManagement';
import { BruteForceTestComponent } from '@/components/BruteForceTestComponent';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AdminDashboard = () => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="security" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="security">Security Management</TabsTrigger>
          <TabsTrigger value="test">Brute Force Test</TabsTrigger>
        </TabsList>
        
        <TabsContent value="security">
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
  );
};

export default AdminDashboard;