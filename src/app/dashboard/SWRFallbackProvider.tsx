'use client';

import { SWRConfig } from 'swr';

export default function SWRFallbackProvider({
    fallback,
    children,
}: {
    fallback: Record<string, unknown>;
    children: React.ReactNode;
}) {
    return <SWRConfig value={{ fallback }}>{children}</SWRConfig>;
}
