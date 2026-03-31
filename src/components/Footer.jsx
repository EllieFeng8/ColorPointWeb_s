import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer({
  primaryLabel = '下一步',
  primaryTo,
  primaryState,
  onPrimaryClick,
  primaryDisabled = false,
  secondaryLabel = '取消',
  secondaryTo,
  secondaryState,
  onSecondaryClick,
  secondaryDisabled = false
}) {
  const secondaryClassName =
    `px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${
      secondaryDisabled
        ? 'cursor-not-allowed text-slate-300'
        : 'text-slate-500 hover:bg-slate-50 hover:text-[#111827]'
    }`;
  const primaryClassName =
    `text-white px-12 py-3 rounded-xl text-sm font-extrabold flex items-center gap-3 transition-all ${
      primaryDisabled
        ? 'cursor-not-allowed bg-slate-300'
        : 'bg-[#82b091] hover:bg-[#659475] shadow-xl shadow-[#82b091]/30 hover:-translate-y-0.5 active:translate-y-0'
    }`;

  return (
    <footer className="fixed bottom-0 right-0 left-72 border-t border-slate-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex max-w-6xl justify-end gap-6 px-12 py-6">
        {secondaryTo ? (
          <Link to={secondaryTo} state={secondaryState} className={secondaryClassName}>
            <ArrowLeft size={18} />
            {secondaryLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onSecondaryClick}
            disabled={secondaryDisabled}
            className={secondaryClassName}
          >
            {secondaryLabel}
          </button>
        )}
        {primaryTo ? (
          <Link to={primaryTo} state={primaryState} className={primaryClassName}>
            {primaryLabel}
            <ArrowRight size={18} />
          </Link>
        ) : (
          <button type="button" onClick={onPrimaryClick} disabled={primaryDisabled} className={primaryClassName}>
            {primaryLabel}
            <ArrowRight size={18} />
          </button>
        )}
      </div>
    </footer>
  );
}
