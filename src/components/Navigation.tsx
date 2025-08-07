import { Home, MapPin, Heart, Calendar, MessageSquare, User, Stethoscope, Shield, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Navigation = () => {
  const location = useLocation();
  const { user } = useAuth();

  // Base navigation items for all users
  const baseNavItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/account", icon: User, label: "Account" },
  ];

  // Role-specific navigation items
  const petOwnerItems = [
    { path: "/pets", icon: Heart, label: "Pets" },
  ];

  const vetItems = [
    { path: "/vetdb", icon: Stethoscope, label: "Dashboard" },
  ];

  const adminItems = [
    { path: "/admindb", icon: Shield, label: "Admin" },
  ];

  // Combine navigation items based on user role
  let navItems = [...baseNavItems];
  
  if (user) {
    switch (user.role) {
      case 'pet_owner':
        navItems = [baseNavItems[0], ...petOwnerItems, baseNavItems[1]];
        break;
      case 'vet':
        navItems = [baseNavItems[0], ...vetItems, baseNavItems[1]];
        break;
      case 'admin':
        navItems = [baseNavItems[0], ...adminItems, baseNavItems[1]];
        break;
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-2 z-50">
      <div className="flex items-center max-w-md mx-auto w-full">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 flex flex-col items-center justify-center py-1 nav-item ${isActive ? "active" : ""}`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-xs mt-1 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;