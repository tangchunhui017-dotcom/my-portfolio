'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
    value: string;
    label: string;
    labelEn: string;
}

export default function AnimatedCounter({ value, label, labelEn }: AnimatedCounterProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [displayValue, setDisplayValue] = useState('0');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.3 }
        );

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        // Extract numeric part from value like "200万+", "35万", "16+", "2x"
        const numMatch = value.match(/(\d+)/);
        if (!numMatch) {
            setDisplayValue(value);
            return;
        }

        const target = parseInt(numMatch[1]);
        const suffix = value.replace(numMatch[1], '');
        const duration = 1500;
        const steps = 40;
        const stepTime = duration / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += target / steps;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            setDisplayValue(Math.floor(current) + suffix);
        }, stepTime);

        return () => clearInterval(timer);
    }, [isVisible, value]);

    return (
        <div ref={ref} className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-slate-900 mb-2 tabular-nums">
                {isVisible ? displayValue : '0'}
            </div>
            <div className="text-sm font-medium text-slate-700">{label}</div>
            <div className="text-xs text-slate-400">{labelEn}</div>
        </div>
    );
}
