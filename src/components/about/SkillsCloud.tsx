'use client';

import { useEffect, useRef } from 'react';

interface SkillItem {
    name: string;
    nameEn: string;
    weight: number;
}

export default function SkillsCloud({ skills }: { skills: SkillItem[] }) {
    const chartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chartRef.current) return;

        let chart: any = null;

        const initChart = async () => {
            const echarts = await import('echarts');
            await import('echarts-wordcloud');

            if (!chartRef.current) return;
            chart = echarts.init(chartRef.current);

            const data = skills.map((skill) => ({
                name: skill.name,
                value: skill.weight,
            }));

            const option = {
                tooltip: {
                    show: true,
                    formatter: (params: any) => {
                        const skill = skills.find(s => s.name === params.name);
                        return `${params.name} (${skill?.nameEn})<br/>熟练度: ${params.value}%`;
                    }
                },
                series: [{
                    type: 'wordCloud',
                    shape: 'circle',
                    left: 'center',
                    top: 'center',
                    width: '90%',
                    height: '90%',
                    sizeRange: [14, 48],
                    rotationRange: [-30, 30],
                    rotationStep: 15,
                    gridSize: 8,
                    drawOutOfBound: false,
                    layoutAnimation: true,
                    textStyle: {
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        fontWeight: 'bold',
                        color: () => {
                            const colors = [
                                '#1e293b', '#334155', '#475569',
                                '#0f766e', '#0e7490', '#1d4ed8',
                                '#7c3aed', '#be185d', '#c2410c',
                            ];
                            return colors[Math.floor(Math.random() * colors.length)];
                        },
                    },
                    emphasis: {
                        textStyle: {
                            color: '#0f172a',
                            fontSize: 52,
                            fontWeight: 'bolder',
                        },
                    },
                    data,
                }],
            };

            chart.setOption(option);
        };

        initChart();

        const handleResize = () => chart?.resize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart?.dispose();
        };
    }, [skills]);

    return <div ref={chartRef} className="w-full h-[350px]" />;
}
