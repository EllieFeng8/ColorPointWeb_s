import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { ChevronRight, Expand, Shrink } from 'lucide-react';

function buildSeries(rawSeries, processedSeries, visibleSeries) {
  const rawEntries = visibleSeries === 'both' || visibleSeries === 'raw'
    ? rawSeries.samples.map((sample) => ({
        name: `${sample.label} | 原始光譜`,
        type: 'line',
        symbol: 'none',
        showSymbol: false,
        smooth: true,
        data: sample.spectra,
        lineStyle: {
          color: '#cbd5e1',
          width: 1.5,
          opacity: 1,
          type: 'dashed'
        },
        emphasis: {
          focus: 'none',
          scale: false,
          lineStyle: {
            color: '#cbd5e1',
            width: 1.5,
            opacity: 1,
            type: 'dashed'
          }
        },
        blur: {
          lineStyle: {
            opacity: 1
          }
        },
        meta: {
          label: sample.label,
          componentValue: sample.componentsValue,
          source: 'preview'
        }
      }))
    : [];

  const processedEntries = visibleSeries === 'both' || visibleSeries === 'processed'
    ? processedSeries.samples.map((sample, index) => ({
        name: `${sample.label} | 處理後光譜`,
        type: 'line',
        symbol: 'none',
        showSymbol: false,
        smooth: true,
        data: sample.spectra,
        lineStyle: {
          color: `hsl(${(index * 37) % 360} 35% 48%)`,
          width: 2.2,
          opacity: 1
        },
        emphasis: {
          focus: 'none',
          scale: false,
          lineStyle: {
            color: `hsl(${(index * 37) % 360} 35% 48%)`,
            width: 2.2,
            opacity: 1
          }
        },
        blur: {
          lineStyle: {
            opacity: 1
          }
        },
        meta: {
          label: sample.label,
          componentValue: sample.componentsValue,
          source: 'absorbance'
        }
      }))
    : [];

  return [...rawEntries, ...processedEntries];
}

