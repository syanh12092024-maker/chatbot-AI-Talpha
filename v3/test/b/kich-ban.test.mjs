// MÀN «KỊCH BẢN» + «SOẠN KỊCH BẢN» (G2-D1 · G2-D2) — hai bước không được đảo.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const kb = await import('../../src/ui/kich-ban/kho-kich-ban.js');

const GOC_REPO = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');

/** Công thức dựng bản máy — chép ĐÚNG `db/di-tru/nguon.js#dungBanChoMay`. */
const dungMay = (c) => {
  const d = [];
  if (c.tone) d.push(`- Giọng điệu / phong cách: ${c.tone}`);
  if (c.greeting) d.push(`- Câu chào mở đầu (dùng khi khách mới nhắn): "${c.greeting}"`);
  if (c.salesPrompt) d.push(`- Cách bán / điểm mạnh riêng của sản phẩm:\n${c.salesPrompt}`);
  return d.join('\n');
};

function dungKho({ ban = [], pages = null, coDayBot = true, coDungMay = true } = {}) {
  const { taoTruyVan, kho } = dungCongGia({
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'T', la_ky_thuat: false }],
    page: pages || [
      { id: 'p1', team_id: 't1', page_id: '111', ten: 'A', thi_truong: 'KSA', bot_ai_bat: true },
      { id: 'p2', team_id: 't1', page_id: '222', ten: 'B', thi_truong: '', bot_ai_bat: false },
    ],
    kich_ban: ban,
  });
  const nhatKy = [];
  const dayBot = [];
  kb.datTaoTruyVan(taoTruyVan);
  kb.datPheuNhatKy((bc, b) => { nhatKy.push({ teamId: bc.teamId, ...b }); });
  kb.datDungBanMay(coDungMay ? dungMay : null);
  kb.datDayLenBot(coDayBot ? async (pid, cfg) => { dayBot.push({ pid, cfg }); } : null);
  return { kho, nhatKy, dayBot };
}

const bcMkt = () => taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'm@t.vn', teamId: 't1', vai: [VAI.MARKETER] });
const bcDuyet = () => taoBoiCanh({ nguoiDungId: 'u2', tenDangNhap: 'd@t.vn', teamId: 't1', vai: [VAI.DUYET_KICH_BAN] });
const bcSale = () => taoBoiCanh({ nguoiDungId: 'u3', tenDangNhap: 's@t.vn', teamId: 't1', vai: [VAI.SALE] });
const bcQt = () => taoBoiCanh({ nguoiDungId: 'u4', tenDangNhap: 'a@t.vn', teamId: 't1', vai: [VAI.QUAN_TRI] });

const NGUOI = { tone: 'Thân thiện', greeting: 'Xin chào', salesPrompt: 'Nhấn mạnh bảo hành' };

/* ═══════════ sáu trường — neo vào `src/kb.js`, không gõ lại ═══════════ */

test('TRUONG · đúng sáu trường của `src/kb.js#SCRIPT_FIELDS`, đối chiếu THẲNG file', () => {
  // Gõ lại sáu tên này là đẻ bản sao thứ hai của một sự thật nằm ở file khác — và bản sao
  // sẽ lệch đúng lúc ai đó thêm trường thứ bảy.
  const src = readFileSync(path.join(GOC_REPO, 'src/kb.js'), 'utf8');
  const m = src.match(/export const SCRIPT_FIELDS\s*=\s*\[([^\]]*)\]/);
  assert.ok(m, 'không tìm thấy SCRIPT_FIELDS trong src/kb.js');
  const that = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  assert.deepEqual([...kb.TRUONG], that);
  for (const t of kb.TRUONG) assert.ok(kb.NHAN_TRUONG[t], `trường "${t}" chưa có nhãn tiếng Việt`);
});

test('TRUONG_VAO_PROMPT · đúng ba trường đi vào prompt, ba trường kia là trả lời 0 đồng', () => {
  assert.deepEqual([...kb.TRUONG_VAO_PROMPT], ['tone', 'greeting', 'salesPrompt']);
  // Người viết cần biết trường nào tốn token mỗi lượt chat và trường nào không.
  const conLai = kb.TRUONG.filter((t) => !kb.TRUONG_VAO_PROMPT.includes(t));
  assert.deepEqual(conLai, ['fastLanePrice', 'fastLaneShip', 'fastLaneHowto']);
});

