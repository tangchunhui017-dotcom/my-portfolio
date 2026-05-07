'use client';
/**
 * src/context/GlobalConfigContext.tsx
 * 全局配置 Context（使用 React Context + localStorage，无需 Zustand）
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type ForecastBaseMode = 'last_year' | 'avg_2year' | 'avg_3year' | 'custom_weights';
export type GrowthRateMode = 'uniform' | 'seasonal' | 'monthly_custom';
export type ForecastMethod = 'growth_based' | 'driver_based' | 'hybrid';

export interface GlobalConfig {
    brand: {
        fiscalYear: number;
        baseYear: number;
        grossMarginRate: number;
        avgDiscountRate: number;
        markupMultiplier: number;
        taxRate: number;
        backendCostRate: number;
    };
    forecast: {
        method: ForecastMethod;
        baseMode: ForecastBaseMode;
        customWeights: Record<string, number>;
        growthRateMode: GrowthRateMode;
        uniformGrowthRate: number;
        seasonalRates: {
            spring: number;
            summer: number;
            autumn: number;
            winter: number;
        };
        monthlyGrowthRates: number[];
    };
    physicalDrivers: {
        avgUnitPriceLift: number;
        conversionRateLift: number;
        avgTicketLift: number;
        trafficLift: number;
        investmentBudget: number;
    };
    ecommerceDrivers: {
        refundRate: number;
        avgTicketLift: number;
        conversionRateLift: number;
        trafficCostLift: number;
        platformFeeRate: number;
        paymentFeeRate: number;
        customerServiceRate: number;
    };
    newStoreDrivers: {
        cityTier: 'tier1' | 'tier2' | 'tier3_plus';
        targetAreaSqm: number;
        salesPerSqmAnnual: number;
        weekdayTraffic: number;
        weekendTraffic: number;
        entryRate: number;
        conversionRate: number;
        avgTicket: number;
        annualRent: number;
        annualStaff: number;
        renovationAmortizedAnnual: number;
        utilitiesAnnual: number;
        otherAnnual: number;
    };
    cashflowManualOutflows: {
        marketing: number[];
        tradeShow: number[];
        platformFee: number[];
        staffCommission: number[];
        logistics: number[];
        rentDeposit: number[];
        fixedAsset: number[];
        travel: number[];
        financeCost: number[];
        other: number[];
    };
    isConfigured: boolean;
    configuredAt?: string;
}

const EMPTY_12 = (): number[] => Array(12).fill(0);

export const DEFAULT_CONFIG: GlobalConfig = {
    brand: {
        fiscalYear: 2025,
        baseYear: 2024,
        grossMarginRate: 0.42,
        avgDiscountRate: 0.85,
        markupMultiplier: 3.2,
        taxRate: 0.25,
        backendCostRate: 0.04,
    },
    forecast: {
        method: 'growth_based',
        baseMode: 'last_year',
        customWeights: { '2022': 0.2, '2023': 0.3, '2024': 0.5 },
        growthRateMode: 'uniform',
        uniformGrowthRate: 0.08,
        seasonalRates: { spring: 0.10, summer: 0.06, autumn: 0.10, winter: 0.08 },
        monthlyGrowthRates: Array(12).fill(0.08),
    },
    physicalDrivers: {
        avgUnitPriceLift: 0.03,
        conversionRateLift: 0.02,
        avgTicketLift: 0.03,
        trafficLift: 0.05,
        investmentBudget: 400000,
    },
    ecommerceDrivers: {
        refundRate: 0.137,
        avgTicketLift: 0.02,
        conversionRateLift: 0.015,
        trafficCostLift: 0.10,
        platformFeeRate: 0.05,
        paymentFeeRate: 0.004,
        customerServiceRate: 0.017,
    },
    newStoreDrivers: {
        cityTier: 'tier2',
        targetAreaSqm: 120,
        salesPerSqmAnnual: 8500,
        weekdayTraffic: 3000,
        weekendTraffic: 6000,
        entryRate: 0.03,
        conversionRate: 0.25,
        avgTicket: 480,
        annualRent: 720000,
        annualStaff: 480000,
        renovationAmortizedAnnual: 80000,
        utilitiesAnnual: 36000,
        otherAnnual: 24000,
    },
    cashflowManualOutflows: {
        marketing: EMPTY_12(),
        tradeShow: EMPTY_12(),
        platformFee: EMPTY_12(),
        staffCommission: EMPTY_12(),
        logistics: EMPTY_12(),
        rentDeposit: EMPTY_12(),
        fixedAsset: EMPTY_12(),
        travel: EMPTY_12(),
        financeCost: EMPTY_12(),
        other: EMPTY_12(),
    },
    isConfigured: false,
};

const LS_KEY = 'portfolio-global-config-v21';

function loadFromStorage(): GlobalConfig {
    if (typeof window === 'undefined') return DEFAULT_CONFIG;
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return DEFAULT_CONFIG;
        const parsed = JSON.parse(raw) as Partial<GlobalConfig>;
        // Deep merge with defaults to handle schema upgrades
        return deepMerge(DEFAULT_CONFIG, parsed) as GlobalConfig;
    } catch {
        return DEFAULT_CONFIG;
    }
}

function deepMerge(defaults: unknown, overrides: unknown): unknown {
    if (typeof defaults !== 'object' || defaults === null) return overrides ?? defaults;
    if (typeof overrides !== 'object' || overrides === null) return defaults;
    if (Array.isArray(defaults)) return Array.isArray(overrides) ? overrides : defaults;
    const result: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };
    for (const key of Object.keys(overrides as Record<string, unknown>)) {
        result[key] = deepMerge(
            (defaults as Record<string, unknown>)[key],
            (overrides as Record<string, unknown>)[key],
        );
    }
    return result;
}

interface GlobalConfigContextValue {
    config: GlobalConfig;
    updateConfig: (patch: Partial<GlobalConfig>) => void;
    updateForecast: (patch: Partial<GlobalConfig['forecast']>) => void;
    updatePhysicalDrivers: (patch: Partial<GlobalConfig['physicalDrivers']>) => void;
    updateEcommerceDrivers: (patch: Partial<GlobalConfig['ecommerceDrivers']>) => void;
    updateNewStoreDrivers: (patch: Partial<GlobalConfig['newStoreDrivers']>) => void;
    updateMonthlyGrowthRate: (monthIndex: number, rate: number) => void;
    updateManualOutflow: (key: keyof GlobalConfig['cashflowManualOutflows'], monthIndex: number, value: number) => void;
    markConfigured: () => void;
    resetConfig: () => void;
}

const GlobalConfigContext = createContext<GlobalConfigContextValue | null>(null);

export function GlobalConfigProvider({ children }: { children: ReactNode }) {
    const [config, setConfig] = useState<GlobalConfig>(() => loadFromStorage());

    const persist = useCallback((next: GlobalConfig) => {
        setConfig(next);
        if (typeof window !== 'undefined') {
            try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
        }
    }, []);

    const updateConfig = useCallback((patch: Partial<GlobalConfig>) => {
        setConfig(prev => {
            const next = { ...prev, ...patch };
            if (typeof window !== 'undefined') {
                try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
            }
            return next;
        });
    }, []);

    const updateForecast = useCallback((patch: Partial<GlobalConfig['forecast']>) => {
        setConfig(prev => {
            const next = { ...prev, forecast: { ...prev.forecast, ...patch } };
            if (typeof window !== 'undefined') {
                try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
            }
            return next;
        });
    }, []);

    const updatePhysicalDrivers = useCallback((patch: Partial<GlobalConfig['physicalDrivers']>) => {
        setConfig(prev => {
            const next = { ...prev, physicalDrivers: { ...prev.physicalDrivers, ...patch } };
            if (typeof window !== 'undefined') {
                try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
            }
            return next;
        });
    }, []);

    const updateEcommerceDrivers = useCallback((patch: Partial<GlobalConfig['ecommerceDrivers']>) => {
        setConfig(prev => {
            const next = { ...prev, ecommerceDrivers: { ...prev.ecommerceDrivers, ...patch } };
            if (typeof window !== 'undefined') {
                try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
            }
            return next;
        });
    }, []);

    const updateNewStoreDrivers = useCallback((patch: Partial<GlobalConfig['newStoreDrivers']>) => {
        setConfig(prev => {
            const next = { ...prev, newStoreDrivers: { ...prev.newStoreDrivers, ...patch } };
            if (typeof window !== 'undefined') {
                try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
            }
            return next;
        });
    }, []);

    const updateMonthlyGrowthRate = useCallback((monthIndex: number, rate: number) => {
        setConfig(prev => {
            const rates = [...prev.forecast.monthlyGrowthRates];
            rates[monthIndex] = rate;
            const next = { ...prev, forecast: { ...prev.forecast, monthlyGrowthRates: rates } };
            if (typeof window !== 'undefined') {
                try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
            }
            return next;
        });
    }, []);

    const updateManualOutflow = useCallback((key: keyof GlobalConfig['cashflowManualOutflows'], monthIndex: number, value: number) => {
        setConfig(prev => {
            const arr = [...prev.cashflowManualOutflows[key]];
            arr[monthIndex] = value;
            const next = { ...prev, cashflowManualOutflows: { ...prev.cashflowManualOutflows, [key]: arr } };
            if (typeof window !== 'undefined') {
                try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
            }
            return next;
        });
    }, []);

    const markConfigured = useCallback(() => {
        setConfig(prev => {
            const next = { ...prev, isConfigured: true, configuredAt: new Date().toISOString() };
            if (typeof window !== 'undefined') {
                try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
            }
            return next;
        });
    }, []);

    const resetConfig = useCallback(() => {
        persist(DEFAULT_CONFIG);
    }, [persist]);

    return (
        <GlobalConfigContext.Provider value={{
            config, updateConfig, updateForecast,
            updatePhysicalDrivers, updateEcommerceDrivers, updateNewStoreDrivers,
            updateMonthlyGrowthRate, updateManualOutflow,
            markConfigured, resetConfig,
        }}>
            {children}
        </GlobalConfigContext.Provider>
    );
}

export function useGlobalConfig(): GlobalConfigContextValue {
    const ctx = useContext(GlobalConfigContext);
    if (!ctx) throw new Error('useGlobalConfig must be used within GlobalConfigProvider');
    return ctx;
}
