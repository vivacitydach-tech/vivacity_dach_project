'use client';

import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { getCompanyId, getUser, logout, setCompanyId } from '@/lib/auth';
import { useI18n } from '@/components/i18n-provider';
import { apiGet } from '@/lib/api';
import type { Project } from '@/lib/types';

interface SubItem {
  href: string;
  label: string;
  description: string;
  badge?: string;
  external?: boolean;
}

interface NavModule {
  id: string;
  sectionCode: string;
  label: string;
  icon: string;
  baseHref: string;
  description: string;
  subItems: SubItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const user = getUser();
  const { t, locale, setLocale } = useI18n();
  const [companyId, setCompanyIdState] = useState(() => getCompanyId());
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const memberships = user?.memberships ?? [];
  const showCompanySwitcher = memberships.length > 1;

  // Detect project ID from path or fetch first project
  const urlProjectId =
    typeof params?.id === 'string' && pathname.startsWith('/projects/')
      ? params.id
      : null;

  useEffect(() => {
    if (urlProjectId) {
      setActiveProjectId(urlProjectId);
    } else {
      // Fetch user's first project as default context for quick-links
      apiGet<Project[]>('/projects')
        .then((projects) => {
          if (projects && projects.length > 0) {
            setActiveProjectId(projects[0].id);
          }
        })
        .catch(() => {});
    }
  }, [urlProjectId]);

  const targetProjId = activeProjectId ?? '00000000-0000-4000-8000-000000000001';

