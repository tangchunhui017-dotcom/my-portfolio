/**
 * src/app/dashboard/page.tsx
 *
 * Server Component：从本地 JSON 预载所有维度表 + 小事实表，
 * 通过 SWRConfig fallback 注入客户端缓存，首屏无加载状态。
 * 无 DB 调用，完全离线可用。
 */
import dimSkuData from '../../../data/dashboard/dim_sku.json';
import dimChannelData from '../../../data/dashboard/dim_channel.json';
import dimWavePlanData from '../../../data/dashboard/dim_wave_plan.json';
import dimCompetitorData from '../../../data/dashboard/dim_competitor.json';
import factInventoryData from '../../../data/dashboard/fact_inventory.json';
import factPlanData from '../../../data/dashboard/fact_plan.json';
import factCompetitorData from '../../../data/dashboard/fact_competitor.json';
import SWRFallbackProvider from './SWRFallbackProvider';
import DashboardPageClient from './DashboardPage.client';

export default function DashboardPage() {
    const fallback: Record<string, unknown> = {
        '/api/dashboard/dim-sku': dimSkuData,
        '/api/dashboard/dim-channel': dimChannelData,
        '/api/dashboard/dim-wave-plan': dimWavePlanData,
        '/api/dashboard/dim-competitor': dimCompetitorData,
        '/api/dashboard/fact-inventory': factInventoryData,
        '/api/dashboard/fact-plan': factPlanData,
        '/api/dashboard/fact-competitor': factCompetitorData,
    };

    return (
        <SWRFallbackProvider fallback={fallback}>
            <DashboardPageClient />
        </SWRFallbackProvider>
    );
}
