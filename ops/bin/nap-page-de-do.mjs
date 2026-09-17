// NẠP CẤU HÌNH THẬT CỦA MỘT PAGE, ĐỂ ĐO — không phải để chạy thật.
//
// ─── VÌ SAO KHÔNG DÙNG `npm run di-tru` ────────────────────────────────────────────────
// Bộ di trú nạp MỌI thứ: 502 page, 12.576 hội thoại, 77 kịch bản. Muốn diễn tập một page
// thì không cần — và không nên: một CSDL dev phình 502 page làm mọi phép đếm trên màn vô
// nghĩa, còn hội thoại của khách thật thì chép sang máy dev là chép PII không có lý do.
//
// Lệnh này chép ĐÚNG hai thứ của ĐÚNG một page: kịch bản và sản phẩm/bảng giá.
//
//   node ops/bin/nap-page-de-do.mjs <page_id>          # nạp
//   node ops/bin/nap-page-de-do.mjs <page_id> --xem    # chỉ in ra, không ghi
//   ... --nguon <đường dẫn kb-overrides.json>          # bản dev KHÔNG có tệp này (cố ý),
//                                                       trỏ sang kho gốc
//
// ⛔ CHỈ chạy trên CSDL cục bộ. Nguồn là ảnh chụp `kb-overrides.json` của bản chạy thật —
//    ghi nó vào CSDL vận hành là đè cấu hình đang chạy bằng một bản có thể đã cũ.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pageId = String(process.argv[2] || '').trim();
const chiXem = process.argv.includes('--xem');
if (!pageId) throw Error('Dùng: node ops/bin/nap-page-de-do.mjs <page_id> [--xem]');

const url = process.env.DATABASE_URL_V3;
if (!url) throw Error('thiếu DATABASE_URL_V3 (chạy bằng `node --env-file=.env`)');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname)) {
  throw Error('CHỈ chạy trên CSDL cục bộ — nguồn là ảnh chụp cấu hình, không phải bản đang chạy.');
}

const i = process.argv.indexOf('--nguon');
const tepNguon = i > 0 ? process.argv[i + 1] : path.join(GOC, 'kb-overrides.json');
if (!fs.existsSync(tepNguon)) {
  throw Error(
    `không thấy ${tepNguon}. Bản dev sạch CỐ Ý không chép tệp cấu hình của bản chạy thật `
    + `sang — trỏ bằng --nguon <đường dẫn kb-overrides.json> của kho gốc.`,
  );
}
const kb = JSON.parse(fs.readFileSync(tepNguon, 'utf8'));
const muc = kb[pageId];
if (!muc) throw Error(`kb-overrides.json không có page ${pageId} — page này chưa từng được cấu hình ở bản chạy thật.`);

const cfg = muc.config || {};
const sp = Array.isArray(muc.products) ? muc.products : [];
const TE = { AED: 100, SAR: 100, QAR: 100, USD: 100, KWD: 100, OMR: 100, BHD: 100 };

console.log(`page ${pageId}`);
console.log(`  kịch bản : greeting ${String(cfg.greeting || '').length} ký tự · salesPrompt ${String(cfg.salesPrompt || '').length} ký tự · tone ${String(cfg.tone || '').length}`);
for (const x of sp) {
  const bac = (x.tiers || []).map((t) => `${t.label || '?'} = ${t.price} ${x.currency || ''}`).join(' · ');
  console.log(`  sản phẩm : ${x.id} ${x.name || '(không tên)'} · ${(x.images || []).length} ảnh · ${bac || 'không có bậc giá'}`);
}
if (chiXem) process.exit(0);

