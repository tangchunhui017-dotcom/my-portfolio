// AUTO-GENERATED from data/merch_config/brands/premium_brand/

export const PREMIUM_BRAND_DATA = {
  "brandMeta": {
    "brandId": "premium_brand",
    "brandName": "Aurora Premium (Demo)",
    "industry": "footwear",
    "industryTemplateVersion": "1.0.0",
    "logo": "💎",
    "color": "#a855f7",
    "createdAt": "2026-05-16",
    "fiscalYear": 2026,
    "baseYear": 2025
  },
  "metricOverrides": [],
  "dimensionOverrides": [],
  "thresholdOverrides": [
    {
      "thresholdId": "sellThroughRate_health",
      "defaultValue": 0.85,
      "warningValue": 0.70,
      "criticalValue": 0.55
    },
    {
      "thresholdId": "grossMarginRate_health",
      "defaultValue": 0.55,
      "warningValue": 0.48,
      "criticalValue": 0.42
    },
    {
      "thresholdId": "weeksOfSupply_max",
      "defaultValue": 6,
      "warningValue": 10,
      "criticalValue": 16
    }
  ]
} as const;
