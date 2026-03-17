import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FileUp, SlidersHorizontal, Cpu, FileText } from 'lucide-react';

export default function NavBar() {
  const location = useLocation();
  const pathname = location.pathname.toLowerCase();
  const isHomeActive = pathname === '/';
  const isPreprocessingActive = pathname.startsWith('/preprocessing');
  const isModelSetActive = pathname.startsWith('/modelset');
  const isEvaluatioClassify = pathname.startsWith('/evaluatioclassify');

  return (
    <nav className="space-y-2">
        <NavLink
            to="/"
            className={navItemClass(isHomeActive)}
        >
            <FileUp size={20} />
            <span className="text-sm font-semibold">匯入檔案</span>
        </NavLink>

        <NavLink
            to="/preprocessing"
            className={navItemClass(isPreprocessingActive)}
        >
            <SlidersHorizontal size={20} />
            <span className="text-sm font-semibold">光譜前處理</span>
        </NavLink>

        <NavLink
            to="/modelSet"
            className={navItemClass(isModelSetActive)}
        >
            <Cpu size={20} />
            <span className="text-sm font-semibold">模型建構</span>
        </NavLink>

        <NavLink
            to="/evaluatioClassify"
            className={navItemClass(isEvaluatioClassify)}
        >
            <FileText size={20} />
            <span className="text-sm font-semibold">評估匯出</span>
        </NavLink>
    </nav>
  );
}

function navItemClass(active) {
  return `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
    active
      ? 'bg-[#82b091] text-white shadow-md shadow-[#82b091]/20'
      : 'text-slate-500 hover:bg-white hover:text-[#82b091] hover:shadow-sm'
  }`;
}

function NavItem({ icon, label, active = false }) {
  return (
    <a href="#" className={navItemClass(active)}>
      {icon}
      <span className="text-sm font-semibold">{label}</span>
    </a>
  );
}
