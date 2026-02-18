import React from 'react';

interface ConclusionCardProps {
    discovery: string;
    decision: string;
    result: string;
    variant?: 'default' | 'highlight';
}

export default function ConclusionCard({
    discovery,
    decision,
    result,
    variant = 'default'
}: ConclusionCardProps) {
    const bgColor = variant === 'highlight'
        ? 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300'
        : 'bg-white border-slate-200';

    return (
        <div className={`${bgColor} border rounded-lg p-6 shadow-sm space-y-4`}>
            <div>
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    发现 Discovery
                </h4>
                <p className="text-slate-800">{discovery}</p>
            </div>

            <div className="border-t border-slate-200 pt-4">
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    决策 Decision
                </h4>
                <p className="text-slate-800">{decision}</p>
            </div>

            <div className="border-t border-slate-200 pt-4">
                <h4 className="text-sm font-semibold text-emerald-600 uppercase tracking-wide mb-2">
                    结果 Result
                </h4>
                <p className="text-slate-900 font-medium">{result}</p>
            </div>
        </div>
    );
}
