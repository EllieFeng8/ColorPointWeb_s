import React from 'react';
import { ArrowRight, Settings } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export default function Loading({ open, onClose }) {
  const [progress, setProgress] = React.useState(45);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setProgress(45);

    const timer = window.setInterval(() => {
      setProgress((value) => (value >= 92 ? value : value + 3));
    }, 450);

    return () => window.clearInterval(timer);
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-white/70 backdrop-blur-[2px] flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md p-8 text-center"
          >
            <div className="mb-6 relative inline-block">
              <div className="w-20 h-20 rounded-full border-4 border-gray-100 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                >
                  <Settings size={32} className="text-primary" />
                </motion.div>
              </div>
              <div className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                {progress}%
              </div>
            </div>

            <div className="space-y-2 mb-8">
              <h4 className="text-xl font-bold text-gray-800">模型訓練中...</h4>
              {/*<p className="text-sm text-gray-500">*/}
              {/*  正在優化超參數: <span className="font-semibold text-primary">K-fold Validation</span>*/}
              {/*</p>*/}
            </div>

            <div className="w-full bg-gray-100 h-2 rounded-full mb-8 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-primary"
              />
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 px-4 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95"
            >
              取消訓練
            </button>
            <p className="mt-6 text-[11px] text-gray-400 uppercase tracking-widest">
              Estimated time remaining: 2m 15s
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
