import {
  LayoutDashboard,
  HeartPulse,
  Brain,
  ScanLine,
  MessageCircle,
  Trophy,
  MapPin,
  Settings,
  Activity,
  UtensilsCrossed,
  LogOut,
  Accessibility,
  Zap,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "AI Coach", url: "/coach", icon: MessageCircle },
  { title: "AI Diagnosis", url: "/diagnosis", icon: Brain },
  { title: "Plans", url: "/plans", icon: UtensilsCrossed },
];

const specializedItems = [
  { title: "SahayakAI", url: "/sahayak", icon: Accessibility },
  { title: "ManasMitra", url: "/manasmitra", icon: Zap },
];

const secondaryItems = [
  { title: "Achievements", url: "/achievements", icon: Trophy },
  { title: "Find Hospital", url: "/hospitals", icon: MapPin },
  { title: "Activity Log", url: "/activity", icon: Activity },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
            <Activity className="h-6 w-6 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-heading text-lg font-bold text-foreground leading-none">VaidyaAI</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 font-medium">Health Intelligence</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">Main Services</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-2 gap-1">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/"} 
                      className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-secondary/80 group" 
                      activeClassName="bg-secondary text-primary font-semibold shadow-sm"
                    >
                      <item.icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">Specialized Support</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-2 gap-1">
              {specializedItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-secondary/80 group" 
                      activeClassName="bg-secondary text-primary font-semibold shadow-sm"
                    >
                      <item.icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">Health Management</SidebarGroupLabel>
           <SidebarGroupContent>
            <SidebarMenu className="px-2 gap-1">
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-secondary/80 group" 
                      activeClassName="bg-secondary text-primary font-semibold shadow-sm"
                    >
                      <item.icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-destructive hover:bg-destructive/10 transition-all group"
            >
              <LogOut className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              {!collapsed && <span className="text-sm font-medium">Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!collapsed && (
          <div className="glass-card p-3 text-center mt-4">
            <p className="text-xs text-muted-foreground">Pro Tip</p>
            <p className="text-xs font-medium text-foreground mt-1">Stay hydrated! Drink 8 glasses of water daily.</p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
