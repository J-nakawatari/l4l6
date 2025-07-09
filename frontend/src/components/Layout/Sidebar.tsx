'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconDashboard,
  IconCoin,
  IconSettings,
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
  { label: '次回予想', icon: <IconDashboard size={20} />, href: '/dashboard', section: 'main' },
  { label: 'サブスク管理', icon: <IconCoin size={20} />, href: '/subscription', section: 'main' },
  
  // Preferences
  { label: '設定', icon: <IconSettings size={20} />, href: '/settings', section: 'preferences' },
];

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sidebar w-64 h-full bg-white">
      {/* Logo */}
      <div className="px-6 py-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">N4</span>
            </div>
            <span className="font-semibold text-xl">Numbers4</span>
          </div>
          {/* モバイル用閉じるボタン */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
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
              onClick={onClose}
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
              onClick={onClose}
              className={`sidebar-item ${pathname === item.href ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
      </div>

      {/* Logout */}
      <div className="py-4 border-t mt-auto">
        <button 
          onClick={async () => {
            try {
              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/auth/logout`, {
                method: 'POST',
                credentials: 'include',
              });
              
              if (response.ok) {
                window.location.href = '/login';
              }
            } catch (error) {
              console.error('Logout error:', error);
            }
          }}
          className="flex items-center gap-3 px-6 py-3 w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150 cursor-pointer"
        >
          <IconLogout size={20} />
          <span>ログアウト</span>
        </button>
      </div>
    </aside>
  );
}