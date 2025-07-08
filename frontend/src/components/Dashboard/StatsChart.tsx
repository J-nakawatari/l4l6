'use client';

import React from 'react';

export default function StatsChart() {
  const total = 75350;
  const stats = [
    { label: '的中数', value: 30893, color: '#4361ee' },
    { label: '未当選', value: 24112, color: '#818cf8' },
    { label: '保留中', value: 20345, color: '#c7d2fe' }
  ];

  const totalValue = stats.reduce((acc, stat) => acc + stat.value, 0);

  return (
    <div className="custom-card p-6">
      <div className="flex items-center justify-center mb-6">
        <div className="relative w-48 h-48">
          {/* SVG Donut Chart */}
          <svg className="w-full h-full transform -rotate-90">
            {(() => {
              let accumulatedPercentage = 0;
              return stats.map((stat, index) => {
                const percentage = (stat.value / totalValue) * 100;
                const dasharray = `${percentage} ${100 - percentage}`;
                const dashoffset = accumulatedPercentage;
                
                accumulatedPercentage += percentage;
                
                return (
                  <React.Fragment key={index}>
                    <circle
                      cx="96"
                      cy="96"
                      r="72"
                      fill="none"
                      stroke={stat.color}
                      strokeWidth="24"
                      strokeDasharray={dasharray}
                      strokeDashoffset={-dashoffset}
                      className="transition-all duration-500"
                    />
                  </React.Fragment>
                );
              });
            })()}
          </svg>
          
          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-sm text-gray-500">累計予想</div>
            <div className="text-2xl font-bold">{total.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-3">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: stat.color }}
              />
              <span className="text-sm text-gray-600">{stat.label}</span>
            </div>
            <span className="text-sm font-medium">{stat.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}