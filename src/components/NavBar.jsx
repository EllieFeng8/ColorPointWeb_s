import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { FileUp, SlidersHorizontal, Cpu, FileText, User } from 'lucide-react';
import logoAeyeot from '@/src/image/onlyLogoW_big 3.png';

export default function NavBar() {
  const location = useLocation();
  const pathname = location.pathname.toLowerCase();
  const isHomeActive = pathname === '/';
  const isPreprocessingActive = pathname.startsWith('/preprocessing');
  const isModelSetActive = pathname.startsWith('/modelset');
  const isEvaluatioClassify = pathname.startsWith('/evaluatioclassify');

  return (
    <aside className="w-72 flex-shrink-0 border-r border-slate-100 bg-[#F9FAFB] flex flex-col">
      <div className="p-8">
        <Link to="/" className="mb-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-[#82b091] shadow-lg shadow-[#82b091]/30">
            <img src={logoAeyeot} alt="AEYEOT" className="h-7 w-7 object-contain" />
          </div>
          <div>
            <h1 className="text-[24px] font-extrabold tracking-widest uppercase text-[#659475]">AEYEOT</h1>
          </div>
        </Link>

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
      </div>

      {/*<div className="mt-auto border-t border-slate-100 p-8">*/}
      {/*  <div className="flex items-center gap-3 rounded-xl border border-slate-50 bg-white p-3 shadow-sm">*/}
      {/*    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">*/}
      {/*      <User size={20} />*/}
      {/*    </div>*/}
      {/*    <div className="min-w-0 flex-1">*/}
      {/*      <p className="truncate text-xs font-bold text-[#111827]">Lab Technician 01</p>*/}
      {/*      <p className="truncate text-[10px] text-slate-400">lab-01@inst.edu</p>*/}
      {/*    </div>*/}
      {/*  </div>*/}
      {/*</div>*/}
    </aside>
  );
}

function navItemClass(active) {
  return `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
    active
      ? 'bg-[#82b091] text-white shadow-md shadow-[#82b091]/20'
      : 'text-slate-500 hover:bg-white hover:text-[#82b091] hover:shadow-sm'
  }`;
}

