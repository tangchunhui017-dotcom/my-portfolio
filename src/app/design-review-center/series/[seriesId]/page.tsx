import { assembleDesignReviewCenter } from '@/lib/design-review-center/assembler';
import SeriesDetailClient from './client';

interface SeriesDetailPageProps {
  params: Promise<{ seriesId: string }>;
}

export default async function SeriesDetailPage({ params }: SeriesDetailPageProps) {
  const { seriesId } = await params;
  const data = await assembleDesignReviewCenter();
  const series = data.derived.bySeries[seriesId]?.legacySeries;

  if (!series) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">系列未找到</h1>
          <p className="mt-2 text-slate-600">当前不存在 ID 为 {seriesId} 的系列记录。</p>
        </div>
      </div>
    );
  }

  return <SeriesDetailClient series={series} waves={data.waves} timeline={data.timeline} />;
}
