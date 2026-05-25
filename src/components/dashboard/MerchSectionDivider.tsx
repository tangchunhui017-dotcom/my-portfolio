'use client';

export default function MerchSectionDivider({ label, title }: { label: string; title: string }) {
  return (
    <div className="mt-10 mb-5 flex items-center gap-3">
      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        {label}
      </span>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <div className="flex-1 border-t border-slate-100" />
    </div>
  );
}
