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

  let foundItem: MappedItem | null = null;
  let foundSeries = null;
  for (const series of data.series) {
    const item = series.designItems.find((designItem) => designItem.itemId === itemId) as MappedItem | undefined;
    if (item) {
      foundItem = item;
      foundSeries = series;
      break;
    }
  }

  if (!foundItem || !foundSeries) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">单款未找到</h1>
          <p className="mt-2 text-slate-600">Item ID: {itemId} 不存在</p>
        </div>
      </div>
    );
  }

  const reviewRecord = foundItem.openclawReviewId ? loadDesignReviewById(foundItem.openclawReviewId) : null;
  const changeOrders = foundItem.changeOrderIds?.length
    ? loadChangeOrders().filter((changeOrder) => foundItem?.changeOrderIds?.includes(changeOrder.id))
    : [];

  const developmentPlan = foundSeries.developmentPlan.find((plan) => plan.skuCode === foundItem?.skuCode) ?? null;
  const relatedAssets = developmentPlan
    ? foundSeries.assets.filter((asset) => developmentPlan.referenceAssetIds.includes(asset.assetId))
    : foundSeries.assets.slice(0, 4);

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
