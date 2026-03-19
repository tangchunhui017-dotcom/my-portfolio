'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DesignItem } from '@/lib/design-review-center/types';
import { PHASE_MAP, REVIEW_STATUS_MAP, RISK_LEVEL_MAP } from '@/config/design-review-center/status-map';

interface DesignItemTableProps {
  items: DesignItem[];
  onItemClick?: (itemId: string) => void;
  selectedItemIds?: string[];
  onSelectionChange?: (itemIds: string[]) => void;
}

type SortKey = 'updatedAt' | 'targetLaunchDate' | 'nextReviewDate';
type SortOrder = 'asc' | 'desc';

const sourceLabel: Record<string, string> = {
  manual: '手动',
  openclaw: 'OpenClaw',
};

const syncLabel: Record<string, string> = {
  synced: '已同步',
  pending: '待同步',
  error: '异常',
};

function compareDateValue(aValue?: string | null, bValue?: string | null, sortOrder: SortOrder = 'desc') {
  const aTime = aValue ? new Date(aValue).getTime() : Number.NEGATIVE_INFINITY;
  const bTime = bValue ? new Date(bValue).getTime() : Number.NEGATIVE_INFINITY;
  return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
}

export default function DesignItemTable({
  items,
  onItemClick,
  selectedItemIds = [],
  onSelectionChange,
}: DesignItemTableProps) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortKey>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => compareDateValue(a[sortBy], b[sortBy], sortOrder));
  }, [items, sortBy, sortOrder]);

  const selectionEnabled = Boolean(onSelectionChange);
  const selectedSet = useMemo(() => new Set(selectedItemIds), [selectedItemIds]);
  const allSelected = selectionEnabled && sortedItems.length > 0 && sortedItems.every((item) => selectedSet.has(item.itemId));

  const triggerSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder((current) => (current === 'desc' ? 'asc' : 'desc'));
      return;
    }

    setSortBy(key);
    setSortOrder('desc');
  };

  const handleItemClick = (itemId: string) => {
    if (onItemClick) {
      onItemClick(itemId);
      return;
    }

    router.push(`/design-review-center/item/${itemId}`);
  };

  const toggleItemSelection = (itemId: string) => {
    if (!onSelectionChange) return;

    if (selectedSet.has(itemId)) {
      onSelectionChange(selectedItemIds.filter((currentId) => currentId !== itemId));
      return;
    }

    onSelectionChange([...selectedItemIds, itemId]);
  };

  const toggleAllSelection = () => {
    if (!onSelectionChange) return;

    if (allSelected) {
      const visibleIds = new Set(sortedItems.map((item) => item.itemId));
      onSelectionChange(selectedItemIds.filter((currentId) => !visibleIds.has(currentId)));
      return;
    }

    const merged = new Set(selectedItemIds);
    sortedItems.forEach((item) => merged.add(item.itemId));
    onSelectionChange([...merged]);
  };

  const columnCount = selectionEnabled ? 14 : 13;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              {selectionEnabled ? (
                <th className="p-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAllSelection}
                    aria-label="选择当前表格全部单款"
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                  />
                </th>
              ) : null}
              <th className="p-4">缩略图</th>
              <th className="p-4">款号</th>
              <th className="p-4">名称</th>
              <th className="p-4">系列</th>
              <th className="p-4">波段</th>
              <th className="p-4">品类</th>
              <th className="p-4">阶段</th>
              <th className="p-4">结论</th>
              <th className="p-4">风险</th>
              <th className="p-4">负责人</th>
              <th className="cursor-pointer p-4" onClick={() => triggerSort('nextReviewDate')}>
                下次评审 {sortBy === 'nextReviewDate' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th className="p-4">来源</th>
              <th className="cursor-pointer p-4" onClick={() => triggerSort('updatedAt')}>
                更新时间 {sortBy === 'updatedAt' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedItems.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="px-4 py-10 text-center text-sm text-slate-400">
                  当前筛选条件下没有单款记录。
                </td>
              </tr>
            ) : (
              sortedItems.map((item) => {
                const phaseConfig = PHASE_MAP[item.designStatus] ?? PHASE_MAP.concept;
                const reviewConfig = REVIEW_STATUS_MAP[item.reviewStatus ?? 'pending'];
                const riskConfig = RISK_LEVEL_MAP[item.riskLevel ?? 'medium'];
                const isSelected = selectedSet.has(item.itemId);

                return (
                  <tr
                    key={item.itemId}
                    className={`cursor-pointer transition-colors hover:bg-slate-50 ${isSelected ? 'bg-slate-50' : ''}`}
                    onClick={() => handleItemClick(item.itemId)}
                  >
                    {selectionEnabled ? (
                      <td className="p-4" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItemSelection(item.itemId)}
                          aria-label={`选择 ${item.itemName}`}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                        />
                      </td>
                    ) : null}
                    <td className="p-4">
                      <img src={item.thumbnailUrl} alt={item.itemName} className="h-12 w-12 rounded-lg object-cover" />
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-900">{item.skuCode}</td>
                    <td className="p-4 text-sm text-slate-900">
                      <div className="font-medium">{item.itemName}</div>
                      {item.reviewSummary ? <div className="mt-1 text-xs text-slate-500">{item.reviewSummary}</div> : null}
                    </td>
                    <td className="p-4 text-sm text-slate-600">{item.seriesName ?? item.seriesId}</td>
                    <td className="p-4 text-sm text-slate-600">{item.waveId ?? '-'}</td>
                    <td className="p-4 text-sm text-slate-600">{item.category}</td>
                    <td className="p-4">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${phaseConfig.bgColor} ${phaseConfig.textColor}`}>
                        {phaseConfig.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${reviewConfig.bgColor} ${reviewConfig.textColor}`}>
                        {reviewConfig.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${riskConfig.bgColor} ${riskConfig.textColor}`}>
                        <span>{riskConfig.icon}</span>
                        <span>{riskConfig.label}</span>
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600">{item.designer}</td>
                    <td className="p-4 text-xs text-slate-500">
                      {item.nextReviewDate ? new Date(item.nextReviewDate).toLocaleDateString('zh-CN') : '待定'}
                    </td>
                    <td className="p-4 text-xs text-slate-500">
                      {sourceLabel[item.source] ?? item.source} / {syncLabel[item.syncStatus] ?? item.syncStatus}
                    </td>
                    <td className="p-4 text-xs text-slate-500">{new Date(item.updatedAt).toLocaleDateString('zh-CN')}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