export default function SpectralChart({
  rawSeries = { wavelengths: [], samples: [] },
  processedSeries = { wavelengths: [], samples: [] },
  selectedComponent = ''
}) {
  const chartRef = useRef(null);
  const expandedChartRef = useRef(null);
  const [visibleSeries, setVisibleSeries] = useState('raw');
  const [isExpanded, setIsExpanded] = useState(false);
  const wavelengths = useMemo(() => {
    if (visibleSeries === 'raw') {
      return rawSeries.wavelengths.length > 0
        ? rawSeries.wavelengths
        : processedSeries.wavelengths;
    }

    if (visibleSeries === 'processed') {
      return processedSeries.wavelengths.length > 0
        ? processedSeries.wavelengths
        : rawSeries.wavelengths;
    }

    return processedSeries.wavelengths.length > 0
      ? processedSeries.wavelengths
      : rawSeries.wavelengths;
  }, [processedSeries.wavelengths, rawSeries.wavelengths, visibleSeries]);
  const series = useMemo(
    () => buildSeries(rawSeries, processedSeries, visibleSeries),
    [processedSeries, rawSeries, visibleSeries]
  );

  useEffect(() => {
    const container = isExpanded ? expandedChartRef.current : chartRef.current;
    if (!container) {
      return undefined;
    }

    const chart = echarts.getInstanceByDom(container) ?? echarts.init(container);

    chart.setOption({
      animationDuration: 400,
      toolbox: {
        top: 12,
        right: 18,
        itemSize: 16,
        iconStyle: {
          borderColor: '#94a3b8'
        },
        emphasis: {
          iconStyle: {
            borderColor: '#475569'
          }
        },
        feature: {
          dataZoom: {
            yAxisIndex: 'none',
            title: {
              zoom: '放大檢視',
              back: '返回原始範圍'
            }
          },
          restore: {
            title: '重設縮放'
          }
        }
      },
      grid: {
        top: 40,
        right: 24,
        bottom: 90,
        left: 48
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line',
          snap: true,
          lineStyle: {
            color: '#cbd5e1',
            width: 1
          }
        },
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 14,
        textStyle: {
          color: '#111827'
        },
        extraCssText: 'box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08); border-radius: 16px;',
        formatter: (params) => {
          const wavelength = params[0]?.axisValue ?? '--';
          const rows = params.map((item) => {
            const meta = item.seriesId ? series.find((entry) => entry.name === item.seriesName)?.meta : null;
            return `
              <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:4px;">
                <span style="font-size:10px;font-weight:600;color:#64748b;">
                  ${meta?.label ?? item.seriesName} | ${selectedComponent}: ${meta?.componentValue ?? '--'}
                </span>
                <span style="font-size:12px;font-weight:700;color:${item.color};">${item.data ?? '--'}</span>
              </div>
            `;
          }).join('');

          return `
            <div style="min-width:220px;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:0.18em;text-transform:uppercase;">Component</p>
              <p style="margin:0 0 4px;font-size:14px;font-weight:800;color:#0f172a;">${selectedComponent || '--'}</p>
              <p style="margin:0 0 10px;font-size:12px;font-weight:800;color:#0f172a;">${wavelength} nm</p>
              ${rows}
            </div>
          `;
        }
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: wavelengths,
        axisLine: {
          lineStyle: {
            color: '#e2e8f0'
          }
        },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 10
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 10
        },
        splitLine: {
          lineStyle: {
            color: '#f1f5f9'
          }
        }
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'none',
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: true
        },
        {
          type: 'slider',
          xAxisIndex: 0,
          height: 22,
          bottom: 24,
          borderColor: '#e2e8f0',
          fillerColor: 'rgba(101, 148, 117, 0.18)',
          backgroundColor: '#f8fafc',
          dataBackground: {
            lineStyle: {
              color: '#cbd5e1'
            },
            areaStyle: {
              color: 'rgba(203, 213, 225, 0.28)'
            }
          },
          selectedDataBackground: {
            lineStyle: {
              color: '#659475'
            },
            areaStyle: {
              color: 'rgba(101, 148, 117, 0.22)'
            }
          },
          moveHandleStyle: {
            color: '#659475'
          },
          handleStyle: {
            color: '#ffffff',
            borderColor: '#659475'
          },
          textStyle: {
            color: '#94a3b8'
          }
        }
      ],
      series
    }, true);

    if (series.length === 0 || wavelengths.length === 0) {
      chart.showLoading({
        text: 'No spectral data',
        showSpinner: false,
        fontSize: 14,
        color: '#94a3b8',
        textColor: '#94a3b8',
        maskColor: 'rgba(255,255,255,0.8)'
      });
    } else {
      chart.hideLoading();
    }

    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [isExpanded, selectedComponent, series, wavelengths]);

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-subtle flex flex-col h-[600px] overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-bold text-slate-800">光譜視覺化分析</h3>
            {selectedComponent && (
              <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Component: {selectedComponent}
              </span>
            )}
            <div className="relative border-l border-slate-100 pl-4">
              <select
                value={visibleSeries}
                onChange={(event) => setVisibleSeries(event.target.value)}
                className="min-w-40 appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 pr-10 text-[11px] font-bold uppercase tracking-wider text-slate-500 outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
              >
                {/*<option value="both">原始光譜 + 處理後光譜</option>*/}
                <option value="raw">原始光譜</option>
                <option value="processed">處理後光譜</option>
              </select>
              <div className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-400">
                <ChevronRight size={16} className="rotate-90" />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 transition hover:border-primary/30 hover:text-slate-700"
          >
            <Expand size={16} />
            放大
          </button>
        </div>

        <div className="flex-1 p-8 relative flex flex-col">
          <div className="flex-1 w-full bg-white rounded-2xl border border-slate-100 relative overflow-hidden">
            <div ref={chartRef} className="h-full w-full" />

          </div>
        </div>
      </div>
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-6">
          <div className="flex h-[92vh] w-full max-w-[1600px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-8 py-5">
              <div className="flex items-center gap-4">
                <h3 className="text-base font-bold text-slate-800">光譜視覺化分析</h3>
                {selectedComponent && (
                  <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Component: {selectedComponent}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 transition hover:border-primary/30 hover:text-slate-700"
              >
                <Shrink size={16} />
                關閉放大
              </button>
            </div>
            <div className="border-b border-slate-50 px-8 py-4">
              <div className="relative w-fit">
                <select
                  value={visibleSeries}
                  onChange={(event) => setVisibleSeries(event.target.value)}
                  className="min-w-40 appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 pr-10 text-[11px] font-bold uppercase tracking-wider text-slate-500 outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
                >
                  {/*<option value="both">原始光譜 + 處理後光譜</option>*/}
                  <option value="raw">原始光譜</option>
                  <option value="processed">處理後光譜</option>
                </select>
                <div className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-400">
                  <ChevronRight size={16} className="rotate-90" />
                </div>
              </div>
            </div>
            <div className="flex-1 p-8">
              <div className="h-full w-full overflow-hidden rounded-2xl border border-slate-100 bg-white">
                <div ref={expandedChartRef} className="h-full w-full" />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
