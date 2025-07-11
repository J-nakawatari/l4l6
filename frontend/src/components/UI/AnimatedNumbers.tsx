'use client';

import { useState, useEffect, useRef } from 'react';

interface AnimatedNumbersProps {
  finalNumbers?: string[];
  duration?: number;
  repeatInterval?: number;
  className?: string;
}

export default function AnimatedNumbers({
  finalNumbers = ['7', '4', '9', '2'],
  duration = 2500,
  repeatInterval = 8000, // 8秒ごとに繰り返し
  className = ''
}: AnimatedNumbersProps) {
  const [displayNumbers, setDisplayNumbers] = useState(['?', '?', '?', '?']);
  const [isAnimating, setIsAnimating] = useState(false);

  // ランダムな数字を生成（0-9）
  const generateRandomNumbers = () => {
    return Array.from({ length: 4 }, () => Math.floor(Math.random() * 10).toString());
  };

  // 計算エフェクトを実行
  const startCalculation = () => {
    setIsAnimating(true);
    setDisplayNumbers(['?', '?', '?', '?']);

    // 高速でランダム数字を表示
    const animationInterval = setInterval(() => {
      setDisplayNumbers(generateRandomNumbers());
    }, 120);

    // 指定時間後にアニメーション停止
    setTimeout(() => {
      clearInterval(animationInterval);
      
      // 最終数字を段階的に表示
      let currentIndex = 0;
      const revealInterval = setInterval(() => {
        setDisplayNumbers(prev => {
          const newNumbers = [...prev];
          newNumbers[currentIndex] = finalNumbers[currentIndex];
          return newNumbers;
        });
        
        currentIndex++;
        
        if (currentIndex >= 4) {
          clearInterval(revealInterval);
          setIsAnimating(false);
        }
      }, 250);
      
    }, duration);
  };

  // 初回実行と繰り返し設定
  useEffect(() => {
    // 初回実行
    const initialTimer = setTimeout(() => {
      startCalculation();
    }, 1500);

    // 繰り返し実行
    const repeatTimer = setInterval(() => {
      startCalculation();
    }, repeatInterval);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(repeatTimer);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* 数字表示エリア */}
      <div className="text-6xl font-black text-blue-800 tracking-wider flex justify-center space-x-4">
        {displayNumbers.map((number, index) => (
          <div
            key={index}
            className={`
              relative inline-block w-16 h-20 flex items-center justify-center
              ${isAnimating ? 'animate-pulse' : ''}
              ${number === '?' ? 'text-gray-400' : 'text-blue-800'}
              transition-all duration-300 ease-in-out
            `}
          >
            {/* 数字の背景エフェクト */}
            <div
              className={`
                absolute inset-0 rounded-lg
                ${isAnimating ? 'bg-blue-100 animate-ping opacity-30' : 'bg-transparent'}
                transition-all duration-300
              `}
            />
            
            {/* 数字本体 */}
            <span className={`
              relative z-10 
              ${isAnimating && number !== '?' ? 'animate-bounce' : ''}
              ${number === '?' ? 'animate-pulse' : ''}
            `}>
              {number}
            </span>
            
            {/* 計算中の点滅エフェクト */}
            {isAnimating && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-ping" />
            )}
          </div>
        ))}
      </div>

      {/* 計算中のステータス表示 */}
      {isAnimating && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center space-x-2 text-sm text-blue-600">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
            <span className="animate-pulse font-medium">AI解析中...</span>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
        </div>
      )}
    </div>
  );
}