import { LayoutDashboard, Store, FolderOpen, FileText, Users, ScrollText, LogOut, ChevronLeft } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const ADMIN_NAV = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Mercados', url: '/admin/markets', icon: Store },
  { title: 'Categorias', url: '/admin/categories', icon: FolderOpen },
  { title: 'Conteúdo', url: '/admin/content', icon: FileText },
  { title: 'Usuários', url: '/admin/users', icon: Users },
  { title: 'Logs', url: '/admin/logs', icon: ScrollText },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-3">
            {!collapsed && (
              <span className="font-display font-bold text-lg tracking-tight">
                <span className="text-primary">FUTRA</span> <span className="text-muted-foreground text-xs font-normal">Admin</span>
              </span>
            )}
            {collapsed && <span className="text-primary font-bold">F</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ADMIN_NAV.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/admin'}
                      className="hover:bg-muted/50 flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 space-y-1">
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => navigate('/')}>
          <ChevronLeft className="h-4 w-4 mr-2" /> {!collapsed && 'Voltar ao site'}
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={async () => { await signOut(); navigate('/'); }}>
          <LogOut className="h-4 w-4 mr-2" /> {!collapsed && 'Sair'}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
