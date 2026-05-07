/**
 * src/lib/db.ts
 * Neon PostgreSQL 连接工具（HTTP 模式，兼容 Cloudflare Edge Runtime）
 */
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL 未配置，请在 .env.local 中设置');
}

export const sql = neon(process.env.DATABASE_URL);
