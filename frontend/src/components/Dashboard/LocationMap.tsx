'use client';

import React from 'react';
import { IconMapPin } from '@tabler/icons-react';

interface Location {
  id: number;
  name: string;
  city: string;
  winCount: number;
  percentage: number;
}

const locations: Location[] = [
  {
    id: 1,
    name: '東京都',
    city: '新宿区',
    winCount: 245,
    percentage: 32
  },
  {
    id: 2,
    name: '大阪府',
    city: '大阪市',
    winCount: 189,
    percentage: 25
  },
  {
    id: 3,
    name: '愛知県',
    city: '名古屋市',
    winCount: 156,
    percentage: 20
  },
  {
    id: 4,
    name: '福岡県',
    city: '福岡市',
    winCount: 98,
    percentage: 13
  },
  {
    id: 5,
    name: '北海道',
    city: '札幌市',
    winCount: 76,
    percentage: 10
  }
];

export default function LocationMap() {
  return (
    <div className="custom-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">当選地域分布</h2>
        <button className="text-primary hover:text-primary-hover transition-colors text-sm">
          詳細 →
        </button>
      </div>

      <div className="space-y-4">
        {locations.map((location) => (
          <div key={location.id}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <IconMapPin size={16} className="text-gray-400" />
                <span className="font-medium">{location.name}</span>
                <span className="text-sm text-gray-500">{location.city}</span>
              </div>
              <span className="text-sm font-medium">{location.winCount}件</span>
            </div>
            <div className="relative">
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${location.percentage}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600 mb-2">今月の当選総数</div>
        <div className="text-2xl font-bold">764件</div>
        <div className="text-sm text-green-600 mt-1">前月比 +12.5%</div>
      </div>
    </div>
  );
}