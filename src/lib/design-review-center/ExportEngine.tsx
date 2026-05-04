'use client';

/**
 * 一键企划书生成引擎 (Export Engine)
 * 
 * 将设计企划中心的核心可视化面板（金字塔、象限图、矩阵表）
 * 导出为横版 A3 PDF，直接作为周会/季报交付件。
 *
 * 技术方案：html2canvas-pro (截图) + jsPDF (PDF 生成)
 */

import { useState, useCallback } from 'react';

interface ExportConfig {
  /** 导出的 DOM 区域选择器，默认整个产品架构 Tab */
  selector?: string;
  /** 文件名前缀 */
  filenamePrefix?: string;
  /** 页眉文字 */
  headerText?: string;
  /** 页脚文字 */
  footerText?: string;
}

const DEFAULT_CONFIG: ExportConfig = {
  selector: undefined,
  filenamePrefix: '设计企划书',
  headerText: '产品架构企划书',
  footerText: '机密文件 · 仅限内部使用',
};

async function captureAndExport(
  targetElement: HTMLElement,
  config: ExportConfig,
) {
  // 动态导入以避免 SSR 问题
  const [html2canvasModule, jsPDFModule] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
  ]);

  const html2canvas = html2canvasModule.default;
  const { jsPDF } = jsPDFModule;

  // A3 横版尺寸 (mm)
  const pageWidth = 420;
  const pageHeight = 297;
  const marginX = 16;
  const marginY = 20;
  const headerHeight = 18;
  const footerHeight = 14;
  const contentWidth = pageWidth - marginX * 2;
  const contentHeight = pageHeight - marginY * 2 - headerHeight - footerHeight;

  // 截图
  const canvas = await html2canvas(targetElement, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#FFFFFF',
    logging: false,
    windowWidth: 1600,
  });

  const imgData = canvas.toDataURL('image/png');
  const imgAspectRatio = canvas.width / canvas.height;

  // 创建 PDF
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a3',
  });

  // 计算缩放：优先填满宽度
  let renderWidth = contentWidth;
  let renderHeight = renderWidth / imgAspectRatio;

  // 如果单页放不下，分页处理
  const totalPages = Math.ceil(renderHeight / contentHeight);
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();

    // ── 页眉 ──
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(config.headerText ?? '', marginX, 8);
    doc.text(`${dateStr} · Page ${page + 1}/${totalPages}`, pageWidth - marginX, 8, { align: 'right' });

    // ── 内容区 ──
    const sourceY = page * contentHeight;
    const sourceYPx = (sourceY / renderHeight) * canvas.height;
    const sliceHeightPx = Math.min(
      (contentHeight / renderHeight) * canvas.height,
      canvas.height - sourceYPx,
    );

    // 创建裁切的 canvas
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = Math.round(sliceHeightPx);
    const ctx = sliceCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(
        canvas,
        0, Math.round(sourceYPx), canvas.width, Math.round(sliceHeightPx),
        0, 0, canvas.width, Math.round(sliceHeightPx),
      );
    }

    const sliceData = sliceCanvas.toDataURL('image/png');
    const sliceRenderHeight = Math.min(contentHeight, renderHeight - sourceY);

    doc.addImage(
      sliceData,
      'PNG',
      marginX,
      marginY + headerHeight,
      renderWidth,
      sliceRenderHeight,
    );

    // ── 页脚 ──
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFontSize(7);
    doc.text(config.footerText ?? '', marginX, pageHeight - 4);
    doc.text(`Powered by Footwear Planning System`, pageWidth - marginX, pageHeight - 4, { align: 'right' });
  }

  // 下载
  const filename = `${config.filenamePrefix}_${dateStr}.pdf`;
  doc.save(filename);
  return filename;
}

/** Hook：提供导出状态管理 */
export function useArchitectureExport(config?: Partial<ExportConfig>) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const exportPDF = useCallback(async (targetRef?: React.RefObject<HTMLElement | null>) => {
    setExporting(true);
    setError(null);

    try {
      let target: HTMLElement | null = null;

      if (targetRef?.current) {
        target = targetRef.current;
      } else if (mergedConfig.selector) {
        target = document.querySelector(mergedConfig.selector);
      }

      if (!target) {
        throw new Error('找不到导出目标区域，请确认页面元素已加载。');
      }

      await captureAndExport(target, mergedConfig);
    } catch (err) {
      const message = err instanceof Error ? err.message : '导出失败';
      setError(message);
      console.error('[ExportEngine]', err);
    } finally {
      setExporting(false);
    }
  }, [mergedConfig]);

  return { exporting, error, exportPDF };
}

/** 导出按钮组件 */
export function ExportButton({
  targetRef,
  config,
  className,
}: {
  targetRef?: React.RefObject<HTMLElement | null>;
  config?: Partial<ExportConfig>;
  className?: string;
}) {
  const { exporting, error, exportPDF } = useArchitectureExport(config);

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={exporting}
        onClick={() => exportPDF(targetRef)}
        className={
          className ??
          'flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
        }
      >
        {exporting ? (
          <>
            <svg className="h-4 w-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-25" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            生成中…
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 3v10m0 0l-3-3m3 3l3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            导出 A3 企划书 (PDF)
          </>
        )}
      </button>
      {error && <div className="text-xs text-red-500">{error}</div>}
    </div>
  );
}
