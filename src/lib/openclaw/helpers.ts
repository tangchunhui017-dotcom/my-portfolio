import type { OpenClawRecord } from './schema';

export function getLatestUpdateTime(records: OpenClawRecord[]): string | null {
  if (!records.length) return null;
  return records.reduce((latest, record) => (record.updated_at > latest ? record.updated_at : latest), records[0].updated_at);
}

const AGENT_INFO: Record<string, { label: string; color: string }> = {
  planner: { label: '\u4f01\u5212\u5f15\u64ce', color: 'text-pink-600 bg-pink-50' },
  'design-review': { label: '\u8bc4\u5ba1\u5f15\u64ce', color: 'text-sky-600 bg-sky-50' },
  research: { label: '\u7814\u7a76\u5f15\u64ce', color: 'text-violet-600 bg-violet-50' },
  director: { label: '\u51b3\u7b56\u5f15\u64ce', color: 'text-indigo-600 bg-indigo-50' },
  'ops-merch': { label: '\u8fd0\u8425\u5f15\u64ce', color: 'text-amber-600 bg-amber-50' },
};

export function getDataSourceInfo(agent: string) {
  return AGENT_INFO[agent] ?? { label: agent, color: 'text-slate-600 bg-slate-50' };
}

export function filterBySeason<T extends OpenClawRecord>(records: T[], season: string): T[] {
  return records.filter((record) => record.season === season);
}

export function filterByWave<T extends OpenClawRecord>(records: T[], wave: string): T[] {
  return records.filter((record) => record.wave === wave);
}

export function filterByCategory<T extends OpenClawRecord>(records: T[], category: string): T[] {
  return records.filter((record) => record.category === category);
}

export function filterByPublishLevel<T extends OpenClawRecord>(records: T[], level: string): T[] {
  return records.filter((record) => record.publish_level === level);
}

export function sortByUpdatedAt<T extends OpenClawRecord>(records: T[], desc = true): T[] {
  return [...records].sort((a, b) => (desc ? b.updated_at.localeCompare(a.updated_at) : a.updated_at.localeCompare(b.updated_at)));
}

export function formatUpdateTime(iso: string): string {
  try {
    const date = new Date(iso);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  } catch {
    return iso;
  }
}