test('lamSach · giữ đúng sáu trường, BỎ trường lạ, cắt khoảng trắng', () => {
  const r = kb.lamSach({ tone: '  x  ', greeting: 'y', truongLa: 'phải bị bỏ' });
  assert.equal(r.tone, 'x');
  assert.ok(!('truongLa' in r), 'trường lạ lọt vào là ghi một thứ prompt không đọc');
  assert.equal(Object.keys(r).length, 6);
});

/* ═══════════ HAI BƯỚC KHÔNG ĐƯỢC ĐẢO ═══════════ */

test('luuBanNhap · nhận bản NGƯỜI, tự dựng bản MÁY, lưu CẢ HAI', async () => {
  const { kho } = dungKho();
  const kq = await kb.luuBanNhap(bcMkt(), 'p1', { nguoi: NGUOI });
  const dong = kho.docThang(kb.BANG)[0];
  assert.equal(dong.trang_thai, 'DRAFT');
  assert.deepEqual(dong.noi_dung_nguoi, kb.lamSach(NGUOI), 'bản NGƯỜI phải lưu nguyên');
  assert.equal(dong.noi_dung_may, dungMay(kb.lamSach(NGUOI)), 'bản MÁY phải dựng đúng công thức');
  assert.ok(dong.noi_dung_may.includes('Giọng điệu'), 'bản máy là khối chữ, không phải JSON');
  assert.equal(kq.may, dong.noi_dung_may, 'trả về đúng bản vừa dựng để màn hiện ngay');
});

test('luuBanNhap · KHÔNG nối bộ dựng bản máy thì TỪ CHỐI lưu', async () => {
  // Tự dựng một bản thứ hai ở đây là màn hình hứa một prompt khác cái bot thật sự nhận.
  const { kho } = dungKho({ coDungMay: false });
  await assert.rejects(() => kb.luuBanNhap(bcMkt(), 'p1', { nguoi: NGUOI }), (e) => e.ma === 'chua_noi');
  assert.equal(kho.docThang(kb.BANG).length, 0);
});

test('luuBanNhap · lưu xong CHƯA lên LIVE — bot vẫn chạy bản cũ', async () => {
  const { kho, dayBot } = dungKho({ ban: [
    { id: 'k1', team_id: 't1', page_id: 'p1', phien_ban: 1, trang_thai: 'LIVE',
      noi_dung_nguoi: { tone: 'cũ' }, noi_dung_may: '- Giọng điệu / phong cách: cũ' },
  ] });
  await kb.luuBanNhap(bcMkt(), 'p1', { nguoi: NGUOI });
  const live = kho.docThang(kb.BANG).filter((b) => b.trang_thai === 'LIVE');
  assert.equal(live.length, 1);
  assert.equal(live[0].id, 'k1', 'bản LIVE vẫn là bản cũ');
  assert.equal(dayBot.length, 0, 'KHÔNG được gọi sang bot khi mới chỉ lưu nháp');
});

test('luuBanNhap · luôn tạo bản MỚI, không sửa đè', async () => {
  const { kho } = dungKho();
  await kb.luuBanNhap(bcMkt(), 'p1', { nguoi: NGUOI });
  await kb.luuBanNhap(bcMkt(), 'p1', { nguoi: { ...NGUOI, tone: 'khác' } });
  const ds = kho.docThang(kb.BANG);
  assert.equal(ds.length, 2, 'sửa đè là xoá mất bản mà page đã chạy bằng nó');
  assert.deepEqual(ds.map((b) => Number(b.phien_ban)).sort(), [1, 2]);
});

test('luuBanNhap · bản trống bị chặn', async () => {
  const { kho } = dungKho();
  await assert.rejects(() => kb.luuBanNhap(bcMkt(), 'p1', { nguoi: {} }), (e) => e.ma === 'trong_rong');
  assert.equal(kho.docThang(kb.BANG).length, 0);
});

/* ═══════════ ĐÚNG MỘT BẢN LIVE MỖI PAGE ═══════════ */

