import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function ModelNameDropdown({
  id,
  value,
  options,
  placeholder,
  disabled = false,
  onChange,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value]
  );

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div className={`space-y-2 ${className}`.trim()} ref={containerRef}>
      <div className="relative">
        <button
          id={id}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          disabled={disabled}
          onClick={() => setIsOpen((current) => !current)}
          className="flex min-h-[56px] w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left outline-none transition-all focus:border-[#82b091] focus:ring-2 focus:ring-[#82b091]/20 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          <div className="min-w-0">
            {selectedOption ? (
              <>
                <p className="truncate text-sm font-medium text-slate-700">
                  {selectedOption.modelName}
                </p>
                {selectedOption.note ? (
                  <p className="truncate text-xs text-slate-400">
                    {selectedOption.note}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="truncate text-sm font-medium text-slate-400">
                {placeholder}
              </p>
            )}
          </div>
          <ChevronDown
            className={`ml-3 h-5 w-5 shrink-0 text-slate-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isOpen && !disabled ? (
          <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
            <ul role="listbox" aria-labelledby={id} className="space-y-1">
              {options.length === 0 ? (
                <li className="px-3 py-2 text-sm text-slate-400">{placeholder}</li>
              ) : options.map((option) => (
                <li key={option.key}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option);
                      setIsOpen(false);
                    }}
                    className={`w-full rounded-xl px-3 py-2 text-left transition-colors ${
                      option.value === value
                        ? 'bg-[#82b091]/10'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-700">
                      {option.modelName}
                    </p>
                    {option.note ? (
                      <p className="mt-0.5 text-xs text-slate-400">
                        {option.note}
                      </p>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>


    </div>
  );
}
