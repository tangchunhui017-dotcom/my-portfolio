import { assembleDesignReviewCenter } from '@/lib/design-review-center/assembler';
import SeriesDetailClient from './client';

interface SeriesDetailPageProps {
  params: Promise<{ seriesId: string }>;
}

export default async function SeriesDetailPage({ params }: SeriesDetailPageProps) {
  const { seriesId } = await params;
  const data = await assembleDesignReviewCenter();
  const series = data.series.find((s) => s.seriesId === seriesId);

  if (!series) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Series Not Found</h1>
          <p className="mt-2 text-slate-600">Series ID: {seriesId} does not exist</p>
        </div>
      </div>
    );
  }

  return <SeriesDetailClient series={series} waves={data.waves} timeline={data.timeline} />;
}