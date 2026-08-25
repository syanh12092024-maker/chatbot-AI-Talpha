// MÀN «PROMPT CỦA PAGE» (G2-C3) — bốn khối, token từng khối, soi mâu thuẫn.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const pp = await import('../../src/ui/prompt-page/kho-prompt.js');

const bcQt = () => taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [VAI.QUAN_TRI] });

function dungKho(khoi = {}) {
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'T', la_ky_thuat: false }],
    page: [{ id: 'p1', team_id: 't1', page_id: '111', ten: 'Page A', bot_ai_bat: true }],
  });
  pp.datTaoTruyVan(taoTruyVan);
  pp.datDocKhoi({
    boLuat: async () => khoi.boLuat ?? null,
    kyNang: async () => khoi.kyNang ?? [],
    kichBan: async () => khoi.kichBan ?? null,
    sanPham: async () => khoi.sanPham ?? [],
  });
}

test('bốn khối · khối nào THIẾU thì khai ra kèm LÝ DO, không im', async () => {
  // «Mù thì phải nói ra». Một khối thiếu mà màn hình chỉ hiện ô trống thì người đọc tưởng
  // prompt vốn thế, và đi tìm lỗi ở chỗ khác.
  dungKho({});
  const d = await pp.promptCua(bcQt(), '111');
  assert.equal(d.khoi.length, 4);
  assert.equal(d.soKhoiThieu, 4);
  for (const k of d.khoi) {
    assert.equal(k.thieu, true);
    assert.ok(k.lyDoThieu && k.lyDoThieu.length > 25, `khối ${k.ma} thiếu mà không nói vì sao`);
    assert.ok(k.aiSua, 'phải nói AI sửa được khối này — không thì người đọc không biết đi đâu');
  }
});

test('bốn khối · đúng thứ tự và đúng tên của §6', async () => {
  dungKho({});
  const d = await pp.promptCua(bcQt(), '111');
  assert.deepEqual(d.khoi.map((k) => k.ma),
    ['bo_luat_chung', 'ky_nang', 'kich_ban', 'san_pham']);
});

test('token · đếm từng khối và cộng đúng tổng', async () => {
  dungKho({
    boLuat: { noi_dung: 'a'.repeat(2985), phien_ban: 2, team_id: 't1' },
    kyNang: [{ ma: 'k1', noi_dung: 'b'.repeat(597) }],
    kichBan: { noi_dung_may: 'c'.repeat(1492), phien_ban: 3 },
    sanPham: [{ ma: 'SP', ten: 'X', goiGia: [] }],
  });
  const d = await pp.promptCua(bcQt(), '111');
  const m = Object.fromEntries(d.khoi.map((k) => [k.ma, k.uocToken]));
  assert.equal(m.bo_luat_chung, 1000);
  assert.equal(m.ky_nang, 200);
  assert.equal(m.kich_ban, 500);
  assert.equal(d.tongToken, d.khoi.reduce((a, k) => a + k.uocToken, 0));
});

test('token · so với mốc thiết kế §6 — khối phình là tiền phình cho MỌI lượt chat', async () => {
  dungKho({ boLuat: { noi_dung: 'a'.repeat(2985 * 2), phien_ban: 1, team_id: 't1' } });
  const d = await pp.promptCua(bcQt(), '111');
  const bl = d.khoi.find((k) => k.ma === 'bo_luat_chung');
  assert.equal(bl.tokenThietKe, 2256, 'mốc lấy từ §6, không gõ lại ở HTML');
  assert.ok(bl.soVoiThietKe > 0.8, `phình ${bl.soVoiThietKe}× so với thiết kế`);
});

test('khối kỹ năng · mốc thiết kế nhân theo SỐ kỹ năng, không phải một mốc cứng', async () => {
  // §6 ghi ~180 token MỖI kỹ năng. Ba kỹ năng thì mốc là 540, không phải 180 — dùng mốc
  // cứng là báo động giả mỗi khi bật thêm kỹ năng thứ hai.
  dungKho({ kyNang: [{ ma: 'a', noi_dung: 'x'.repeat(200) }, { ma: 'b', noi_dung: 'y'.repeat(200) },
    { ma: 'c', noi_dung: 'z'.repeat(200) }] });
  const d = await pp.promptCua(bcQt(), '111');
  const k = d.khoi.find((x) => x.ma === 'ky_nang');
  assert.equal(k.soPhan, 3);
  assert.equal(k.tokenThietKe, 540);
});

