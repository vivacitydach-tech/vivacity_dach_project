'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/components/i18n-provider';

function BuildingMark() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-[0_0_0_1px_rgba(34,197,94,0.35)]">
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden
      >
        <path d="M4 20V9l8-5 8 5v11" />
        <path d="M9 20v-6h6v6" />
        <path d="M9 10h.01M15 10h.01M12 10h.01" />
      </svg>
    </div>
  );
}

export function TopHeader() {
  const { t } = useI18n();
  const [openNotifications, setOpenNotifications] = useState(false);

  // Simulated live project notifications / alerts feed
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: 'EVM SPI Warning (BLP-001)',
      desc: 'Schedule Performance Index (0.791) is below target threshold of 0.85.',
      time: '10m ago',
      type: 'warning',
      href: '/projects/00000000-0000-4000-8000-000000000010/evm',
    },
    {
      id: '2',
      title: 'High Priority Defect Logged',
      desc: 'Cracked slab section B2 requires immediate structural review.',
      time: '45m ago',
      type: 'danger',
      href: '/projects/00000000-0000-4000-8000-000000000010/issues',
    },
    {
      id: '3',
      title: 'Site Diary Submitted',
      desc: 'Berlin Logistics Park daily log signed by Site Manager.',
      time: '2h ago',
      type: 'info',
      href: '/projects/00000000-0000-4000-8000-000000000010/diaries',
    },
  ]);

  const unreadCount = notifications.length;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
          <BuildingMark />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-wide text-slate-100">
              {t('brand')}
            </p>
            <p className="truncate text-xs text-slate-400">
              {t('portal')}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {/* Notification Bell Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenNotifications(!openNotifications)}
              className="relative rounded-lg border border-slate-800 bg-slate-900/80 p-2 text-slate-300 hover:text-white hover:bg-slate-800 transition"
              aria-label="Notifications"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {openNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-2xl z-50">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Live Alerts & Notifications
                  </span>
                  <button
                    type="button"
                    onClick={() => setNotifications([])}
                    className="text-[11px] text-slate-400 hover:text-slate-200"
                  >
                    Clear all
                  </button>
                </div>

                <div className="mt-2 divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-500">No active alerts</p>
                  ) : (
                    notifications.map((n) => (
                      <Link
                        key={n.id}
                        href={n.href}
                        onClick={() => setOpenNotifications(false)}
                        className="block py-2.5 px-2 hover:bg-slate-800/60 rounded-lg transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-xs font-semibold ${
                            n.type === 'danger' ? 'text-rose-400' : n.type === 'warning' ? 'text-amber-400' : 'text-sky-400'
                          }`}>
                            {n.title}
                          </span>
                          <span className="text-[10px] text-slate-500 shrink-0">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{n.desc}</p>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <span className="hidden rounded-md border border-slate-800 bg-slate-900/80 px-2 py-1 font-mono text-[11px] text-slate-300 sm:inline">
            ADO · INNENAUSBAU
          </span>
          <span className="flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </span>
        </div>
      </div>
    </header>
  );
}
