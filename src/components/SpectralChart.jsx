import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts';
import { ZoomIn, Grid3X3, Download, TrendingUp } from 'lucide-react';

const data = Array.from({ length: 50 }, (_, i) => {
    const x = i / 5;
    const raw = Math.sin(x) * 0.5 + 0.5 + Math.random() * 0.1;
    const processed = Math.sin(x) * 0.5 + 0.5;
    return {
        wavelength: 400 + i * 40,
        raw,
        processed,
    };
});

export default function SpectralChart() {
    return (
        <div className="flex-1 flex flex-col bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-50 flex justify-between items-center bg-white">
                <div className="flex items-center gap-6">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp className="text-primary size-4" /> 光譜視覺化分析
                    </h3>
                    <div className="flex items-center gap-6 border-l border-slate-100 pl-6">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-1 rounded-full bg-slate-200"></span>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">原始光譜</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-1 rounded-full bg-primary shadow-[0_0_8px_rgba(130,176,145,0.4)]"></span>
                            <span className="text-[11px] font-bold text-primary uppercase tracking-wider">處理後光譜</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="size-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-primary/30 text-slate-400 hover:text-primary transition-all">
                        <ZoomIn className="size-4" />
                    </button>
                    <button className="size-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-primary/30 text-slate-400 hover:text-primary transition-all">
                        <Grid3X3 className="size-4" />
                    </button>
                    <button className="size-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-primary/30 text-slate-400 hover:text-primary transition-all">
                        <Download className="size-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 p-8 relative flex flex-col">
                <div className="flex-1 w-full bg-white rounded-2xl border border-slate-100 flex flex-col relative overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorProcessed" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#82b091" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#82b091" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="wavelength"
                                hide
                            />
                            <YAxis hide />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-xl min-w-[140px]">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Wavelength</p>
                                                <p className="text-sm font-extrabold text-slate-800 mb-2">{payload[0].payload.wavelength} nm</p>
                                                <div className="flex items-center justify-between gap-4 mb-1">
                                                    <span className="text-[10px] font-semibold text-slate-500">Raw</span>
                                                    <span className="text-xs font-bold text-slate-700">{payload[0].value?.toFixed(3)}</span>
                                                </div>
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="text-[10px] font-semibold text-primary">Processed</span>
                                                    <span className="text-xs font-bold text-primary">{payload[1].value?.toFixed(3)}</span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="raw"
                                stroke="#e2e8f0"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                fill="transparent"
                            />
                            <Area
                                type="monotone"
                                dataKey="processed"
                                stroke="#82b091"
                                strokeWidth={4}
                                fillOpacity={1}
                                fill="url(#colorProcessed)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>

                    <div className="absolute bottom-6 left-8">
                        <div className="bg-slate-50/80 backdrop-blur px-3 py-1 rounded-full border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Spectral Density Analysis</span>
                        </div>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-4 gap-6">
                    {[
                        { label: 'Signal Noise', value: '42.8', unit: 'dB', color: 'bg-primary' },
                        { label: 'Mean Abs.', value: '0.824', color: 'bg-blue-400' },
                        { label: 'Std. Dev.', value: '0.012', color: 'bg-amber-400' },
                        { label: 'Samples', value: '128', color: 'bg-indigo-400' },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <span className={`size-1.5 ${stat.color} rounded-full`}></span> {stat.label}
                            </p>
                            <p className="text-2xl font-black text-slate-800">
                                {stat.value} {stat.unit && <span className="text-xs font-bold text-slate-400">{stat.unit}</span>}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
