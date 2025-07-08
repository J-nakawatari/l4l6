'use client';

import React from 'react';
import Image from 'next/image';

interface Prediction {
  id: number;
  title: string;
  subtitle: string;
  price: string;
  image: string;
}

const predictions: Prediction[] = [
  {
    id: 1,
    title: '第1700回 データロジック予想',
    subtitle: '統計分析による予想',
    price: '1等 2億円',
    image: '/images/prediction1.jpg'
  },
  {
    id: 2,
    title: '第1700回 AI予想',
    subtitle: 'AI解析による予想',
    price: '1等 2億円',
    image: '/images/prediction2.jpg'
  },
  {
    id: 3,
    title: '第1699回 結果',
    subtitle: '抽選結果',
    price: '的中なし',
    image: '/images/result1.jpg'
  }
];

export default function PredictionCards() {
  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {predictions.map((prediction) => (
        <div key={prediction.id} className="flex-shrink-0 w-80">
          <div className="custom-card overflow-hidden cursor-pointer">
            <div className="relative h-48 image-card">
              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
              <span className="price-badge">{prediction.price}</span>
              <div className="image-card-overlay">
                <h3 className="text-lg font-semibold mb-1">{prediction.title}</h3>
                <p className="text-sm opacity-90">{prediction.subtitle}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}