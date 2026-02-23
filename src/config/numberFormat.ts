type MoneyFormatOptions = {
    yiDigits?: number;
    wanDigits?: number;
    showSymbol?: boolean;
    signed?: boolean;
};

export function formatMoneyCny(value: number, options: MoneyFormatOptions = {}) {
    if (!Number.isFinite(value)) return '--';
    const {
        yiDigits = 2,
        wanDigits = 1,
        showSymbol = true,
        signed = false,
    } = options;

    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : signed && value > 0 ? '+' : '';
    const symbol = showSymbol ? '¥' : '';

    if (abs >= 100_000_000) return `${sign}${symbol}${(abs / 100_000_000).toFixed(yiDigits)}亿`;
    if (abs >= 10_000) return `${sign}${symbol}${(abs / 10_000).toFixed(wanDigits)}万`;
    return `${sign}${symbol}${Math.round(abs).toLocaleString('zh-CN')}`;
}

export function formatMoneyFromWan(wanValue: number, options: MoneyFormatOptions = {}) {
    return formatMoneyCny(wanValue * 10_000, options);
}
