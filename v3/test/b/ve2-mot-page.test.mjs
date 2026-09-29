// PHIẾU VE2 · MÀN «MỘT PAGE» DỰNG LẠI THEO BẢN VẼ 2c — ba cột: danh sách page · một page (bật được chưa + bảy tab) ·
// thử hỏi bot. Bộ ca: cửa đọc danh sách page cho cột trái (nguồn bot THẬT, khai rõ khi đứng ở bản sao) + trang giữ đủ
// việc của màn cũ (công tắc · giao bot · còn thiếu gì · thiết lập · sản phẩm/giá/ảnh · kịch bản lưu-là-chạy · khối chung).
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import express from 'express';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungPhanB } = await import('../../src/vai-b.js');
const { bam } = await import('../../src/auth/mat-khau.js');
const { dungCongGia } = await import('../../testkit/db-gia.js');
const { boiCanhMay } = await import('../../src/auth/boi-canh.js');
const { datDocSanSang } = await import('../../src/ui/chung/bot-bat-that.js');

async function dungThu() {
  const mk = await bam('matkhau1');
  const { taoTruyVan } = dungCongGia({
    nguoi_dung: [
      { id: 'u1', email: 'qt@talpha.vn', mat_khau_hash: mk, ten: 'Chủ', hoat_dong: true },
      { id: 'u2', email: 'mkt@talpha.vn', mat_khau_hash: mk, ten: 'Ngọc', hoat_dong: true },
      { id: 'u3', email: 'sale@talpha.vn', mat_khau_hash: mk, ten: 'Linh', hoat_dong: true },
    ],
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false }, { id: 't2', slug: 'auus', ten: 'Auus', la_ky_thuat: false }],
    vai: [{ id: 'v1', ma: 'quan-tri', ten: 'Quản trị' }, { id: 'v2', ma: 'marketer', ten: 'Marketer' }, { id: 'v3', ma: 'sale', ten: 'Sale' }],
    thanh_vien_team: [
      { id: 'tv1', nguoi_dung_id: 'u1', team_id: 't1', vai_id: 'v1' },
      { id: 'tv2', nguoi_dung_id: 'u2', team_id: 't1', vai_id: 'v2' },
      { id: 'tv3', nguoi_dung_id: 'u3', team_id: 't1', vai_id: 'v3' },
    ],
    page: [
      { id: 'p1', team_id: 't1', page_id: 'fb-1', ten: 'Zahra Oman', thi_truong: 'Oman', san_pham_goc_ma: 'kreain', bot_ai_bat: false },
      { id: 'p2', team_id: 't1', page_id: 'fb-2', ten: 'Aloe KSA', thi_truong: '', san_pham_goc_ma: null, bot_ai_bat: true },
      { id: 'p3', team_id: 't2', page_id: 'fb-3', ten: 'Page team khác', thi_truong: 'EU', bot_ai_bat: true },
    ],
  });
  const app = express();
  dungPhanB(app, { taoTruyVan, taoTruyVanHeThong: () => taoTruyVan(boiCanhMay('_he_thong', 'đọc bảng dùng chung')), express });
  const sv = http.createServer(app);
  await new Promise((r) => sv.listen(0, r));
  const goc = `http://127.0.0.1:${sv.address().port}`;
  const vao = async (email) => {
    const dn = await fetch(`${goc}/api/dang-nhap`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, matKhau: 'matkhau1' }) });
    return dn.headers.get('set-cookie').split(';')[0];
  };
  return { goc, sv, vao };
}

test('P1 · /api/page-ds: page của team, xếp theo tên; bot bật lấy từ tiến trình bot, page bot không thấy thì lùi về bản sao', async (t) => {
  const { goc, sv, vao } = await dungThu();
  t.after(() => { sv.close(); datDocSanSang(null); });
  datDocSanSang(async () => ({ pages: [{ pageId: 'fb-1', aiEnabled: true }] }));
  const r = await fetch(`${goc}/api/page-ds`, { headers: { cookie: await vao('mkt@talpha.vn') } });
  assert.equal(r.status, 200, 'marketer mở được trang một page thì phải thấy được danh sách để chọn');
  const d = await r.json();
  assert.equal(d.nguonBot, 'bot');
  assert.deepEqual(d.ds.map((p) => [p.ten, p.thiTruong, p.botBat]), [['Aloe KSA', '', true], ['Zahra Oman', 'Oman', true]]);
  assert.ok(!d.ds.some((p) => p.ten === 'Page team khác'), 'page team khác lọt vào');
});

