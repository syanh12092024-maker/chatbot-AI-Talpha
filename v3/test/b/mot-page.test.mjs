// TRANG CỦA MỘT PAGE (GD2 · 25/09/2026) — gom ba màn hỏi cùng một câu hỏi về một chỗ.
//
// Ba màn cũ («Bắt đầu», «Công tắc từng page», «Page còn thiếu gì») hỏi «page này đã chạy
// được chưa» bằng ba cách và không màn nào trả lời trọn. Đo 22/09: 7 màn · 11 bước để cài
// xong một page. Bộ ca này canh bốn điều của lượt gom ấy — và điều thứ tư là tiêu chí
// nghiệm thu của chính phiếu GD2.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const kp = await import('../../src/ui/page-bot/kho-page.js');
const mp = await import('../../src/ui/mot-page/kho-mot-page.js');

const GOC_UI = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../src/ui');

const PAGE = [
  { id: 'p1', team_id: 't1', page_id: '111', ten: 'Alpha KSA', thi_truong: 'Saudi',
    marketer: 'Ngọc', bot_ai_bat: true, trong_diem: false, mat_dau: false, giao_bot_moi: false },
  { id: 'p9', team_id: 't2', page_id: '999', ten: 'Của team khác', bot_ai_bat: false },
];

function dungKho({ sanSang } = {}) {
  const { taoTruyVan, kho } = dungCongGia({
    team: [
      { id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false },
      { id: 't2', slug: 'auus', ten: 'Auus', la_ky_thuat: false },
    ],
    page: PAGE,
  });
  kp.datTaoTruyVan(taoTruyVan);
  kp.datDocSanSang(sanSang ?? null);
  return { kho };
}

const bcQt = (teamId = 't1') => taoBoiCanh({
  nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId, vai: [VAI.QUAN_TRI],
});

const sanSangGia = (pages) => async () => ({ pages });

/* ═══════════ ① page của team khác ═══════════ */

test('① page của team khác ⇒ null (nơi gọi trả 404, KHÔNG phải 403)', async () => {
  // 403 là lời xác nhận «dòng này có thật, chỉ là ở team khác» — một rò rỉ nhỏ mà đều đặn.
  dungKho({ sanSang: sanSangGia([]) });
  assert.equal(await mp.trangMotPage(bcQt(), 'p9'), null);
  assert.ok(await mp.trangMotPage(bcQt(), 'p1'), 'page của team mình thì phải mở được');
});

/* ═══════════ ② chưa đọc được ≠ không thiếu gì ═══════════ */

test('② chưa nối cầu ⇒ nói CHƯA ĐO ĐƯỢC, và KHÔNG dám kết luận «sẵn sàng»', async () => {
  // Đây là cái bẫy của cả nhóm màn này: danh sách điều kiện rỗng trông y hệt «page không
  // thiếu gì», mà hai câu ấy dẫn người ta đi hai hướng ngược nhau — một bên đi bật bot.
  dungKho({ sanSang: null });
  const d = await mp.trangMotPage(bcQt(), 'p1');
  assert.equal(d.tinhTrang.chuaDoDuoc, true);
  assert.equal(d.tinhTrang.san, false, 'chưa đo được thì tuyệt đối không nói sẵn sàng');
  assert.match(d.tinhTrang.viSaoKhongDoc || '', /cầu|bot/i, 'phải nói vì sao chưa đo được');
});

test('②b cầu NÉM ⇒ vẫn là chưa đo được, không nổ ra ngoài màn', async () => {
  dungKho({ sanSang: async () => { throw new Error('hết giờ 25 giây'); } });
  const d = await mp.trangMotPage(bcQt(), 'p1');
  assert.equal(d.tinhTrang.chuaDoDuoc, true);
  assert.equal(d.tinhTrang.san, false);
  assert.match(d.tinhTrang.viSaoKhongDoc || '', /hết giờ/);
});

/* ═══════════ ③ điều kiện tra ĐÚNG bảng từ vựng dùng chung ═══════════ */

test('③ điều kiện mang đủ tên, việc phải làm và chỗ đi sửa', async () => {
  dungKho({ sanSang: sanSangGia([
    { pageId: '111', blockers: [{ code: 'MISSING_SCRIPT' }], warnings: [] },
  ]) });
  const d = await mp.trangMotPage(bcQt(), 'p1');
  const c = d.tinhTrang.chan[0];
  assert.equal(c.ma, 'MISSING_SCRIPT');
  assert.ok(c.nhan && c.ten && c.lam, 'thiếu một trong ba thì màn chỉ hiện được một mã trần');
  assert.equal(c.di, '/kich-ban', 'phải chỉ đúng màn đi sửa');
  assert.equal(d.tinhTrang.san, false);
});

