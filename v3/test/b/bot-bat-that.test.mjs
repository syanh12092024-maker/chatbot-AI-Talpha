// «BOT CÓ BẬT KHÔNG» — MỘT NGUỒN CHO MỌI MÀN (audit 28/09).
//
// Cùng một team, dải trạng thái nói 1 page đang bật (hỏi tiến trình bot) mà «Người và team»
// nói 2 (đếm cột `page.bot_ai_bat`, là bản sao). Ca này khoá: có cửa kiểm thì đếm theo bot,
// bot không thấy page thì giữ cột, không hỏi được thì khai là đang đứng ở bản sao.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const bb = await import('../../src/ui/chung/bot-bat-that.js');
const kt = await import('../../src/ui/team/kho-team.js');

// Cột nói CẢ HAI page bật; bot nói chỉ page 111 bật, page 333 bot không thấy.
function dungKho() {
  const { taoTruyVan } = dungCongGia({
    page: [
      { id: 'p1', team_id: 't1', page_id: '111', ten: 'A', marketer: 'An', bot_ai_bat: true },
      { id: 'p2', team_id: 't1', page_id: '222', ten: 'B', marketer: 'An', bot_ai_bat: true },
      { id: 'p3', team_id: 't1', page_id: '333', ten: 'C', marketer: 'An', bot_ai_bat: true },
    ],
    hoi_thoai: [], cau_hinh_model: [],
    thanh_vien_team: [
      { id: 'tv1', team_id: 't1', nguoi_dung_id: 'u1', vai_id: 'v-qt' },
      { id: 'tv2', team_id: 't1', nguoi_dung_id: 'u1', vai_id: 'v-mkt' },
    ],
  });
  kt.datTaoTruyVan(taoTruyVan);
  kt.datCongDanhTinh(() => taoTruyVan(bcQt()));
  kt.datDocKetNoiPos(null);
}
const bcQt = () => taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId: 't1', vai: [VAI.QUAN_TRI] });
const cuaKiem = async () => ({ pages: [
  { pageId: '111', aiEnabled: true },
  { pageId: '222', aiEnabled: false },   // cột ghi bật, bot đã tắt — đúng cảnh lệch 25/08
] });

test('botBatCua · bot thấy page thì theo bot; bot không thấy thì giữ cột', () => {
  const theoBot = new Map([['111', true], ['222', false]]);
  assert.equal(bb.botBatCua({ page_id: '222', bot_ai_bat: true }, theoBot), false);
  assert.equal(bb.botBatCua({ page_id: '333', bot_ai_bat: true }, theoBot), true);
  assert.equal(bb.botBatCua({ page_id: '222', bot_ai_bat: true }, null), true);
});

test('docBotBatThat · chưa nối hoặc bot lỗi ⇒ theoBot null KÈM lý do, không ném', async () => {
  bb.datDocSanSang(null);
  const a = await bb.docBotBatThat();
  assert.equal(a.theoBot, null); assert.match(a.viSao, /Chưa nối/);
  bb.datDocSanSang(async () => { throw new Error('fetch failed'); });
  const b = await bb.docBotBatThat();
  assert.equal(b.theoBot, null); assert.match(b.viSao, /fetch failed/);
});

test('tongQuanTeam · có cửa kiểm thì đếm theo BOT, không theo cột bản sao', async () => {
  dungKho();
  bb.datDocSanSang(cuaKiem);
  const t = await kt.tongQuanTeam(bcQt());
  assert.equal(t.page.botBat, 2, '111 (bot bật) + 333 (bot không thấy ⇒ cột) — 222 bot đã tắt');
  assert.equal(t.page.nguonBotBat.nguon, 'ai-enabled.json');
  assert.equal(t.soNguoi, 1, 'một người hai vai vẫn là một người');
});

test('tongQuanTeam · không hỏi được bot ⇒ đếm cột và KHAI là bản sao', async () => {
  dungKho();
  bb.datDocSanSang(async () => { throw new Error('fetch failed'); });
  const t = await kt.tongQuanTeam(bcQt());
  assert.equal(t.page.botBat, 3);
  assert.equal(t.page.nguonBotBat.nguon, 'cot_csdl');
  assert.match(t.page.nguonBotBat.noi, /fetch failed/);
  bb.datDocSanSang(null);
});

test('canhBaoTuTongQuan · chưa chọn model KHÔNG được nói «bot không trả lời được»', () => {
  // `model/cau-hinh.js` cho team chưa có dòng nào chạy bằng bộ mặc định — câu cũ cãi nhau
  // với màn Model AI, Cài đặt team và Sức khoẻ.
  const c = kt.canhBaoTuTongQuan({ soPage: 2, coMarketer: 2, botBat: 1, soDongModel: 0 });
  const chu = c.map((x) => x.chu).join(' ');
  assert.doesNotMatch(chu, /không trả lời được/);
  assert.match(chu, /mặc định/);
});