const pool = new pg.Pool({ connectionString: url });
try {
  const p = (await pool.query('SELECT id, team_id, ten FROM page WHERE page_id = $1', [pageId])).rows[0];
  if (!p) throw Error(`page ${pageId} chưa có trong bảng \`page\` — quét Pancake rồi kéo về team trước.`);
  const teamId = p.team_id;

  // ① KỊCH BẢN. Bản LIVE, phiên bản 1 — cùng khuôn `napKichBan` của bộ di trú cho mục
  //    kb-overrides không có tệp lịch sử. `noi_dung_may` là bản đã ráp cho máy đọc.
  // `lamSach` KHÔNG export (cố ý — nó là nội bộ của bộ di trú). Bản người ở đây dựng
  // bằng đúng ba trường mà `dungBanChoMay` đọc, để hai bản không nói hai chuyện.
  const { dungBanChoMay } = await import(`${GOC}/db/di-tru/nguon.js`);
  const nguoi = {
    greeting: String(cfg.greeting || '').trim(),
    tone: String(cfg.tone || '').trim(),
    salesPrompt: String(cfg.salesPrompt || '').trim(),
  };
  const may = dungBanChoMay(cfg, (x) => String(x ?? ''));
  await pool.query(
    `INSERT INTO kich_ban (team_id, page_id, phien_ban, trang_thai, noi_dung_nguoi, noi_dung_may, nguoi_sua, ghi_chu)
     VALUES ($1,$2,1,'LIVE',$3,$4,'nap-page-de-do','ảnh chụp kb-overrides.json — nạp để DIỄN TẬP, không phải cấu hình do người soạn ở v3')
     ON CONFLICT (page_id, phien_ban) DO UPDATE SET
       trang_thai='LIVE', noi_dung_nguoi=EXCLUDED.noi_dung_nguoi, noi_dung_may=EXCLUDED.noi_dung_may,
       nguoi_sua=EXCLUDED.nguoi_sua, ghi_chu=EXCLUDED.ghi_chu, sua_luc=now()`,
    [teamId, p.id, JSON.stringify(nguoi), may],
  );

  // ② SẢN PHẨM + BẢNG GIÁ. `gia` ở ĐƠN VỊ NHỎ (quy ước migration 007) — nhân hệ số tệ ở
  //    đây, và KHÔNG nhân lần nữa ở cửa tạo đơn.
  let soGia = 0;
  for (const x of sp) {
    const ma = `kb:${pageId}:${x.id || 'SP01'}`;
    const te = String(x.currency || '').toUpperCase();
    const heSo = TE[te];
    const r = await pool.query(
      `INSERT INTO san_pham (team_id, page_id, ma, ten, mo_ta, nguon, cau_hinh_tay)
       VALUES ($1,$2,$3,$4,$5,'kb-overrides',true)
       ON CONFLICT (team_id, ma) DO UPDATE SET ten=EXCLUDED.ten, mo_ta=EXCLUDED.mo_ta, sua_luc=now()
       RETURNING id`,
      [teamId, p.id, ma, String(x.name || '').trim(), String(x.desc || '').trim()],
    );
    const spId = r.rows[0].id;
    await pool.query('DELETE FROM goi_gia WHERE team_id=$1 AND san_pham_id=$2', [teamId, spId]);
    const bac = (x.tiers || []).length ? x.tiers : (x.price1 ? [{ label: '1', price: x.price1 }] : []);
    for (const [i, t] of bac.entries()) {
      if (!heSo) { console.warn(`  ⚠️ bỏ bậc giá "${t.label}": tệ "${te}" không có hệ số — ghi giá mà không biết đơn vị là sai số ×100`); continue; }
      await pool.query(
        'INSERT INTO goi_gia (team_id, san_pham_id, so_luong, gia, tien_te) VALUES ($1,$2,$3,$4,$5)',
        [teamId, spId, i + 1, Math.round(Number(t.price) * heSo), te],
      );
      soGia += 1;
    }
  }
  console.log(`\nĐã nạp vào team ${teamId}: 1 kịch bản LIVE · ${sp.length} sản phẩm · ${soGia} bậc giá.`);
  console.log('Số lượng của bậc giá lấy theo THỨ TỰ trong kịch bản (bậc 1 = mua 1, bậc 2 = mua 2…) — soát lại trên màn Vận hành V3 trước khi tin vào con số.');
} finally {
  await pool.end();
}