test('duaLenLive · gọi sang BOT TRƯỚC, rồi mới sửa cột', async () => {
  // Đảo thứ tự thì cột nói LIVE trong khi bot vẫn nói y như cũ, và màn hình chính là thứ
  // người ta nhìn để tin.
  const { dayBot, kho } = dungKho();
  const kq = await kb.luuBanNhap(bcMkt(), 'p1', { nguoi: NGUOI });
  await kb.duaLenLive(bcQt(), 'p1', kq.id);
  assert.equal(dayBot.length, 1, 'phải gọi sang bot đúng một lần');
  assert.equal(dayBot[0].pid, '111', 'gọi bằng id FACEBOOK, không phải id CSDL');
  assert.deepEqual(dayBot[0].cfg, kb.lamSach(NGUOI), 'đẩy bản NGƯỜI sang bot, không phải bản máy');
  assert.equal(kho.docThang(kb.BANG)[0].trang_thai, 'LIVE');
});

test('duaLenLive · bản cũ tự thành ARCHIVED — đúng MỘT bản LIVE mỗi page', async () => {
  // Lược đồ có `UNIQUE INDEX ... WHERE trang_thai='LIVE'`, nên hạ bản cũ SAU là Postgres từ chối.
  const { kho } = dungKho();
  const v1 = await kb.luuBanNhap(bcMkt(), 'p1', { nguoi: NGUOI });
  await kb.duaLenLive(bcQt(), 'p1', v1.id);
  const v2 = await kb.luuBanNhap(bcMkt(), 'p1', { nguoi: { ...NGUOI, tone: 'hai' } });
  const kq = await kb.duaLenLive(bcQt(), 'p1', v2.id);

  const ds = kho.docThang(kb.BANG);
  assert.equal(ds.filter((b) => b.trang_thai === 'LIVE').length, 1);
  assert.equal(ds.find((b) => b.id === v1.id).trang_thai, 'ARCHIVED');
  assert.equal(kq.haBan, 1, 'phải nói rõ vừa hạ bản nào');
});

test('duaLenLive · chưa nối cửa đẩy sang bot thì TỪ CHỐI, không sửa cột', async () => {
  const { kho } = dungKho({ coDayBot: false });
  const kq = await kb.luuBanNhap(bcMkt(), 'p1', { nguoi: NGUOI });
  await assert.rejects(() => kb.duaLenLive(bcQt(), 'p1', kq.id), (e) => e.ma === 'chua_noi');
  assert.equal(kho.docThang(kb.BANG)[0].trang_thai, 'DRAFT', 'cột không được đổi');
});

test('duaLenLive · áp lại bản đang LIVE thì chặn', async () => {
  dungKho();
  const kq = await kb.luuBanNhap(bcMkt(), 'p1', { nguoi: NGUOI });
  await kb.duaLenLive(bcQt(), 'p1', kq.id);
  await assert.rejects(() => kb.duaLenLive(bcQt(), 'p1', kq.id), (e) => e.ma === 'dang_live');
});

/* ═══════════ phân quyền — SOẠN và DUYỆT là hai vai khác nhau ═══════════ */

test('vai · marketer SOẠN được nhưng KHÔNG đưa lên LIVE được', async () => {
  dungKho();
  const kq = await kb.luuBanNhap(bcMkt(), 'p1', { nguoi: NGUOI });   // không ném
  await assert.rejects(() => kb.duaLenLive(bcMkt(), 'p1', kq.id), (e) => e.ma === 'thieu_vai');
});

test('vai · người duyệt kịch bản ĐƯA LÊN LIVE được nhưng KHÔNG soạn được', async () => {
  dungKho();
  const kq = await kb.luuBanNhap(bcMkt(), 'p1', { nguoi: NGUOI });
  await kb.duaLenLive(bcDuyet(), 'p1', kq.id);                        // không ném
  await assert.rejects(() => kb.luuBanNhap(bcDuyet(), 'p1', { nguoi: NGUOI }), (e) => e.ma === 'thieu_vai');
});

test('vai · sale không làm được gì', async () => {
  dungKho();
  await assert.rejects(() => kb.luuBanNhap(bcSale(), 'p1', { nguoi: NGUOI }), (e) => e.ma === 'thieu_vai');
});