test('P2 · không hỏi được tiến trình bot ⇒ KHAI đang đứng ở bản sao, không im lặng đổi nguồn', async (t) => {
  const { goc, sv, vao } = await dungThu();
  t.after(() => { sv.close(); datDocSanSang(null); });
  datDocSanSang(async () => { throw new Error('ECONNREFUSED'); });
  const d = await (await fetch(`${goc}/api/page-ds`, { headers: { cookie: await vao('qt@talpha.vn') } })).json();
  assert.equal(d.nguonBot, 'ban_sao');
  assert.match(d.viSao, /ECONNREFUSED/);
  assert.deepEqual(d.ds.map((p) => p.botBat), [true, false], 'lùi về cột bản sao');
});

test('P3 · quyền như trang một page: sale bị chặn (403), chưa đăng nhập 401', async (t) => {
  const { goc, sv, vao } = await dungThu();
  t.after(() => sv.close());
  assert.equal((await fetch(`${goc}/api/page-ds`, { headers: { cookie: await vao('sale@talpha.vn') } })).status, 403);
  assert.equal((await fetch(`${goc}/api/page-ds`)).status, 401);
});

test('P4 · trang (VE2 · bản vẽ 2c): ba cột, bảy tab — và ĐỦ việc của màn cũ còn đường gọi', () => {
  const html = fs.readFileSync(new URL('../../src/ui/mot-page/trang/mot-page.html', import.meta.url), 'utf8');
  assert.match(html, /<main class="chia-ba">/);
  assert.match(html, /<nav class="chia-hai-trai" aria-label="Page">/);
  assert.match(html, /<aside class="cot-thu" aria-label="Thử hỏi bot">/);
  assert.match(html, /'\/api\/page-ds'/);
  const tab = html.match(/const TAB = (\[[\s\S]*?\]);/);
  assert.ok(tab, 'không thấy danh sách tab');
  assert.deepEqual([...tab[1].matchAll(/\['[a-z-]+', '([^']+)'\]/g)].map((x) => x[1]),
    ['Sản phẩm & giá', 'Lời bot', 'Ảnh', 'Trả lời sẵn', 'Kỹ thuật', 'Gợi ý cải thiện', 'Lịch sử']);
  // Việc của màn cũ — mỗi việc một cửa ghi/đọc còn nguyên:
  for (const [viec, re] of [
    ['bật/tắt bot', /\/api\/page-bot\/\$\{encodeURIComponent\(ID\)\}\/bot`/], ['giao bot', /\/api\/page-bot\/\$\{encodeURIComponent\(ID\)\}\/giao`/],
    ['thiết lập', /\/api\/page-bot\/\$\{encodeURIComponent\(ID\)\}\/\$\{duong\}`/], ['nội dung', /\/api\/page\/\$\{encodeURIComponent\(ID\)\}\/noi-dung`/],
    ['kịch bản lưu-là-chạy', /goi\(`\/api\/kich-ban\/page\/\$\{encodeURIComponent\(ID\)\}\/luu-chay`, \{/], ['lưu sản phẩm', /\/api\/anh-san-pham\/san-pham\//], ['ảnh', /\/api\/anh-san-pham\/anh\//],
    // VE4: khối chung SỬA ở Luật chung › «Chính sách · FAQ · Phản đối» — trang một page chỉ còn tóm tắt + lối đi.
    ['nối món POS', /\/api\/anh-san-pham\/pos\//], ['khối chung (lối sang Luật chung)', /href="\/khoi-chung"/],
    ['nguồn nhận tin (LL10)', /\/van-hanh-v3\?tab=pages/], ['giá gõ cứng', /function veGiaGoCung/],
  ]) assert.match(html, re, `mất việc «${viec}» khi dựng lại màn`);
  // Chỗ chưa có đường nói RÕ chưa có — không vẽ ô thử giả.
  assert.match(html, /phiếu LL14/);
  assert.match(html, /phiếu BH5/);
});
