import React from 'react';
import { motion } from 'motion/react';
import { Info } from 'lucide-react';

export default function Header() {
  return (
    <header className="flex justify-between items-start">
      <div className="space-y-2">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-extrabold tracking-tight text-[#111827]"
        >
          匯入光譜檔案
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-slate-500 text-lg"
        >
          請上傳或拖放您的光譜數據檔案（支持 .csv, .spc, .jdx 格式）
        </motion.p>
      </div>
      <div className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full bg-[#82b091]/10 text-[#659475] border border-[#82b091]/20">
        <Info size={14} />
        STEP 1 OF 4: DATA ACQUISITION
      </div>
    </header>
  );
}
