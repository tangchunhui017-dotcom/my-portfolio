'use client';
/**
 * src/components/config/panels/UserPreferencesPanel.tsx
 * 用户偏好设置面板（P1 基础版）
 */
export default function UserPreferencesPanel() {
    return (
        <div className="space-y-6">
            <section>
                <h3 className="text-base font-bold text-slate-800 mb-3">显示设置</h3>
                <div className="space-y-3">
                    <label className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                        <div>
                            <div className="text-sm text-slate-700 font-medium">同比对比</div>
                            <div className="text-xs text-slate-400">默认开启同比数据对比</div>
                        </div>
                        <input type="checkbox" defaultChecked className="rounded" />
                    </label>
                    <label className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                        <div>
                            <div className="text-sm text-slate-700 font-medium">数字格式</div>
                            <div className="text-xs text-slate-400">万元 / 元 两种金额显示格式</div>
                        </div>
                        <select className="border border-slate-200 rounded px-2 py-1 text-sm">
                            <option>万元</option>
                            <option>元</option>
                        </select>
                    </label>
                </div>
            </section>
            <section>
                <h3 className="text-base font-bold text-slate-800 mb-1">默认 Tab</h3>
                <p className="text-xs text-slate-400 mb-3">进入 Dashboard 时默认展示的标签页</p>
                <select className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-full max-w-xs">
                    <option value="overview">总览</option>
                    <option value="annual-control">年度总控</option>
                    <option value="region-store">区域&门店</option>
                </select>
            </section>
            <p className="text-xs text-slate-400">更多个性化配置将在 P2 阶段实现（主题、收藏指标、快捷筛选）</p>
        </div>
    );
}
