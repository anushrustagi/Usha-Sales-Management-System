import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbsProps {
  activeTab: string;
}

const TAB_NAMES: Record<string, string> = {
  dashboard: 'Dashboard',
  journal: 'Journal',
  planner: 'Planner',
  coach: 'Analytics',
  diary: 'Diary'
};

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ activeTab }) => {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500 mb-4 px-1">
      <div className="flex items-center gap-1 hover:text-slate-300 transition-colors cursor-default">
        <Home className="w-3 h-3" />
        <span>Home</span>
      </div>
      <ChevronRight className="w-3 h-3 text-slate-600" />
      <span className="font-semibold text-blue-400 cursor-default">
        {TAB_NAMES[activeTab] || 'Unknown'}
      </span>
    </div>
  );
};