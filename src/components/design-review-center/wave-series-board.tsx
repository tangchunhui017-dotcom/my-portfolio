'use client';

import type { Wave, SeriesWithBrief } from '@/lib/design-review-center/types';
import SeriesExpressionCard from './series-expression-card';

interface WaveSeriesBoardProps {
  waves: Wave[];
  seriesByWave: Record<string, SeriesWithBrief[]>;
  productMatrix?: {
    hero: number;
    core: number;
    filler: number;
  };
}

export default function WaveSeriesBoard({ waves, seriesByWave, productMatrix }: WaveSeriesBoardProps) {
  return (
    <div className="space-y-6">
      {productMatrix && (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">产品构架矩阵摘要</h3>
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{productMatrix.hero}</div>
              <div className="text-xs text-slate-600">Hero 款</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{productMatrix.core}</div>
              <div className="text-xs text-slate-600">Core 款</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-600">{productMatrix.filler}</div>
              <div className="text-xs text-slate-600">Filler 款</div>
            </div>
          </div>
        </div>
      )}

      {waves.map((wave) => {
        const series = seriesByWave[wave.waveId] || [];
        if (series.length === 0) return null;

        return (
          <div key={wave.waveId} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{wave.waveName}</h3>
                <div className="mt-1 text-sm text-slate-600">{wave.theme} · {wave.launchWindow}</div>
              </div>
              <div className="text-sm text-slate-600">{series.length} 个系列</div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {series.map((seriesRecord) => (
                <SeriesExpressionCard key={seriesRecord.seriesId} series={seriesRecord} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
