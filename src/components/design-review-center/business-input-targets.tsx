'use client';

import type { BusinessInputTargets } from '@/lib/design-review-center/types';

interface Props {
  targets: BusinessInputTargets;
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
      {children}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-xs border-b border-slate-50 last:border-0">
      <span className="text-slate-400 flex-shrink-0">{label}</span>
      <span className={`text-right ${bold ? 'font-bold text-blue-700' : 'font-medium text-slate-700'}`}>{value}</span>
    </div>
  );
}

export default function BusinessInputTargetsPanel({ targets }: Props) {
  const maxChannelShare = Math.max(...targets.channels.map((c) => c.share));

  return (
    <section className="rounded-lg border border-slate-200/80 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-1">
          Business Input &amp; Targets
        </div>
        <h2 className="text-xl font-bold text-slate-900">本季业务输入与企划目标</h2>
        <p className="mt-1 text-xs text-slate-400">消费者画像、渠道结构、业务目标、品类 / 价格带规划</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* 1. Consumer */}
        <div className="rounded-lg border border-slate-200 p-4">
          <SectionTitle>目标消费者</SectionTitle>
          <Row label="年龄 / 性别" value={`${targets.consumer.ageRange} · ${targets.consumer.gender}`} />
          <Row label="穿着场景" value={targets.consumer.scenes.join(' / ')} />
          <Row label="价格敏感度" value={targets.consumer.priceSensitivity} />
          {targets.consumer.purchaseDrivers && targets.consumer.purchaseDrivers.length > 0 && (
            <div className="mt-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">核心购买驱动</span>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {targets.consumer.purchaseDrivers.map((d) => (
                  <span
                    key={d}
                    className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-blue-700"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. Business Targets */}
        <div className="rounded-lg border border-slate-200 p-4">
          <SectionTitle>业务目标</SectionTitle>
          <Row label="销售额目标" value={targets.businessTargets.salesAmount} bold />
          <Row label="销量目标" value={targets.businessTargets.salesVolume} />
          <Row label="毛利目标" value={targets.businessTargets.marginTarget} bold />
          <Row label="上市窗口" value={targets.businessTargets.launchWindow} />
          {/* Launch phases timeline */}
          {targets.businessTargets.launchPhases && targets.businessTargets.launchPhases.length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">上市节拍</div>
              <div className="relative flex items-center">
                {/* Track line */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 z-0" />
                <div className="relative z-10 flex items-center justify-between w-full">
                  {targets.businessTargets.launchPhases.map((phase, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-slate-700 whitespace-nowrap">{phase.label}</div>
                        <div className="text-[9px] text-slate-400 whitespace-nowrap">{phase.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Channels */}
        <div className="rounded-lg border border-slate-200 p-4">
          <SectionTitle>目标渠道</SectionTitle>
          <div className="space-y-2">
            {targets.channels.map((ch) => (
              <div key={ch.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={ch.priority === 'primary' ? 'font-semibold text-slate-800' : 'text-slate-500'}>
                    {ch.name}
                  </span>
                  <span className="font-bold text-slate-700">{ch.share}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${ch.priority === 'primary' ? 'bg-blue-500' : 'bg-slate-300'}`}
                    style={{ width: `${(ch.share / maxChannelShare) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Category Mix */}
        <div className="rounded-lg border border-slate-200 p-4">
          <SectionTitle>品类结构</SectionTitle>
          <div className="space-y-2.5">
            {targets.categoryMix.map((cat) => (
              <div key={cat.category}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">{cat.category}</span>
                  <span className="text-slate-500">{cat.share}% · {cat.skuCount}款</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-violet-400" style={{ width: `${cat.share}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Price Bands — full width */}
      <div className="mt-4 rounded-lg border border-slate-200 p-4">
        <SectionTitle>价格带规划</SectionTitle>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-1.5 text-left font-semibold text-slate-500">价格层</th>
                <th className="pb-1.5 text-left font-semibold text-slate-500">定位</th>
                <th className="pb-1.5 text-right font-semibold text-slate-500">MSRP 区间</th>
                <th className="pb-1.5 text-right font-semibold text-slate-500">目标 SKU</th>
              </tr>
            </thead>
            <tbody>
              {targets.priceBands.map((pb) => (
                <tr key={pb.band} className="border-b border-slate-50 last:border-0">
                  <td className="py-2 font-bold text-slate-800">{pb.band}</td>
                  <td className="py-2 text-slate-500">{pb.label}</td>
                  <td className="py-2 text-right font-medium text-slate-700">{pb.msrpRange}</td>
                  <td className="py-2 text-right font-black text-blue-700">{pb.targetSkus} 款</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
