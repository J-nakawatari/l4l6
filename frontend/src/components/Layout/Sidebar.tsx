'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconDashboard,
  IconHome,
  IconChartBar,
  IconCoin,
  IconInbox,
  IconCalendar,
  IconSettings,
  IconHelp,
  IconMoon,
  IconLogout
} from '@tabler/icons-react';

interface SidebarItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  section?: string;
}

const sidebarItems: SidebarItem[] = [
  // Main Menu
  { label: 'Dashboard', icon: <IconDashboard size={20} />, href: '/dashboard', section: 'main' },
  { label: '予想一覧', icon: <IconHome size={20} />, href: '/predictions', section: 'main' },
  { label: '統計分析', icon: <IconChartBar size={20} />, href: '/insights', section: 'main' },
  { label: 'サブスク管理', icon: <IconCoin size={20} />, href: '/subscription', section: 'main' },
  { label: 'お知らせ', icon: <IconInbox size={20} />, href: '/inbox', section: 'main' },
  { label: 'カレンダー', icon: <IconCalendar size={20} />, href: '/calendar', section: 'main' },
  
  // Preferences
  { label: '設定', icon: <IconSettings size={20} />, href: '/settings', section: 'preferences' },
  { label: 'ヘルプ', icon: <IconHelp size={20} />, href: '/help', section: 'preferences' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="px-6 py-6 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">L6</span>
          </div>
          <span className="font-semibold text-xl">Lotto6</span>
        </div>
      </div>

      {/* Main Menu */}
      <div className="py-4">
        <div className="px-6 mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            メインメニュー
          </span>
        </div>
        
        {sidebarItems
          .filter(item => item.section === 'main')
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item ${pathname === item.href ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
      </div>

      {/* Preferences */}
      <div className="py-4 border-t">
        <div className="px-6 mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            設定
          </span>
        </div>
        
        {sidebarItems
          .filter(item => item.section === 'preferences')
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item ${pathname === item.href ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        
        {/* Dark Mode Toggle */}
        <button className="sidebar-item w-full">
          <IconMoon size={20} />
          <span>ダークモード</span>
          <div className="ml-auto">
            <label className="switch">
              <input type="checkbox" />
              <span className="slider round"></span>
            </label>
          </div>
        </button>
      </div>

      {/* Logout */}
      <div className="py-4 border-t mt-auto">
        <button className="sidebar-item w-full text-red-600 hover:bg-red-50">
          <IconLogout size={20} />
          <span>ログアウト</span>
        </button>
      </div>
    </aside>
  );
}