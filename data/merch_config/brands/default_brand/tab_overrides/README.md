# default_brand · tab_overrides

每个文件对应一个 TabKey 的覆盖配置。命名约定：`{tabKey}.json`。

合法 TabKey（与 `src/types/merchConfig.ts` 的 `TabKey` 一致）：

```
overview / annual-control / region-store / consumer / category-ops /
wave-planning / otb / cashflow / forecast / pnl / competitor-trend /
inventory-health
```

## 文件结构

每份覆盖文件是一个 `Partial<TabConfig>`，只写要覆盖的字段，其它字段从行业模板继承。

```jsonc
// otb.json
{
  "sections": [
    { "id": "business-loop", "label": "业务闭环", "enabled": true, "order": 1 }
  ],
  "customSettings": {
    "defaultCaliber": "netNewOtb",
    "requireCashflowCheck": true
  }
}
```

合并规则（`src/utils/configLoader.ts` 实现）：

- `sections`：以行业模板为骨架，按 `id` 做 deep merge；行业不存在的 section 会追加到末尾。
- `customSettings`：浅合并（brand 优先）。

## 接入方式

1. 在 `src/utils/configLoader.ts` 的 `BRAND_REGISTRY[brandId].tabOverrides` 字段引用这些文件。
2. 用户也可以通过 `MerchConfigProvider` 暴露的 `saveTabOverride(tabKey, override)` 在运行时持久化到 localStorage（`merch_config_tab_overrides`）。

## 当前状态

`default_brand` 目前完全继承鞋类行业模板，未启用任何 tab override。
后续品牌如需差异化（如不同 OTB 计算口径、不同总览 section 顺序），按上方约定新增即可。