test('③b mã LẠ không bị nuốt — hiện ra kèm nhãn «chưa có trong bảng từ»', async () => {
  // Bên bot thêm một bậc thang mới mà bảng từ vựng chưa biết: nuốt đi là làm một lý do
  // page không chạy được biến mất khỏi màn.
  dungKho({ sanSang: sanSangGia([
    { pageId: '111', blockers: [{ code: 'BAC_THANG_MOI_TINH', detail: 'chi tiết bên bot' }] },
  ]) });
  const d = await mp.trangMotPage(bcQt(), 'p1');
  assert.equal(d.tinhTrang.chan.length, 1);
  assert.equal(d.tinhTrang.chan[0].la, true, 'phải gắn cờ «lạ» chứ không bỏ qua');
  assert.match(d.tinhTrang.chan[0].chiTiet, /chi tiết bên bot/);
});

test('③c CẦU DAO MỞ thì câu «đi sửa» của điều kiện giao page đổi theo (án lệ #27)', async () => {
  // Bảng từ vựng viết câu ấy hồi việc giao page còn phải SSH. Từ 024 nó là một cái nút ngay
  // trên màn — để nguyên câu cũ là đẩy người ta đi nhờ một việc họ tự bấm được.
  dungKho({ sanSang: sanSangGia([
    { pageId: '111', blockers: [{ code: 'BOTMOI_NGOAI_DANH_SACH' }] },
  ]) });
  const cu = process.env.V3_GIAO_PAGE_TREN_MAN;
  try {
    delete process.env.V3_GIAO_PAGE_TREN_MAN;
    const dong = await mp.trangMotPage(bcQt(), 'p1');
    assert.match(dong.tinhTrang.chan[0].lam, /người quản trị hệ thống/);

    process.env.V3_GIAO_PAGE_TREN_MAN = '1';
    const mo = await mp.trangMotPage(bcQt(), 'p1');
    assert.match(mo.tinhTrang.chan[0].lam, /Giao sang bot mới/);
    assert.equal(mo.tinhTrang.chan[0].di, null, 'không còn chỗ nào để «đi sửa» — nút ở ngay trên màn');
  } finally {
    if (cu === undefined) delete process.env.V3_GIAO_PAGE_TREN_MAN;
    else process.env.V3_GIAO_PAGE_TREN_MAN = cu;
  }
});

/* ═══════════ ④ hai nguồn công tắc, giữ cả hai ═══════════ */

test('④ hai nguồn công tắc lệch nhau thì NÓI RA, không chọn một cái', async () => {
  // Cột `page.bot_ai_bat` đã có lần lệch 50 so với nguồn thật. Gộp một con số là mất luôn
  // khả năng phát hiện lệch.
  dungKho({ sanSang: sanSangGia([{ pageId: '111', aiEnabled: false, blockers: [] }]) });
  const d = await mp.trangMotPage(bcQt(), 'p1');
  assert.equal(d.bot.theoBot, false, 'nguồn thật: tiến trình bot');
  assert.equal(d.bot.theoCsdl, true, 'bản sao trong CSDL');
  assert.equal(d.bot.lech, true);
});

/* ═══════════ ⑤ TIÊU CHÍ CỦA PHIẾU: đúng MỘT cửa ghi bật bot ═══════════ */

test('⑤ còn ĐÚNG MỘT đường HTTP bật/tắt bot trong cả giao diện', async () => {
  // Trước GD2 có hai: cửa của màn danh sách (trần bật + hộp xác nhận + nhật ký trước/sau) và
  // cửa của màn «Hội thoại và đơn» (không có cả ba). Hai cửa cho một công tắc là hẹn ngày
  // chúng trôi khỏi nhau, và cửa nghèo chốt hơn chính là cửa người ta hay bấm.
  const cua = [];
  for (const ten of fs.readdirSync(GOC_UI)) {
    const f = path.join(GOC_UI, ten, 'router.js');
    if (!fs.existsSync(f)) continue;
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/r\.post\(\s*[`'"]([^`'"]+)[`'"]/g)) {
      const duong = m[1];
      // Đường bật/tắt công tắc bot: tên kết thúc bằng `/bot`.
      if (/\/bot$/.test(duong)) cua.push(`${ten}: ${duong}`);
    }
  }
  assert.deepEqual(cua, ['page-bot: /api/page-bot/:id/bot'],
    'chỉ được MỘT cửa ghi công tắc bot — thêm cửa thứ hai thì thêm luôn hai bản luật');
});

test('⑤b cửa cũ của màn «Hội thoại và đơn» TỪ CHỐI `enabled`, và chỉ sang đúng chỗ', async () => {
  const src = fs.readFileSync(path.join(GOC_UI, 'van-hanh/router.js'), 'utf8');
  assert.match(src, /hasOwnProperty\.call\(q\.body,\s*"enabled"\)/,
    'cửa cũ phải chặn `enabled` chứ không lặng lẽ nhận');
  assert.match(src, /\/page\/</, 'lời từ chối phải chỉ sang trang của page');
});
