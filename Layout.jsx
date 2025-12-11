import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/entities/User';
import { Tool } from '@/entities/Tool';
import { Favorite } from '@/entities/Favorite';
import {
  LayoutDashboard,
  Calculator,
  Scale,
  Calendar,
  Briefcase,
  Star,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronDown,
  ChevronRight,
  Rocket,
  TrendingUp,
  CreditCard,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import InitializeFinLegalTools from '@/components/InitializeFinLegalTools';
import AutoSync from '@/components/AutoSync';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [favoriteTools, setFavoriteTools] = useState([]);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await User.me();
        if (!userData?.id) {
          setUser(null);
        } else {
          setUser(userData);
          // Cargar favoritos del usuario
          await loadFavorites(userData.id);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const loadFavorites = async (userId) => {
    try {
      const userFavorites = await Favorite.filter({ userId });
      if (userFavorites.length > 0) {
        const toolIds = userFavorites.map(fav => fav.toolId);
        const allTools = await Tool.list();
        const favTools = allTools.filter(tool => toolIds.includes(tool.id));
        setFavoriteTools(favTools);
      }
    } catch (error) {
      console.error('Error cargando favoritos:', error);
    }
  };

  // Home se muestra sin layout
  if (currentPageName === 'Home') {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    await User.logout();
    navigate('/login');
  };

  const handleFavoriteToolClick = (toolId) => {
    navigate(createPageUrl('ToolViewer') + `?toolId=${toolId}&from=Favorites`);
    setIsMobileMenuOpen(false);
  };

  const toggleFavoritesMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavoritesOpen(!isFavoritesOpen);
  };

  // Separar herramientas favoritas por tipo
  const finFocusFavorites = favoriteTools.filter(tool => 
    tool.category?.includes('finfocus') || tool.category === 'free'
  );
  
  const finLegalFavorites = favoriteTools.filter(tool => 
    tool.category?.includes('finlegal')
  );

  const getRoleBadge = () => {
    const raw = user?.userRoles;
    let roles = [];

    if (Array.isArray(raw)) {
      roles = raw;
    } else if (typeof raw === 'string' && raw.trim() !== '') {
      try {
        const parsed = JSON.parse(raw);
        roles = Array.isArray(parsed) ? parsed : [raw.trim()];
      } catch {
        roles = raw.split(',').map(r => r.trim()).filter(Boolean);
      }
    }

    if (roles.length === 0) {
      return (
        <span className="bg-gray-500 text-white text-xs px-3 py-1 rounded-full font-medium">
          Sin Plan
        </span>
      );
    }

    const roleColors = {
      FINFOCUS_START:   { text: 'FINFOCUS START',    color: 'bg-[#0f2f4b]' },
      FINFOCUS:         { text: 'FINFOCUS',          color: 'bg-[#0f2f4b]' },
      FINFOCUS_PLUS:    { text: 'FINFOCUS PLUS',     color: 'bg-[#0f2f4b]' },

      FINFOCUS_PLATINO:  { text: 'FINFOCUS PLATINO', color: 'bg-[#0f2f4b]' },
      FINFOCUS_ADVANCED: { text: 'FINFOCUS ADVANCED', color: 'bg-[#0f2f4b]' },

      FINLEGAL_ESENCIAL: { text: 'FINLEGAL ESENCIAL', color: 'bg-[#0f2f4b]' },
      FINLEGAL_PLUS:     { text: 'FINLEGAL ESENCIAL+', color: 'bg-[#0f2f4b]' },
      FINLEGAL_TOTAL:    { text: 'FINLEGAL TOTAL',    color: 'bg-[#0f2f4b]' },
    };

    const roleTexts = roles
      .map(role => roleColors[role]?.text)
      .filter(Boolean)
      .join(' | ');

    if (!roleTexts) {
      return (
        <span className="bg-gray-500 text-white text-xs px-3 py-1 rounded-full font-medium">
          Sin Plan
        </span>
      );
    }

    const firstRoleColor = roleColors[roles[0]]?.color || 'bg-gray-600';

    return (
      <span className={`${firstRoleColor} text-white text-xs px-3 py-1 rounded-full font-medium`}>
        {roleTexts}
      </span>
    );
  };

  const menuItems = [
    { name: 'Inicio', icon: LayoutDashboard, path: 'Dashboard' },
    { name: 'FINFOCUS', icon: Rocket, path: 'FinFocus' },
    { name: 'FINLEGAL', icon: Scale, path: 'FinLegal' },
    { name: 'Favoritas', icon: Star, path: 'Favorites' },
    { name: 'Planes', icon: CreditCard, path: 'Planes' },
    { name: 'Contacto', icon: MessageSquare, path: 'Contact' },
  ];

  // Admin-only
  if (user?.role === 'admin') {
    menuItems.push({ name: 'Series estadísticas', icon: TrendingUp, path: 'SyncAdmin' });
    menuItems.push({ name: 'Admin Panel', icon: Shield, path: 'Admin' });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Carga de fuente Montserrat */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap"
      />

      <div
        className="min-h-screen bg-gray-50"
        style={{
          fontFamily: '"Montserrat", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <InitializeFinLegalTools />
        <AutoSync />

        {/* NAV SUPERIOR FIJO */}
        <nav className="bg-white border-b border-gray-200 fixed top-0 inset-x-0 h-16 z-50">
          <div className="px-4 sm:px-6 lg:px-8 h-full">
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="hidden lg:block p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <Menu className="h-6 w-6" />
                </button>
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>

                <div className="ml-4 flex items-center space-x-3">
                  <Rocket className="h-8 w-8 text-[#0f2f4b]" />
                  <span className="text-xl font-bold text-gray-900">FINFOCUS</span>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {getRoleBadge()}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-[#0f2f4b] flex items-center justify-center text-white font-semibold">
                        {user?.fullName?.charAt(0) || 'U'}
                      </div>
                      <span className="hidden md:block">{user?.fullName || 'Usuario'}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 z-[60]">
                    <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate(createPageUrl('Profile'))}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Configuración</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Cerrar Sesión</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </nav>

        {/* BODY GENERAL */}
        <div className="flex pt-16">
          {/* SIDEBAR DESKTOP */}
          <aside className="hidden lg:flex lg:flex-shrink-0">
            <div
              className={`flex flex-col border-r border-gray-200 bg-white overflow-y-auto transition-all duration-300 ${
                isSidebarOpen ? 'w-64' : 'w-0'
              }`}
            >
              {isSidebarOpen && (
                <nav className="flex-1 px-2 py-4 space-y-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPageName === item.path;
                    
                    // Si es el item de Favoritas, renderizar con submenú
                    if (item.name === 'Favoritas') {
                      return (
                        <div key={item.name}>
                          <div className="flex items-center">
                            <Link
                              to={createPageUrl(item.path)}
                              className={`flex-1 flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                                isActive
                                  ? 'bg-[#0f2f4b] text-white'
                                  : 'text-gray-700 hover:bg-[#0f2f4b]/10 hover:text-[#0f2f4b]'
                              }`}
                            >
                              <Icon
                                className={`mr-3 h-5 w-5 ${
                                  isActive ? 'text-white' : 'text-gray-500'
                                }`}
                              />
                              {item.name}
                            </Link>
                            {favoriteTools.length > 0 && (
                              <button
                                onClick={toggleFavoritesMenu}
                                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                              >
                                <ChevronRight 
                                  className={`h-4 w-4 text-gray-500 transition-transform ${
                                    isFavoritesOpen ? 'rotate-90' : ''
                                  }`}
                                />
                              </button>
                            )}
                          </div>
                          
                          {/* Submenú de favoritos */}
                          {isFavoritesOpen && favoriteTools.length > 0 && (
                            <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
                              {/* FINFOCUS */}
                              {finFocusFavorites.length > 0 && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 px-3 py-1 text-xs font-semibold text-gray-500">
                                    <Sparkles className="h-3 w-3" />
                                    FINFOCUS
                                  </div>
                                  {finFocusFavorites.map((tool) => (
                                    <button
                                      key={tool.id}
                                      onClick={() => handleFavoriteToolClick(tool.id)}
                                      className="w-full text-left px-3 py-1.5 text-sm text-gray-600 hover:bg-[#0f2f4b]/10 hover:text-[#0f2f4b] rounded-md transition-colors"
                                    >
                                      {tool.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                              
                              {/* FINLEGAL */}
                              {finLegalFavorites.length > 0 && (
                                <div className="space-y-1 mt-2">
                                  <div className="flex items-center gap-2 px-3 py-1 text-xs font-semibold text-gray-500">
                                    <Scale className="h-3 w-3" />
                                    FINLEGAL
                                  </div>
                                  {finLegalFavorites.map((tool) => (
                                    <button
                                      key={tool.id}
                                      onClick={() => handleFavoriteToolClick(tool.id)}
                                      className="w-full text-left px-3 py-1.5 text-sm text-gray-600 hover:bg-[#0f2f4b]/10 hover:text-[#0f2f4b] rounded-md transition-colors"
                                    >
                                      {tool.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }
                    
                    // Otros items del menú (sin cambios)
                    return (
                      <Link
                        key={item.name}
                        to={createPageUrl(item.path)}
                        className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                          isActive
                            ? 'bg-[#0f2f4b] text-white'
                            : 'text-gray-700 hover:bg-[#0f2f4b]/10 hover:text-[#0f2f4b]'
                        }`}
                      >
                        <Icon
                          className={`mr-3 h-5 w-5 ${
                            isActive ? 'text-white' : 'text-gray-500'
                          }`}
                        />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>
              )}
            </div>
          </aside>

          {/* MENU MOBILE */}
          {isMobileMenuOpen && (
            <div className="lg:hidden fixed inset-0 bg-gray-800 bg-opacity-75 z-40 pt-16">
              <div className="bg-white h-full w-64 shadow-xl overflow-y-auto">
                <nav className="mt-5 px-2 space-y-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPageName === item.path;
                    
                    // Si es el item de Favoritas, renderizar con submenú
                    if (item.name === 'Favoritas') {
                      return (
                        <div key={item.name}>
                          <div className="flex items-center">
                            <Link
                              to={createPageUrl(item.path)}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={`flex-1 flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                                isActive
                                  ? 'bg-[#0f2f4b]/10 text-[#0f2f4b]'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <Icon
                                className={`mr-3 h-5 w-5 ${
                                  isActive ? 'text-[#0f2f4b]' : 'text-gray-500'
                                }`}
                              />
                              {item.name}
                            </Link>
                            {favoriteTools.length > 0 && (
                              <button
                                onClick={toggleFavoritesMenu}
                                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                              >
                                <ChevronRight
                                  className={`h-4 w-4 text-gray-500 transition-transform ${
                                    isFavoritesOpen ? 'rotate-90' : ''
                                  }`}
                                />
                              </button>
                            )}
                          </div>

                          {/* Submenú de favoritos mobile */}
                          {isFavoritesOpen && favoriteTools.length > 0 && (
                            <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
                              {/* FINFOCUS */}
                              {finFocusFavorites.length > 0 && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 px-3 py-1 text-xs font-semibold text-gray-500">
                                    <Sparkles className="h-3 w-3" />
                                    FINFOCUS
                                  </div>
                                  {finFocusFavorites.map((tool) => (
                                    <button
                                      key={tool.id}
                                      onClick={() => handleFavoriteToolClick(tool.id)}
                                      className="w-full text-left px-3 py-1.5 text-sm text-gray-600 hover:bg-[#0f2f4b]/10 hover:text-[#0f2f4b] rounded-md transition-colors"
                                    >
                                      {tool.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                              
                              {/* FINLEGAL */}
                              {finLegalFavorites.length > 0 && (
                                <div className="space-y-1 mt-2">
                                  <div className="flex items-center gap-2 px-3 py-1 text-xs font-semibold text-gray-500">
                                    <Scale className="h-3 w-3" />
                                    FINLEGAL
                                  </div>
                                  {finLegalFavorites.map((tool) => (
                                    <button
                                      key={tool.id}
                                      onClick={() => handleFavoriteToolClick(tool.id)}
                                      className="w-full text-left px-3 py-1.5 text-sm text-gray-600 hover:bg-[#0f2f4b]/10 hover:text-[#0f2f4b] rounded-md transition-colors"
                                    >
                                      {tool.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }
                    
                    // Otros items del menú mobile
                    return (
                      <Link
                        key={item.name}
                        to={createPageUrl(item.path)}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                          isActive
                            ? 'bg-[#0f2f4b]/10 text-[#0f2f4b]'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon
                          className={`mr-3 h-5 w-5 ${
                            isActive ? 'text-[#0f2f4b]' : 'text-gray-500'
                          }`}
                        />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
          )}

          {/* MAIN CONTENT */}
          <main className="flex-1">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}