/**
 * src/app/dashboard/page.tsx
 *
 * Server Component：在服务端并行预取所有维度表 + 小事实表，
 * 通过 SWRConfig fallback 注入客户端缓存，首屏无加载状态。
 * 大事实表（fact_sales / fact_ops）由客户端 SWR 懒加载，
 * 但因为本页预取已唤醒 Neon DB，后续请求不再有冷启动延迟。
 */
import { sql } from '@/lib/db';
import SWRFallbackProvider from './SWRFallbackProvider';
import DashboardPageClient from './DashboardPage.client';

export const runtime = 'edge';

export default async function DashboardPage() {
    const [dimSku, dimChannel, dimWavePlan, factInventory, factPlan, factCompetitor, dimCompetitor] =
        await Promise.all([
            sql`SELECT * FROM dim_sku`,
            sql`SELECT * FROM dim_channel`,
            sql`SELECT * FROM dim_wave_plan`,
            sql`SELECT * FROM fact_inventory`,
            sql`SELECT * FROM fact_plan`,
            sql`SELECT * FROM fact_competitor`,
            // dim_competitor 的 JSON 数组列需要在 DB 层展开
            sql`
                SELECT
                    id, name, position, market_share, yoy,
                    (SELECT json_agg(elem::json) FROM unnest(category_mix::text[])   AS elem) AS category_mix,
                    (SELECT json_agg(elem::json) FROM unnest(price_band_mix::text[]) AS elem) AS price_band_mix,
                    (SELECT json_agg(elem)       FROM unnest(trend_tags::text[])     AS elem) AS trend_tags,
                    (SELECT json_agg(elem::json) FROM unnest(hot_skus::text[])       AS elem) AS hot_skus
                FROM dim_competitor
            `,
        ]);

    const fallback: Record<string, unknown> = {
        '/api/dashboard/dim-sku': dimSku,
        '/api/dashboard/dim-channel': dimChannel,
        '/api/dashboard/dim-wave-plan': dimWavePlan,
        '/api/dashboard/dim-competitor': dimCompetitor,
        '/api/dashboard/fact-inventory': factInventory,
        '/api/dashboard/fact-plan': factPlan,
        '/api/dashboard/fact-competitor': factCompetitor,
    };

    return (
        <SWRFallbackProvider fallback={fallback}>
            <DashboardPageClient />
        </SWRFallbackProvider>
    );
}
