// PHIẾU GL4 ④6 (bổ sung đơn vị) — đèn `ngat_kenh` khi CSDL CHƯA có cột 034 (XÁM, không xanh giả) · giờ VN qua nửa đêm ·
// số «tin đang giữ» đi qua luật nhịp THẬT (`nhip-may-bot.js#xetNhip`, bộ đọc nhịp tiêm số thô) — canh lời khai «đọc số từ câu
// số đo của nhịp» ở `kho-suc-khoe.js` (nhip-may-bot.js nằm ngoài ③, đổi định dạng thì ca này đỏ).
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');
process.env.V3_TRAN_PAGE_BAT ||= '5';

const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const sk = await import('../../src/ui/suc-khoe/kho-suc-khoe.js');
const nhip = await import('../../src/ui/chung/nhip-may-bot.js');
const ngat = await import('../../../src/queue/ngat-page.js').catch(() => null);

const bc = () => taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [VAI.QUAN_TRI] });
function dung(pages, docNhip = null) {
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'T', la_ky_thuat: false }],
    page: pages, cau_hinh_model: [], kich_ban: [], so_ai: [], viec_can_xu_ly: [],
  });
  sk.datTaoTruyVan(taoTruyVan);
  sk.datDocKhoToken(null); sk.datTrangThaiCauBot(null); sk.datDocSanSang(null);
  nhip.datDocNhip(docNhip); nhip.xoaNhoNhip();
}
const lay = (b, ma) => b.den.find((d) => d.ma === ma);

test('GL4 D3 · CSDL chưa có cột ngắt (034) ⇒ đèn ngat_kenh XÁM nói rõ vì sao — không tô xanh chỗ đang mù', async () => {
  dung([{ id: 'p1', team_id: 't1', page_id: '111', ten: 'A', bot_ai_bat: true, marketer: 'Ngọc' }]);
  const d = lay(await sk.bangDen(bc()), 'ngat_kenh');
  assert.ok(d, 'phải có đèn ngat_kenh');
  assert.equal(d.muc, sk.MUC.XAM, d.vi);
  assert.match(d.vi, /034/);
});

test('GL4 D5 · giờ VN qua nửa đêm UTC (17:05Z ⇒ 00:05) và «N tin» đọc qua luật nhịp thật', async () => {
  assert.ok(ngat, 'chưa có src/queue/ngat-page.js');
  assert.equal(ngat.gioVN('2026-10-07T17:05:00Z'), '00:05');
  assert.equal(ngat.gioVN(new Date('2026-10-07T23:59:00Z')), '06:59');
  const den = new Date(Date.now() + 20 * 60e3);
  dung([{ id: 'p1', team_id: 't1', page_id: '111', ten: 'Trang A', bot_ai_bat: true, marketer: 'Ngọc',
    ngat_den: den, ngat_vi: 'gui', ngat_ly_do: 'Pancake từ chối gửi (mã 105)', loi_doc_lien_tiep: 0, loi_gui_lien_tiep: 0 }],
  async () => ({ dangCho: 7, dangXu: 0, daXu: 4, choLauNhatGiay: 30, dangXuLauNhatGiay: null, xongGanNhatGiay: 20 }));
  const b = await sk.bangDen(bc());
  const d = lay(b, 'ngat_kenh');
  assert.equal(d.muc, sk.MUC.DO);
  assert.ok(d.vi.includes(`Trang A ngắt gửi tới ${ngat.gioVN(den)} (giờ VN)`), d.vi);
  assert.match(d.vi, /mã 105/);
  assert.match(d.vi, /7 tin/, `số tin chờ của team phải đọc được qua xetNhip thật: ${d.vi}`);
  assert.match(d.vi, /0 tin gửi lỗi cần đối chiếu/);
});

test('GL4 D6 · team còn page BẬT mà KHÔNG ngắt ⇒ tin dồn không giải thích được bằng ngắt ⇒ đèn «Máy chạy bot» KHÔNG che «máy đứng»', async () => {
  const den = new Date(Date.now() + 20 * 60e3);
  const nhipDung = async () => ({ dangCho: 9, dangXu: 0, daXu: 3, choLauNhatGiay: 600, dangXuLauNhatGiay: null, xongGanNhatGiay: 900 });
  const A = { id: 'p1', team_id: 't1', page_id: '111', ten: 'Trang A', bot_ai_bat: true, marketer: 'Ngọc',
    ngat_den: den, ngat_vi: 'doc', ngat_ly_do: 'Pancake quá hạn (đọc)', loi_doc_lien_tiep: 0, loi_gui_lien_tiep: 0 };
  const C = { id: 'p2', team_id: 't1', page_id: '222', ten: 'Trang C', bot_ai_bat: true, marketer: 'Ngọc',
    ngat_den: null, ngat_vi: '', ngat_ly_do: '', loi_doc_lien_tiep: 0, loi_gui_lien_tiep: 0 };
  dung([A, C], nhipDung);
  const may = lay(await sk.bangDen(bc()), 'may_chay_bot');
  assert.equal(may.muc, sk.MUC.DO, `page C bật mà không ngắt ⇒ dồn tin là máy có chuyện: ${may.vi}`);
  assert.match(`${may.vi} ${may.diTiep?.chu}`, /khởi động lại/);
  // CHO-QUA cùng dữ liệu nhịp: C tắt bot ⇒ mọi page bật đều ngắt ⇒ che đúng
  dung([A, { ...C, bot_ai_bat: false }], nhipDung);
  const may2 = lay(await sk.bangDen(bc()), 'may_chay_bot');
  assert.equal(may2.muc, sk.MUC.VANG, may2.vi); assert.match(may2.vi, /máy KHÔNG hỏng/);
});
