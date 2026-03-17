import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="flex justify-end pt-8 gap-6 border-t border-slate-100">
      <button className="px-8 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-[#111827] transition-all">
        取消
      </button>
      <button className="bg-[#82b091] hover:bg-[#659475] text-white px-12 py-3 rounded-xl text-sm font-extrabold flex items-center gap-3 shadow-xl shadow-[#82b091]/30 transition-all hover:-translate-y-0.5 active:translate-y-0">
        下一步：前處理
        <ArrowRight size={18} />
      </button>
    </footer>
  );
}