  // 6 Core Pillars according to the Technical Engineering Specification
  const specModules: NavModule[] = [
    {
      id: 'boq',
      sectionCode: '§01 / §06 / §10.2',
      label: locale === 'de' ? 'Kalkulation & LV' : 'Estimating & BOQ',
      icon: '📊',
      baseHref: `/projects/${targetProjId}/boq`,
      description: locale === 'de' ? 'Leistungsverzeichnis, Einheitspreise & KI-Schätzung' : 'Hierarchical BOQ, Unit Rates & AI Quantity Estimator',
      subItems: [
        {
          href: `/projects/${targetProjId}/boq`,
          label: locale === 'de' ? 'Leistungsverzeichnis (LV)' : 'Bill of Quantities (BOQ)',
          description: locale === 'de' ? 'Hierarchischer WBS-Baum & Dezimalkalkulation' : 'Hierarchical WBS grid with high-precision math',
          badge: 'WBS',
        },
        {
          href: `/projects/${targetProjId}/change-orders`,
          label: locale === 'de' ? 'Nachtragsmanagement' : 'Change Orders & Variances',
          description: locale === 'de' ? 'Genehmigungsworkflow & Kostenabweichung' : 'Approval pipelines & cost impact tracking',
          badge: 'Variances',
        },
        {
          href: `/settings/unit-rates`,
          label: locale === 'de' ? 'Einheitspreis-Katalog' : 'Unit Rates & Cost Catalog',
          description: locale === 'de' ? 'Unternehmensweite Vorlagen & Gewerke' : 'Company-wide standard item rate library',
          badge: 'Catalog',
        },
      ],
    },
    {
      id: 'evm',
      sectionCode: '§01 / §06 / §10.3',
      label: locale === 'de' ? 'EVM & Kostenkontrolle' : 'EVM & Cost Control',
      icon: '📈',
      baseHref: `/projects/${targetProjId}/evm`,
      description: locale === 'de' ? 'Planned Value, Earned Value & Kostenanalysen' : 'Earned Value, SPI/CPI trend metrics & cost variance',
      subItems: [
        {
          href: `/projects/${targetProjId}/evm`,
          label: locale === 'de' ? 'EVM Performance-Kurven' : 'EVM Performance Dashboard',
          description: locale === 'de' ? 'PV, EV, AC Trends & SPI/CPI Indizes' : 'Automated PV, EV, AC trend analytics & KPIs',
          badge: 'Live',
        },
        {
          href: `/dashboard`,
          label: locale === 'de' ? 'Portfolio-Kostenübersicht' : 'Multi-Project Cost Tower',
          description: locale === 'de' ? 'Unternehmensweite Kosten- & Budgetsteuerung' : 'Executive portfolio budget & variance control',
          badge: 'Executive',
        },
      ],
    },
    {
      id: 'schedule',
      sectionCode: '§01 / §06 / §10',
      label: locale === 'de' ? 'Terminplan & Gantt' : 'Project Management & Gantt',
      icon: '📅',
      baseHref: `/projects/${targetProjId}/schedule`,
      description: locale === 'de' ? 'Interaktiver Gantt-Plan, Baselines & Meilensteine' : 'Interactive Gantt schedules, baselines & dependencies',
      subItems: [
        {
          href: `/projects/${targetProjId}/schedule`,
          label: locale === 'de' ? 'Gantt-Terminplan' : 'Interactive Gantt Schedule',
          description: locale === 'de' ? 'Vorgangsabhängigkeiten (FS, SS) & Fortschritt' : 'Activity dependencies (FS, SS, FF) & progress',
          badge: 'Gantt',
        },
        {
          href: `/projects/${targetProjId}`,
          label: locale === 'de' ? 'Projekt-Übersicht' : 'Project Hub & Milestones',
          description: locale === 'de' ? 'Projekt-Metriken, WBS & Aktivitäten-Status' : 'Project health, active trades & team summary',
          badge: 'Overview',
        },
      ],
    },
    {
      id: 'bim',
      sectionCode: '§01 / §04 / §06',
      label: locale === 'de' ? 'Mängel & BIM / BCF' : 'Issues & BIM / BCF',
      icon: '🔍',
      baseHref: `/projects/${targetProjId}/bcf`,
      description: locale === 'de' ? 'Open BIM BCF Topics, Mängel & Dokumente' : '3D BIM Viewer, BCF Topics, RFIs & Plan Library',
      subItems: [
        {
          href: `/projects/${targetProjId}/bcf`,
          label: locale === 'de' ? '3D BIM Viewer & BCF' : '3D BIM Viewer & BCF Topics',
          description: locale === 'de' ? '3D Modell-Visualisierung & BCF XML/JSON Sync' : 'Interactive 3D model with Open BIM BCF issues',
          badge: '3D BIM',
        },
        {
          href: `/projects/${targetProjId}/issues`,
          label: locale === 'de' ? 'Mängel & Vorgänge (RFIs)' : 'Issues, Defects & RFIs',
          description: locale === 'de' ? 'Mängelerfassung mit Gewerk & Kostenrelevanz' : 'Quality defects, RFIs & snag tracking',
          badge: 'Quality',
        },
        {
          href: `/projects/${targetProjId}/documents`,
          label: locale === 'de' ? 'Pläne & Dokumente' : 'Plans & Document Repository',
          description: locale === 'de' ? 'Direkter S3-Upload & Planverwaltung' : 'Secure S3 direct upload with SHA-256 integrity',
          badge: 'S3 Storage',
        },
      ],
    },
    {
      id: 'field',
      sectionCode: '§01 / §11',
      label: locale === 'de' ? 'Baustelle & Feld-PWA' : 'Field Operations & Site',
      icon: '📱',
      baseHref: `/projects/${targetProjId}/diaries`,
      description: locale === 'de' ? 'Bautagebuch, Abnahmen, Chat & Offline-App' : 'Site diaries, digital sign-off, chat & offline PWA',
      subItems: [
        {
          href: `/projects/${targetProjId}/diaries`,
          label: locale === 'de' ? 'Bautagebuch' : 'Site Diaries & Weather',
          description: locale === 'de' ? 'Tägliche Baustellenberichte & Wetteraufzeichnung' : 'Daily logs, weather, workforce & progress notes',
          badge: 'Daily',
        },
        {
          href: `/projects/${targetProjId}/checklists`,
          label: locale === 'de' ? 'Checklisten & Abnahmen' : 'Field Checklists & Signatures',
          description: locale === 'de' ? 'Digitale Unterschrift & Prüfprotokolle' : 'Digital canvas signature & compliance protocols',
          badge: 'Sign-Off',
        },
        {
          href: `/projects/${targetProjId}/chat`,
          label: locale === 'de' ? 'Baustellen-Chat' : 'Real-Time Site Chat',
          description: locale === 'de' ? 'Direkte Baustelle-zu-Büro Kommunikation' : 'Site-to-office instant messaging & photo tagging',
          badge: 'Live',
        },
        {
          href: `/field/`,
          label: locale === 'de' ? 'Mobile Feld-App (PWA)' : 'Mobile Field App (PWA)',
          description: locale === 'de' ? 'Offline-fähige Smartphone & Tablet App' : 'Offline-first PWA with IndexedDB & GPS geofencing',
          badge: 'PWA',
        },
      ],
    },
    {
      id: 'governance',
      sectionCode: '§01 / §07',
      label: locale === 'de' ? 'Team & Verwaltung' : 'Company & Governance',
      icon: '👥',
      baseHref: '/members',
      description: locale === 'de' ? 'RBAC-Rollen, Mehrmandantenfähigkeit & Audit' : 'Tenant isolation, RBAC roles & company profile',
      subItems: [
        {
          href: '/dashboard',
          label: locale === 'de' ? 'Executive Dashboard' : 'Executive Dashboard',
          description: locale === 'de' ? 'Gesamtübersicht aller Bauprojekte' : 'Company-wide construction portfolio health',
          badge: 'HQ',
        },
        {
          href: '/projects',
          label: locale === 'de' ? 'Projekt-Verzeichnis' : 'Projects Directory',
          description: locale === 'de' ? 'Alle aktiven Bauvorhaben verwalten' : 'Manage and provision multi-company projects',
          badge: 'Projects',
        },
        {
          href: '/members',
          label: locale === 'de' ? 'Team & Berechtigungen' : 'Team Members & RBAC',
          description: locale === 'de' ? 'Rollen (Admin, PM, Bauleiter, Nachunternehmer)' : 'Role management with unit-rate price masking',
          badge: 'RBAC',
        },
        {
          href: '/settings/company',
          label: locale === 'de' ? 'Unternehmens-Profil' : 'Company Profile & Tenant',
          description: locale === 'de' ? 'Mandanteneinstellungen & Währung (EUR/PKR)' : 'Multi-tenant configuration & currency formats',
          badge: 'Tenant',
        },
      ],
    },
  ];