test('khối bộ luật · nói rõ đang dùng bản của team hay bản KẾ THỪA toàn hệ', async () => {
  dungKho({ boLuat: { noi_dung: 'x'.repeat(400), phien_ban: 1, team_id: null } });
  const d = await pp.promptCua(bcQt(), '111');
  assert.match(d.khoi[0].phu, /toàn hệ|kế thừa/i);
});

/* ═══════════ soi mâu thuẫn ═══════════ */

test('soi mâu thuẫn · bắt được «cấm giảm giá» ↔ «giảm 10%» ở HAI khối khác nhau', async () => {
  dungKho({
    boLuat: { noi_dung: 'Không tự ý giảm giá cho khách.'.padEnd(300, '.'), phien_ban: 1, team_id: 't1' },
    kichBan: { noi_dung_may: 'Mua 2 giảm 10% cho đơn trên 150 SAR.'.padEnd(300, '.'), phien_ban: 1 },
  });
  const d = await pp.promptCua(bcQt(), '111');
  const m = d.mauThuan.find((x) => x.khoiA === 'bo_luat_chung' && x.khoiB === 'kich_ban');
  assert.ok(m, 'phải bắt được');
  assert.match(m.chu, /bot sẽ chọn theo khối nào/i, 'phải nói HỆ QUẢ, không chỉ nói "có mâu thuẫn"');
  assert.ok(m.trichA && m.trichB, 'phải trích chỗ nghi ngờ để người đọc tự phán');
});

test('soi mâu thuẫn · hai vế trong CÙNG một khối thì KHÔNG báo', async () => {
  // Cùng một khối là việc của người viết khối đó, không phải mâu thuẫn giữa các tầng. Báo
  // ở đây là làm loãng danh sách rồi người ta thôi đọc.
  dungKho({
    boLuat: { noi_dung: 'Không tự ý giảm giá. Nhưng chương trình này giảm 10%.'.padEnd(300, '.'),
      phien_ban: 1, team_id: 't1' },
  });
  const d = await pp.promptCua(bcQt(), '111');
  assert.deepEqual(d.mauThuan, []);
});

test('soi mâu thuẫn · bắt được «không hứa ngày giao» ↔ «giao trong 3 ngày»', async () => {
  dungKho({
    boLuat: { noi_dung: 'Không hứa ngày giao cụ thể.'.padEnd(300, '.'), phien_ban: 1, team_id: 't1' },
    kichBan: { noi_dung_may: 'Giao trong 3 ngày trên toàn Saudi.'.padEnd(300, '.'), phien_ban: 1 },
  });
  const d = await pp.promptCua(bcQt(), '111');
  assert.ok(d.mauThuan.some((x) => /ngày giao/i.test(x.chu)));
});

test('soi mâu thuẫn · không có gì đối nhau thì danh sách RỖNG', async () => {
  dungKho({
    boLuat: { noi_dung: 'Chào khách lịch sự.'.padEnd(300, '.'), phien_ban: 1, team_id: 't1' },
    kichBan: { noi_dung_may: 'Giới thiệu sản phẩm.'.padEnd(300, '.'), phien_ban: 1 },
  });
  const d = await pp.promptCua(bcQt(), '111');
  assert.deepEqual(d.mauThuan, []);
});

test('soi mâu thuẫn · khối THIẾU không tham gia — không so với chuỗi rỗng', async () => {
  dungKho({ boLuat: { noi_dung: 'Không tự ý giảm giá.'.padEnd(300, '.'), phien_ban: 1, team_id: 't1' } });
  const d = await pp.promptCua(bcQt(), '111');
  assert.deepEqual(d.mauThuan, []);
});

/* ═══════════ cửa chặn ═══════════ */

test('page không thuộc team → 404, không phải 403', async () => {
  dungKho({});
  await assert.rejects(() => pp.promptCua(bcQt(), 'khong-co-that'), (e) => {
    assert.equal(e.status, 404);
    assert.equal(e.ma, 'khong_thay');
    return true;
  });
});

test('chưa nối bộ đọc khối · nói rõ là lỗi CẤU HÌNH, không nói "page này không có prompt"', async () => {
  dungKho({});
  pp.datDocKhoi(null);
  await assert.rejects(() => pp.promptCua(bcQt(), '111'), (e) => {
    assert.equal(e.ma, 'chua_noi');
    assert.match(e.message, /KHÔNG phải "page này không có prompt"/);
    return true;
  });
});

test('thiếu bối cảnh thì NÉM', async () => {
  dungKho({});
  await assert.rejects(() => pp.promptCua(null, '111'), /bối cảnh|teamId/i);
  await assert.rejects(() => pp.pageChonDuoc(null), /bối cảnh|teamId/i);
});
