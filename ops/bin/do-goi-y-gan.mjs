#!/usr/bin/env node
// Chỉ đọc, mọi team; không xác nhận/gắn page thay người.
import pg from 'pg';
import { dsViecChuyen } from '../../src/products/chuyen-ban-sao.js';

const nguong = Number(process.env.GOI_Y_NGUONG || 0.8);
if (!Number.isFinite(nguong) || nguong < 0 || nguong > 1) throw new Error('GOI_Y_NGUONG phải từ 0 đến 1');
if (!process.env.DATABASE_URL_V3) throw new Error('Cần DATABASE_URL_V3 của môi trường muốn đo');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL_V3, max: 1 });
const db = await pool.connect();
try {
  await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const teams = (await db.query('SELECT id,slug FROM team ORDER BY slug')).rows;
  const result = [];
  for (const team of teams) {
    const d = await dsViecChuyen(db, team.id);
    result.push({ team: team.slug, dem: d.dem,
      goiYDuNguong: d.viec.filter((p) => p.goiY[0]?.diem >= nguong).length,
      mau: d.viec.slice(0, 10).map((p) => ({ page: p.pageFb, ten: p.ten, trangThai: p.trangThai,
        goiY: p.goiY[0] ? { mon: p.goiY[0].posMa, loai: p.goiY[0].loai, diem: p.goiY[0].diem } : null })) });
  }
  console.log(JSON.stringify({ chiDoc: true, nguong, chuaXongToanHe: result.reduce((n, r) => n + r.dem.chuaXong, 0), team: result }, null, 2));
} finally {
  await db.query('ROLLBACK').catch(() => {});
  db.release(); await pool.end();
}