  function isModuleActive(module: NavModule) {
    if (module.id === 'boq' && (pathname.includes('/boq') || pathname.includes('/change-orders') || pathname.includes('/unit-rates'))) return true;
    if (module.id === 'evm' && pathname.includes('/evm')) return true;
    if (module.id === 'schedule' && (pathname.includes('/schedule') || (pathname.startsWith(`/projects/${urlProjectId}`) && !pathname.includes('/boq') && !pathname.includes('/issues') && !pathname.includes('/bcf') && !pathname.includes('/diaries') && !pathname.includes('/checklists') && !pathname.includes('/documents') && !pathname.includes('/evm') && !pathname.includes('/members') && !pathname.includes('/chat')))) return true;
    if (module.id === 'bim' && (pathname.includes('/bcf') || pathname.includes('/issues') || pathname.includes('/documents'))) return true;
    if (module.id === 'field' && (pathname.includes('/diaries') || pathname.includes('/checklists') || pathname.includes('/chat'))) return true;
    if (module.id === 'governance' && (pathname === '/dashboard' || pathname === '/projects' || pathname === '/members' || pathname.includes('/settings/company'))) return true;
    return false;
  }

  function onLogout() {
    logout();
    router.replace('/login');
  }

  function onCompanyChange(nextId: string) {
    setCompanyId(nextId);
    setCompanyIdState(nextId);
    router.refresh();
    window.location.reload();
  }

