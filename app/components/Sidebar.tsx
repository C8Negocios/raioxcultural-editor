'use client';

import { useState, useEffect, CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, MessageCircle, Menu, X, ChevronDown,
  Building2, BarChart3, KeyRound, Kanban, Home,
  BookUser, DollarSign, UserCog, PartyPopper, ClipboardList,
  LogOut, Users, ScanSearch, GraduationCap, Settings, Clapperboard
} from 'lucide-react';

// ── Mapa de ícones (nunca muda — só adicionar novos aqui se necessário) ──────
const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Building2, BarChart3, KeyRound, Kanban, Home,
  BookUser, DollarSign, UserCog, PartyPopper, ClipboardList,
  LogOut, Users, ScanSearch, GraduationCap, Settings, MessageCircle, Clapperboard
};

// ── Tipos ──────────────────────────────────────────────────────────────────
type MenuItem = { name: string; href: string; icon: string; sub: string };
type MenuModule = { key: string; subtitle: string; color: string; items: MenuItem[] };

// ── URL da API de menu ────────────────────────────────────────────────────
const MENU_API = 'https://login.codigooito.com.br/menu';

// ── Fallback local (caso a API esteja fora) ───────────────────────────────
const FALLBACK: MenuModule[] = [
  {
    key: 'Administrativo', subtitle: 'Gestão interna', color: '#FBBF24',
    items: [
      { name: 'Financeiro',     href: 'https://administrativo.codigooito.com.br/financeiro',      icon: 'DollarSign',    sub: 'MRR & faturamento' },
      { name: 'Grupos',         href: 'https://administrativo.codigooito.com.br/controle-grupos', icon: 'Users',         sub: 'Controle de grupos' },
      { name: 'Churn',          href: 'https://administrativo.codigooito.com.br/pedidos-churn',   icon: 'LogOut',        sub: 'Pedidos de churn' },
      { name: 'Central Equipe', href: 'https://administrativo.codigooito.com.br/central-equipe',  icon: 'ClipboardList', sub: 'Tarefas da equipe' },
      { name: 'Raio X',         href: 'https://administrativo.codigooito.com.br/raio-x',          icon: 'ScanSearch',    sub: 'Raio-X de Processos' },
      { name: 'Treinamentos',   href: 'https://administrativo.codigooito.com.br/treinamentos',    icon: 'GraduationCap', sub: 'Calendário de treinos' },
      { name: 'Usuários',       href: 'https://login.codigooito.com.br/usuarios',                 icon: 'UserCog',       sub: 'Gestão de acesso' },
      { name: 'Eventos',        href: 'https://administrativo.codigooito.com.br/eventos',         icon: 'PartyPopper',   sub: 'Calendário' },
    ],
  },
  {
    key: 'Relacionamento', subtitle: 'Customer Success', color: '#4B8BF5',
    items: [
      { name: 'Dashboard',  href: 'https://relacionamento.codigooito.com.br/',           icon: 'LayoutDashboard', sub: 'Visão geral' },
      { name: 'Empresas',   href: 'https://relacionamento.codigooito.com.br/empresas',   icon: 'Building2',       sub: 'Engajamento' },
      { name: 'Gestão',     href: 'https://relacionamento.codigooito.com.br/gestao',     icon: 'KeyRound',        sub: 'Portais & Links' },
      { name: 'Relatórios', href: 'https://relacionamento.codigooito.com.br/relatorios', icon: 'BarChart3',       sub: 'PDFs & Envios' },
    ],
  },
  {
    key: 'Sales Pipeline', subtitle: 'Comercial', color: '#34D399',
    items: [
      { name: 'Dashboard', href: 'https://sales.codigooito.com.br/',         icon: 'LayoutDashboard', sub: 'Visão geral' },
      { name: 'Contatos',  href: 'https://sales.codigooito.com.br/contacts', icon: 'BookUser',        sub: 'Funil + orgânicos' },
      { name: 'Leads',     href: 'https://sales.codigooito.com.br/leads',    icon: 'Users',           sub: 'CRM · Typeform' },
      { name: 'Pipeline',  href: 'https://sales.codigooito.com.br/pipeline', icon: 'Kanban',          sub: 'Funil Raio-X' },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────
const WA_URL = 'https://whatsapp.codigooito.com.br';

function getUserNameFromCookie(): string {
  if (typeof document === 'undefined') return '';
  try {
    const token = document.cookie.split('; ').find(r => r.startsWith('c8club_token='))?.split('=')[1];
    if (!token) return '';
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder('utf-8').decode(bytes));
    return payload?.nome?.split(' ')[0] ?? payload?.name?.split(' ')[0] ?? '';
  } catch { return ''; }
}

// ── NavItem ───────────────────────────────────────────────────────────────
function NavItem({ item, active, accentColor }: {
  item: MenuItem; active: boolean; accentColor: string;
}) {
  const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
  const ext = item.href.startsWith('http');
  const style: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '9px 14px', borderRadius: 10,
    background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
    textDecoration: 'none', cursor: 'pointer',
    transition: 'background 0.15s', position: 'relative',
  };
  const inner = (
    <>
      {active && <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 18, borderRadius: 99, background: accentColor }} />}
      <Icon size={15} style={{ flexShrink: 0, color: active ? accentColor : 'rgba(255,255,255,0.4)' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.2, color: active ? '#fff' : 'rgba(255,255,255,0.75)' }}>{item.name}</p>
        <p style={{ fontSize: 10, margin: 0, lineHeight: 1.3, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{item.sub}</p>
      </div>
      {ext && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>↗</span>}
    </>
  );
  if (ext) return <a href={item.href} style={style} target="_self">{inner}</a>;
  return <Link href={item.href} style={style}>{inner}</Link>;
}

// ── Props do Sidebar ──────────────────────────────────────────────────────
interface SidebarProps {
  /** Label do módulo atual — abre ele por padrão (ex: 'Administrativo') */
  activeModule?: string;
  /** Título mostrado no cabeçalho (ex: 'Administrativo') */
  title?: string;
  /** Subtítulo mostrado no cabeçalho (ex: 'Gestão interna') */
  subtitle?: string;
  /** ID único para CSS (ex: 'adm', 'rel', 'wa') — evita conflitos entre apps */
  appId?: string;
  /** URL de logout custom (default: /login) */
  logoutUrl?: string;
}

// ── Sidebar (componente universal) ───────────────────────────────────────
export default function Sidebar({
  activeModule = 'Estúdio',
  title = 'C8 Studio',
  subtitle = 'Produção Audiovisual',
  appId = 'studio',
  logoutUrl = 'https://login.codigooito.com.br/login',
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [modules, setModules] = useState<MenuModule[]>(FALLBACK);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [userName, setUserName] = useState('');

  // Busca o menu centralizado
  useEffect(() => {
    fetch(MENU_API)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setModules(data);
          // Abre o módulo ativo por padrão (ou o primeiro)
          const defaultOpen: Record<string, boolean> = {};
          data.forEach((m: MenuModule) => {
            defaultOpen[m.key] = activeModule ? m.key === activeModule : false;
          });
          if (activeModule && !data.find((m: MenuModule) => m.key === activeModule)) {
            defaultOpen[data[0].key] = true;
          }
          setOpen(defaultOpen);
        }
      })
      .catch(() => {/* usa fallback */});
  }, [activeModule]);

  useEffect(() => {
    // Inicializa open com fallback antes do fetch
    const defaultOpen: Record<string, boolean> = {};
    FALLBACK.forEach(m => { defaultOpen[m.key] = activeModule ? m.key === activeModule : false; });
    setOpen(defaultOpen);
  }, [activeModule]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => { setUserName(getUserNameFromCookie()); }, []);

  // Detecção de item ativo: URL absoluta → compara com window.location
  const isActive = (href: string) => {
    if (!href.startsWith('http')) {
      // URL relativa — usa pathname do Next.js
      return href === '/' ? pathname === '/' : pathname.startsWith(href);
    }
    // URL absoluta — compara com a URL do browser
    if (typeof window === 'undefined') return false;
    return window.location.href.startsWith(href);
  };

  const toggle = (key: string) => setOpen(p => ({ ...p, [key]: !p[key] }));

  function handleLogout() {
    document.cookie = 'c8club_token=; path=/; max-age=0; domain=.codigooito.com.br';
    window.location.href = logoutUrl;
  }

  const waActive = typeof window !== 'undefined' && window.location.href.includes('whatsapp.codigooito.com.br');
  const navId = `c8nav-${appId}`;

  const sidebar = (
    <aside style={{
      width: 240, height: '100%', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg, #00205B 0%, #001848 100%)',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <style>{`
        #${navId} a:hover, #${navId} button.nav-btn:hover { background: rgba(255,255,255,0.08) !important; }
        #c8-logout-${appId}:hover { background: rgba(239,68,68,0.12) !important; color: #FCA5A5 !important; }
        #c8-wa-${appId}:hover { background: rgba(37,211,102,0.15) !important; }
        #c8-home-${appId}:hover { background: rgba(255,255,255,0.08) !important; }
      `}</style>

      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', margin: '0 0 6px' }}>C8CLUB</p>
        <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 2px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{title}</p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{subtitle}</p>
        {userName && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
              {userName[0]?.toUpperCase()}
            </div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{userName}</span>
          </div>
        )}
      </div>

      {/* WhatsApp + Início */}
      <div style={{ padding: '10px 10px 0', flexShrink: 0 }}>
        <a id={`c8-wa-${appId}`} href={WA_URL} target="_self" style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 14px', borderRadius: 12,
          background: waActive ? 'rgba(37,211,102,0.12)' : 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(37,211,102,0.2)',
          textDecoration: 'none', cursor: 'pointer', transition: 'background 0.15s',
        }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(37,211,102,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MessageCircle size={15} style={{ color: '#25D366' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0, lineHeight: 1.2, color: '#fff' }}>WhatsApp</p>
            <p style={{ fontSize: 10, margin: 0, lineHeight: 1.3, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>Minha instância</p>
          </div>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#25D366', flexShrink: 0, boxShadow: '0 0 6px #25D366' }} />
        </a>

        <a id={`c8-home-${appId}`} href="https://login.codigooito.com.br/inicio" target="_self" style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '9px 14px', borderRadius: 10, marginTop: 4,
          background: 'transparent', textDecoration: 'none', transition: 'background 0.15s',
        }}>
          <Home size={15} style={{ flexShrink: 0, color: 'rgba(255,255,255,0.4)' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.2, color: 'rgba(255,255,255,0.75)' }}>Início</p>
            <p style={{ fontSize: 10, margin: 0, lineHeight: 1.3, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>Notificações & Dia a dia</p>
          </div>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>↗</span>
        </a>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '10px 4px 0' }} />
      </div>

      {/* Módulos */}
      <nav id={navId} style={{ flex: 1, overflowY: 'auto', padding: '6px 10px' }}>
        {modules.map(mod => {
          const isOpen = open[mod.key];
          const anyActive = mod.items.some(i => isActive(i.href));
          return (
            <div key={mod.key} style={{ marginBottom: 4 }}>
              <button className="nav-btn" onClick={() => toggle(mod.key)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'transparent', marginBottom: 2,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: mod.color, flexShrink: 0, boxShadow: anyActive ? `0 0 8px ${mod.color}` : 'none' }} />
                <span style={{ flex: 1, textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: anyActive ? mod.color : 'rgba(255,255,255,0.3)' }}>{mod.key}</span>
                <ChevronDown size={10} style={{ color: 'rgba(255,255,255,0.25)', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s', flexShrink: 0 }} />
              </button>
              {isOpen && mod.items.map(item => (
                <NavItem key={item.name + item.href} item={item} active={isActive(item.href)} accentColor={mod.color} />
              ))}
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <button id={`c8-logout-${appId}`} onClick={handleLogout} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '9px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: 'transparent', color: 'rgba(255,255,255,0.4)', transition: 'all 0.15s', fontFamily: 'inherit',
        }}>
          <LogOut size={14} style={{ flexShrink: 0 }} />
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: 'rgba(255,255,255,0.6)' }}>Sair</p>
            <p style={{ fontSize: 9, margin: 0, color: 'rgba(255,255,255,0.25)' }}>Encerrar sessão</p>
          </div>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <button onClick={() => setMobileOpen(!mobileOpen)} style={{
        display: 'none', position: 'fixed', top: 14, left: 14, zIndex: 50,
        width: 40, height: 40, borderRadius: 10, background: '#00205B', border: 'none',
        cursor: 'pointer', color: '#fff', alignItems: 'center', justifyContent: 'center',
      }} id={`c8-hamburger-${appId}`}>
        {mobileOpen ? <X size={16} /> : <Menu size={16} />}
      </button>
      {mobileOpen && <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,18,51,0.6)', backdropFilter: 'blur(4px)' }} />}
      <div id={`c8-sidebar-wrap-${appId}`} style={{ flexShrink: 0, width: 240, height: '100vh', position: 'sticky', top: 0 }}>
        {sidebar}
      </div>
      {mobileOpen && (
        <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 260, zIndex: 40, boxShadow: '4px 0 32px rgba(0,0,0,0.4)' }}>
          {sidebar}
        </div>
      )}
      <style>{`@media (max-width: 767px) { #c8-sidebar-wrap-${appId} { display: none !important; } #c8-hamburger-${appId} { display: flex !important; } }`}</style>
    </>
  );
}