test('lớp team · page của team khác → 404, không phải 403', async () => {
  dungKho({ pages: [
    { id: 'p1', team_id: 't1', page_id: '111', ten: 'A' },
    { id: 'p9', team_id: 't2', page_id: '999', ten: 'Team khác' },
  ] });
  await assert.rejects(() => kb.banCuaPage(bcQt(), 'p9'), (e) => e.status === 404);
  await assert.rejects(() => kb.luuBanNhap(bcMkt(), 'p9', { nguoi: NGUOI }), (e) => e.status === 404);
});

/* ═══════════ cây — dựng bằng tầng CÓ dữ liệu ═══════════ */

test('cây · nhóm theo nước, nhánh «chưa phân loại» xuống CUỐI', async () => {
  // Nhánh đó thường to nhất; để đầu là nó che mất các nhánh thật.
  dungKho();
  const c = await kb.cayKichBan(bcQt());
  assert.equal(c.nhanh.at(-1).nuoc, kb.CHUA_PHAN);
  assert.equal(c.nhanh.at(-1).chuaPhanLoai, true);
});

test('cây · khai TẦNG NÀO đang trống và vì sao, không vẽ một cây rỗng', async () => {
  // `nganh_hang` rỗng 514/514 và `san_pham` 0 dòng trên CSDL thật — dựng đủ ba tầng thì ra
  // một cây có đúng một nhánh «(chưa phân loại)», trông như màn hình hỏng.
  dungKho();
  const c = await kb.cayKichBan(bcQt());
  const sp = c.tangTrong.find((t) => t.tang === 'san_pham');
  assert.ok(sp, 'tầng sản phẩm trống thì phải nói ra');
  assert.match(sp.chu, /san_pham|sản phẩm/i);
  assert.ok(c.tangTrong.some((t) => t.tang === 'nuoc'), 'tầng nước thiếu một phần cũng phải nói');
});

test('cây · đếm đúng page có kịch bản và page thiếu', async () => {
  dungKho({ ban: [
    { id: 'k1', team_id: 't1', page_id: 'p1', phien_ban: 1, trang_thai: 'LIVE',
      noi_dung_nguoi: NGUOI, noi_dung_may: 'x'.repeat(298) },
  ] });
  const c = await kb.cayKichBan(bcQt());
  assert.equal(c.soCoKichBan, 1);
  assert.equal(c.soThieuKichBan, 1);
  const p1 = c.nhanh.flatMap((n) => n.page).find((p) => p.id === 'p1');
  assert.equal(p1.coKichBan, true);
  assert.equal(p1.phienBanLive, 1);
  assert.equal(p1.uocToken, 100);
});

test('page chưa có bản nào · nói bot đang chạy bằng gì, không nói suông', async () => {
  dungKho();
  const d = await kb.banCuaPage(bcQt(), 'p1');
  assert.ok(d.trong);
  assert.equal(d.trong.vi, 'chua_cai_dat');
  assert.match(d.trong.noi, /bộ luật chung/i, 'phải nói bot đang chạy bằng gì');
  assert.match(d.trong.noi, /444\/514/, 'và nói đây là tình trạng chung, không phải page này hỏng');
});

test('nhật ký · lưu nháp và lên LIVE ghi hai dòng KHÁC NHAU', async () => {
  const { nhatKy } = dungKho();
  const kq = await kb.luuBanNhap(bcMkt(), 'p1', { nguoi: NGUOI });
  await kb.duaLenLive(bcQt(), 'p1', kq.id);
  assert.equal(nhatKy.filter((x) => x.hanhDong === kb.HANH_DONG_LUU).length, 1);
  const live = nhatKy.find((x) => x.hanhDong === kb.HANH_DONG_LIVE);
  assert.ok(live);
  assert.equal(live.sau.bot_ai_bat, true, 'phải ghi page đó có đang bật bot không — đó là mức ảnh hưởng');
});

test('thiếu bối cảnh thì NÉM', async () => {
  dungKho();
  await assert.rejects(() => kb.cayKichBan(null), /bối cảnh|teamId/i);
  await assert.rejects(() => kb.banCuaPage(null, 'p1'), /bối cảnh|teamId/i);
});
