// «BOT CÓ BẬT KHÔNG» — MỘT NGUỒN CHO MỌI MÀN.
//
// Audit 28/09: cùng một team, dải trạng thái nói 1 page bật (hỏi tiến trình bot v1) mà «Người và team»
// nói 2 (đếm cột). CR-02-10 (02/10) đóng tận gốc: v1 nghỉ hưu, cột `page.bot_ai_bat` là công tắc DUY
// NHẤT — mọi màn đếm cột, không còn «hỏi bot trước, cột là bản sao».
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const bb = await import('../../src/ui/chung/bot-bat-that.js');
const kt = await import('../../src/ui/team/kho-team.js');

// Ba page đều bật ở cột — cột là công tắc duy nhất.
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

test('botBatCua · MỘT NGUỒN: chỉ cột `bot_ai_bat` quyết; thiếu cột ⇒ tắt', () => {
  assert.equal(bb.botBatCua({ page_id: '111', bot_ai_bat: true }), true);
  assert.equal(bb.botBatCua({ page_id: '222', bot_ai_bat: false }), false);
  assert.equal(bb.botBatCua({ page_id: '333' }), false);
  assert.equal(bb.botBatCua(null), false);
  assert.equal(typeof bb.docBotBatThat, 'undefined', 'không còn đường «hỏi nguồn thật» thứ hai');
});

test('tongQuanTeam · đếm theo cột và KHAI đó là công tắc duy nhất', async () => {
  dungKho();
  const t = await kt.tongQuanTeam(bcQt());
  assert.equal(t.page.botBat, 3);
  assert.equal(t.page.nguonBotBat.nguon, bb.NGUON_BOT_BAT.nguon);
  assert.match(t.page.nguonBotBat.noi, /công tắc duy nhất/);
  assert.equal(t.soNguoi, 1, 'một người hai vai vẫn là một người');
});

test('canhBaoTuTongQuan · chưa chọn model KHÔNG được nói «bot không trả lời được»', () => {
  // Câu cũ cãi nhau với màn Model AI, Cài đặt team và Sức khoẻ. VE7d · 01/10: và cũng KHÔNG «bộ mặc định» — đó là bộ của lớp
  // v3 (`model/cau-hinh.js#MAC_DINH`); bot mới với team chưa có dòng nào đi ĐƯỜNG MÁY CHỦ (`src/chat/model.js#chonModel`:
  // model `MODEL_CLOSER`, khoá chung của máy chủ) — đo VE7c 30/09. Thước cũ đòi chữ «mặc định» = neo vào câu sai.
  const c = kt.canhBaoTuTongQuan({ soPage: 2, coMarketer: 2, botBat: 1, soDongModel: 0 });
  const chu = c.map((x) => x.chu).join(' ');
  assert.doesNotMatch(chu, /không trả lời được/);
  assert.doesNotMatch(chu, /bộ mặc định|model mặc định/);
  assert.match(chu, /model của máy chủ \(MODEL_CLOSER\)/);
});
