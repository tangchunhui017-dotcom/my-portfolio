'use client';

import React from 'react';

interface ChartContainerProps {
    title: string;
    children: React.ReactNode;
    description?: string;
    actions?: React.ReactNode;
}

export default function ChartContainer({
    title,
    children,
    description,
    actions
}: ChartContainerProps) {
    return (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                    {description && (
                        <p className="text-sm text-slate-600 mt-1">{description}</p>
                    )}
                </div>
                {actions && (
                    <div className="flex gap-2">
                        {actions}
                    </div>
                )}
            </div>

            <div className="w-full">
                {children}
            </div>
        </div>
    );
}