  return (
    <aside className="relative flex w-64 shrink-0 flex-col border-r border-slate-800/80 bg-slate-950">
      {/* Platform Branding Header */}
      <div className="border-b border-slate-800/80 px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-500/20">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 20V9l8-5 8 5v11" />
              <path d="M9 20v-6h6v6" />
            </svg>
          </div>
          <div>
            <span className="block text-sm font-bold tracking-tight text-white">
              ADO Innenausbau
            </span>
            <span className="block text-[11px] text-emerald-400">
              {locale === 'de' ? 'Bau- & Innenausbau' : 'Construction Platform'}
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Modules with Hover Dropdown Flyouts */}
      <nav className="flex-1 space-y-1.5 overflow-visible px-3 py-4">
        <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {locale === 'de' ? 'Module & Navigation' : 'Platform Modules'}
        </div>

        {specModules.map((mod) => {
          const active = isModuleActive(mod);
          return (
            <div key={mod.id} className="group relative">
              {/* Main Module Button */}
              <Link
                href={mod.baseHref}
                className={clsx(
                  'flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  active
                    ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : 'text-slate-300 hover:border-slate-800 hover:bg-slate-900 hover:text-white',
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{mod.icon}</span>
                  <span className="truncate">{mod.label}</span>
                </div>
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4 text-slate-500 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-emerald-400"
                >
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </Link>

              {/* Hover Dropdown / Flyout Submenu */}
              <div className="pointer-events-none absolute left-full top-0 z-50 ml-2.5 hidden w-80 rounded-2xl border border-slate-700/80 bg-slate-900/95 p-3 shadow-2xl shadow-black/80 backdrop-blur-xl transition-all duration-200 group-hover:pointer-events-auto group-hover:block animate-in fade-in zoom-in-95">
                {/* Flyout Header */}
                <div className="mb-2.5 flex items-center justify-between border-b border-slate-800 pb-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{mod.icon}</span>
                    <div>
                      <h4 className="text-xs font-bold text-white">{mod.label}</h4>
                      <p className="text-[10px] text-slate-400">{mod.description}</p>
                    </div>
                  </div>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] text-emerald-400">
                    {mod.sectionCode}
                  </span>
                </div>

                {/* Sub-items List */}
                <div className="space-y-1">
                  {mod.subItems.map((sub) => {
                    const isSubActive = pathname === sub.href;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={clsx(
                          'flex items-start justify-between rounded-lg p-2 transition',
                          isSubActive
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'hover:bg-slate-800/80 text-slate-300 hover:text-white',
                        )}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-medium text-slate-200">
                            {sub.label}
                          </div>
                          <div className="text-[10px] text-slate-400 line-clamp-1">
                            {sub.description}
                          </div>
                        </div>
                        {sub.badge ? (
                          <span className="shrink-0 rounded-md border border-slate-700 bg-slate-800/90 px-1.5 py-0.5 font-mono text-[9px] text-emerald-400">
                            {sub.badge}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* User, Tenant Switcher & Language Footer */}
      <div className="border-t border-slate-800/80 bg-slate-950/80 p-4">
        {showCompanySwitcher ? (
          <label className="mb-3 block">
            <span className="mb-1 block text-xs text-slate-400">
              {t('companySwitcher')}
            </span>
            <select
              value={companyId}
              onChange={(e) => onCompanyChange(e.target.value)}
              className="te-input py-1.5 text-xs"
            >
              {memberships.map((m) => (
                <option key={m.company_id} value={m.company_id}>
                  {m.company_name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {/* Language Switcher */}
        <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-1">
          <span className="pl-2 text-[11px] text-slate-400">{t('language')}:</span>
          <div className="flex gap-1">
            {(['en', 'de'] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLocale(code)}
                className={clsx(
                  'rounded px-2.5 py-1 font-mono text-[11px] uppercase transition',
                  locale === code
                    ? 'bg-emerald-500 font-bold text-slate-950'
                    : 'text-slate-400 hover:text-slate-200',
                )}
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <p className="truncate text-xs font-semibold text-slate-200">
              {user?.name ?? 'Admin User'}
            </p>
            <p className="truncate font-mono text-[10px] text-slate-500">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            title={t('logout')}
            className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400 transition"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
