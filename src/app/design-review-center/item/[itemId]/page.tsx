import { assembleDesignReviewCenter } from '@/lib/design-review-center/assembler';
import { loadChangeOrders, loadDesignReviewById } from '@/lib/openclaw/loader';
import type { DesignItem } from '@/lib/design-review-center/types';
import ItemDetailClient from './client';

interface ItemDetailPageProps {
  params: Promise<{ itemId: string }>;
}

type MappedItem = DesignItem & {
  openclawReviewId?: string;
  changeOrderIds?: string[];
};

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { itemId } = await params;
  const data = await assembleDesignReviewCenter();
  const styleAggregate = data.derived.byStyle[itemId];
  const foundItem = (styleAggregate?.legacyItem as MappedItem | undefined) ?? null;
  const foundSeries = styleAggregate ? data.derived.bySeries[styleAggregate.style.seriesId]?.legacySeries ?? null : null;

  if (!foundItem || !foundSeries) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">单款未找到</h1>
          <p className="mt-2 text-slate-600">当前不存在 ID 为 {itemId} 的单款记录。</p>
        </div>
      </div>
    );
  }

  const reviewRecord = foundItem.openclawReviewId ? loadDesignReviewById(foundItem.openclawReviewId) : null;
  const changeOrders = foundItem.changeOrderIds?.length
    ? loadChangeOrders().filter((changeOrder) => foundItem.changeOrderIds?.includes(changeOrder.id))
    : [];

  const developmentPlan = foundSeries.developmentPlan.find((plan) => plan.skuCode === foundItem.skuCode) ?? null;
  const relatedAssets = foundSeries.assets.filter((asset) => asset.relatedItemId === foundItem.itemId).slice(0, 4);

  return (
    <ItemDetailClient
      item={foundItem}
      series={foundSeries}
      reviewRecord={reviewRecord}
      changeOrders={changeOrders}
      developmentPlan={developmentPlan}
      relatedAssets={relatedAssets}
    />
  );
}
