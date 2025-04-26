// src/pages/security-services/control-panel/QueueManagement/components/StatisticsPanel.jsx
import React from 'react';
import { Card, CardContent } from '../../../../../components/ui/card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const StatisticsPanel = ({ title, value, icon, trend, trendLabel, trendReversed = false }) => {
  // Ensure value is a primitive (string or number)
  const displayValue = typeof value === 'string' ? value : '0';
  
  // Ensure trend is a number
  const numericTrend = typeof trend === 'number' ? trend : 0;
  
  // Determine if trend is positive or negative (accounting for reversed metrics where lower is better)
  const isPositiveTrend = trendReversed ? numericTrend < 0 : numericTrend > 0;
  
  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{displayValue}</h3>
          </div>
          <div className="p-2 rounded-full bg-blue-50 dark:bg-blue-900/20">
            {icon}
          </div>
        </div>
        
        {trend !== undefined && (
          <div className="flex items-center mt-4">
            <span className={`flex items-center text-sm ${
              isPositiveTrend 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {isPositiveTrend ? (
                <ArrowUpRight className="h-4 w-4 mr-1" />
              ) : (
                <ArrowDownRight className="h-4 w-4 mr-1" />
              )}
              {Math.abs(numericTrend)}%
            </span>
            
            {trendLabel && (
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                {trendLabel}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
