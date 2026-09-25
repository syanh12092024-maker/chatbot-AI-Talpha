// MÀN «SỨC KHOẺ HỆ THỐNG» (G2-E4) — mười đèn, và luật của một cái đèn.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const sk = await import('../../src/ui/suc-khoe/kho-suc-khoe.js');
const nhip = await import('../../src/ui/chung/nhip-may-bot.js');

const bcQt = () => taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [VAI.QUAN_TRI] });

function dungKho(hat = {}, { khoToken, cauBot, sanSang, docNhip } = {}) {
  const { taoTruyVan, kho } = dungCongGia({
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'T', la_ky_thuat: false }],
    page: hat.page ?? [
      { id: 'p1', team_id: 't1', page_id: '111', ten: 'A', bot_ai_bat: true, marketer: 'Ngọc' },
      { id: 'p2', team_id: 't1', page_id: '222', ten: 'B', bot_ai_bat: false, marketer: 'Ngọc' },
    ],
    cau_hinh_model: hat.cau_hinh_model ?? [],
    kich_ban: hat.kich_ban ?? [],
    so_ai: hat.so_ai ?? [],
    viec_can_xu_ly: hat.viec_can_xu_ly ?? [],
  });
  sk.datTaoTruyVan(taoTruyVan);
  sk.datDocKhoToken(khoToken ?? null);
  sk.datTrangThaiCauBot(cauBot ?? null);
  sk.datDocSanSang(sanSang ?? null);
  // Nhịp máy chạy bot dùng cổng tiêm CHUNG với dải trạng thái, và nó nhớ tạm 15 giây —
  // không xoá giữa hai ca là ca sau đọc số của ca trước.
  nhip.datDocNhip(docNhip ?? null);
  nhip.xoaNhoNhip();
  return { kho };
}

const lay = (b, ma) => b.den.find((d) => d.ma === ma);

/* ═══════════ luật của một cái đèn ═══════════ */

test('den() · đèn thiếu câu VÌ SAO thì NÉM ngay lúc dựng', () => {
  assert.throws(() => sk.den({ ma: 'x', ten: 'X', muc: sk.MUC.XANH }), /VÌ SAO/);
});

test('den() · đèn ĐỎ hoặc VÀNG mà không chỉ đường đi tiếp thì NÉM', () => {
  // Báo động rồi bỏ mặc người ta là cách nhanh nhất để họ học cách bỏ qua đèn.
  assert.throws(() => sk.den({ ma: 'x', ten: 'X', muc: sk.MUC.DO, vi: 'hỏng' }), /đi tiếp/);
  assert.throws(() => sk.den({ ma: 'x', ten: 'X', muc: sk.MUC.VANG, vi: 'sắp hỏng' }), /đi tiếp/);
  // Đèn XANH thì không cần — không có gì để đi sửa.
  assert.ok(sk.den({ ma: 'x', ten: 'X', muc: sk.MUC.XANH, vi: 'ổn' }));
});

test('den() · mức lạ bị chặn — bốn mức, không có mức thứ năm', () => {
  assert.throws(() => sk.den({ ma: 'x', ten: 'X', muc: 'hong', vi: 'y' }), /mức đèn lạ/);
  assert.deepEqual(Object.values(sk.MUC).sort(), ['do', 'vang', 'xam', 'xanh']);
});

/* ═══════════ XÁM ≠ XANH — chỗ nguy nhất của một bảng sức khoẻ ═══════════ */

test('không đo được thì XÁM, KHÔNG phải xanh', async () => {
  // Tô xanh chỗ mình đang mù là làm người ta yên tâm về đúng thứ không ai biết.
  dungKho();                                    // không nối kho token, không nối cầu bot
  const b = await sk.bangDen(bcQt());
  assert.equal(lay(b, 'token_pancake').muc, sk.MUC.XAM);
  assert.equal(lay(b, 'tien_trinh_bot').muc, sk.MUC.XAM);
  assert.match(lay(b, 'token_pancake').vi, /chưa đo được/i, 'phải nói rõ là chưa đo được');
  assert.notEqual(lay(b, 'token_pancake').muc, sk.MUC.XANH);
});

test('mức tổng thể · XÁM không bị nuốt thành XANH', async () => {
  dungKho({ cau_hinh_model: [
    { id: 'c1', team_id: 't1', vai_tro: 'chinh', nha_cung_cap: 'kimi', ma_model: 'kimi-k2.6' },
    { id: 'c2', team_id: 't1', vai_tro: 'du_phong', nha_cung_cap: 'claude', ma_model: 'claude-haiku-4.5' },
    { id: 'c3', team_id: 't1', vai_tro: 'nen', nha_cung_cap: 'deepseek', ma_model: 'deepseek-v4-flash' },
  ], kich_ban: [{ id: 'k1', team_id: 't1', page_id: 'p1', trang_thai: 'LIVE', phien_ban: 1 }],
     so_ai: [{ id: 's1', team_id: 't1' }] });
  const b = await sk.bangDen(bcQt());
  assert.equal(b.dem.do, 0, 'không đèn nào đỏ');
  assert.ok(b.dem.xam > 0, 'nhưng có đèn xám');
  assert.equal(b.tongThe, sk.MUC.XAM, 'tổng thể phải là XÁM, không được báo XANH');
});

/* ═══════════ đèn của sự cố 06/08 và 23/08 ═══════════ */

test('đèn model · chưa cấu hình thì ĐỎ và chỉ sang màn Model AI', async () => {
  dungKho();
  const d = lay(await sk.bangDen(bcQt()), 'llm_cau_hinh');
  assert.equal(d.muc, sk.MUC.DO);
  assert.equal(d.diTiep.duong, '/model-ai');
});

test('đèn model · thiếu DỰ PHÒNG thì VÀNG, và dẫn thẳng hai sự cố thật', async () => {
  dungKho({ cau_hinh_model: [
    { id: 'c1', team_id: 't1', vai_tro: 'chinh', nha_cung_cap: 'kimi', ma_model: 'kimi-k2.6' },
  ] });
  const d = lay(await sk.bangDen(bcQt()), 'llm_cau_hinh');
  assert.equal(d.muc, sk.MUC.VANG);
  assert.match(d.vi, /du_phong/);
  assert.match(d.vi, /731/, 'dẫn số thật thì người đọc hiểu đây không phải cảnh báo lý thuyết');
});

/* ═══════════ page bật bot mà không có kịch bản ═══════════ */

test('đèn kịch bản · page ĐANG BẬT BOT mà thiếu kịch bản là ĐỎ', async () => {
  dungKho();                                    // p1 bật bot, không có kịch bản
  const d = lay(await sk.bangDen(bcQt()), 'kich_ban_thieu');
  assert.equal(d.muc, sk.MUC.DO);
  assert.match(d.vi, /1\/1 page/);
  assert.match(d.vi, /khách thật/i, 'phải nói hệ quả, không chỉ nói con số');
});

test('đèn kịch bản · đủ kịch bản thì XANH, và KHÔNG cần đường đi tiếp', async () => {
  dungKho({ kich_ban: [{ id: 'k1', team_id: 't1', page_id: 'p1', trang_thai: 'LIVE', phien_ban: 1 }] });
  const d = lay(await sk.bangDen(bcQt()), 'kich_ban_thieu');
  assert.equal(d.muc, sk.MUC.XANH);
  assert.equal(d.diTiep, null);
});

/* ═══════════ Sổ AI — nguồn của MỌI con số báo cáo ═══════════ */

test('đèn Sổ AI · trống là ĐỎ, và nói rõ ba màn nào không tính được', async () => {
  dungKho();
  const d = lay(await sk.bangDen(bcQt()), 'so_ai');
  assert.equal(d.muc, sk.MUC.DO);
  assert.match(d.vi, /Báo cáo|Chi phí/i);
  assert.match(d.vi, /tra ngược/i, 'tiêu chí sóng 3 đòi mọi con số tra ngược được về Sổ AI');
});

/* ═══════════ khách đang chờ ═══════════ */

test('đèn khách chờ · việc QUÁ HẠN là ĐỎ — đó là khách thật đang đợi', async () => {
  const bay = 1756000000000;
  dungKho({ viec_can_xu_ly: [
    { id: 'v1', team_id: 't1', dong_luc: null, han_luc: new Date(bay - 60000).toISOString() },
    { id: 'v2', team_id: 't1', dong_luc: null, han_luc: new Date(bay + 60000).toISOString() },
    { id: 'v3', team_id: 't1', dong_luc: new Date(bay).toISOString(), han_luc: null },
  ] });
  const d = lay(await sk.bangDen(bcQt(), { bay }), 'viec_qua_han');
  assert.equal(d.muc, sk.MUC.DO);
  assert.match(d.vi, /1\/2 việc/, 'việc đã đóng không được tính vào «đang chờ»');
  assert.equal(d.diTiep.duong, '/dieu-phoi');
});

/* ═══════════ token ═══════════ */

test('đèn token · cả kho hết hạn là ĐỎ; chỉ còn một token sống là VÀNG', async () => {
  const bay = 1756000000000;
  const NGAY = 86400000;
  dungKho({}, { khoToken: async () => ({ token: [{ daHet: true, het: bay - NGAY }] }) });
  assert.equal(lay(await sk.bangDen(bcQt(), { bay }), 'token_pancake').muc, sk.MUC.DO);

  dungKho({}, { khoToken: async () => ({ token: [{ daHet: false, het: bay + 60 * NGAY }] }) });
  const d = lay(await sk.bangDen(bcQt(), { bay }), 'token_pancake');
  assert.equal(d.muc, sk.MUC.VANG, 'một token sống = không có dự phòng');
  assert.match(d.vi, /MỘT token/);
});

test('đèn token · bộ đọc NÉM thì XÁM kèm lý do, không nuốt thành xanh', async () => {
  dungKho({}, { khoToken: async () => { throw new Error('bot không chạy'); } });
  const d = lay(await sk.bangDen(bcQt()), 'token_pancake');
  assert.equal(d.muc, sk.MUC.XAM);
  assert.match(d.vi, /bot không chạy/);
});

/* ═══════════ chung ═══════════ */

test('bảng đèn · đủ MƯỜI đèn, mã không trùng, đèn nào cũng có tên và lý do', async () => {
  dungKho();
  const b = await sk.bangDen(bcQt());
  assert.equal(b.den.length, 10);
  assert.equal(new Set(b.den.map((d) => d.ma)).size, 10);
  for (const d of b.den) {
    assert.ok(d.ten && d.vi, `đèn ${d.ma} thiếu tên hoặc lý do`);
    // Luật độ dài chỉ áp cho đèn CẦN HÀNH ĐỘNG. Đèn xanh thì «Mọi page đều có marketer» là
    // đủ và đúng — bắt nó dài dòng chỉ làm bảng ồn, rồi người ta thôi đọc cả bảng.
    if (d.muc === sk.MUC.DO || d.muc === sk.MUC.VANG) {
      assert.ok(d.vi.length > 40,
        `đèn ${d.ma} đang ${d.muc} mà lý do quá ngắn — người đọc không biết làm gì tiếp`);
    }
  }
  assert.equal(b.dem.xanh + b.dem.vang + b.dem.do + b.dem.xam, 10, 'đếm phải khớp tổng');
});

test('thiếu bối cảnh thì NÉM', async () => {
  dungKho();
  await assert.rejects(() => sk.bangDen(null), /bối cảnh|teamId/i);
});

/* ═══════ CÔNG TẮC BOT: đọc NGUỒN THẬT, không đếm cột bản sao ═══════ */
// Cột `page.bot_ai_bat` đã lệch một lần đo được: CSDL v3 ghi 50 page bật, `ai-enabled.json`
// là [] (0 page). Hai đèn ⑤⑥ dựng trên cột đó, nên phải hỏi tiến trình bot trước.

test('nguồn công tắc · nối cửa kiểm → đếm theo `aiEnabled` của bot, và NÓI ra độ lệch', async () => {
  dungKho({}, {
    // Cột nói p1 bật; bot nói p1 TẮT, p2 BẬT — hai bên lệch cả hai page.
    sanSang: async () => ({ pages: [
      { pageId: '111', aiEnabled: false },
      { pageId: '222', aiEnabled: true },
    ] }),
  });
  const d = await sk.bangDen(bcQt());
  assert.equal(d.nguonBotBat.nguon, 'ai-enabled.json');
  assert.equal(d.nguonBotBat.lech.theoCot, 1);
  assert.equal(d.nguonBotBat.lech.theoBot, 1);
  assert.equal(d.nguonBotBat.lech.soLech, 2, 'phải ĐẾM được có bao nhiêu page lệch');
  const den = d.den.find((x) => /bot/i.test(x.ten) || /bật bot/i.test(x.vi || ''));
  assert.ok(den, 'vẫn phải có đèn công tắc bot');
});

test('nguồn công tắc · CHƯA nối cửa → đếm cột nhưng khai rõ đó là BẢN SAO', async () => {
  dungKho();
  const d = await sk.bangDen(bcQt());
  assert.equal(d.nguonBotBat.nguon, 'cot_csdl');
  assert.match(d.nguonBotBat.noi, /BẢN SAO/);
  assert.equal(d.nguonBotBat.lech, null);
});

test('nguồn công tắc · cửa NÉM → lùi về cột, nói nguyên văn lỗi, không im', async () => {
  dungKho({}, { sanSang: async () => { throw new Error('bot không trả lời'); } });
  const d = await sk.bangDen(bcQt());
  assert.equal(d.nguonBotBat.nguon, 'cot_csdl');
  assert.match(d.nguonBotBat.noi, /bot không trả lời/);
});

/* ═══════════ ĐÈN «MÁY CHẠY BOT» — đo bằng hàng đợi tin (GD5 · 25/09) ═══════════
 *
 * Ba chỗ đèn này dễ nói sai, và ba chỗ ấy chính là lý do nó tồn tại:
 *   ① hàng đợi rỗng KHÔNG phải «máy sống» — đêm vắng khách thì rỗng dù máy chết từ tối;
 *   ② tin dồn lúc cao điểm KHÔNG phải «máy chết» — báo động giả thì người ta tắt chuông;
 *   ③ tin kẹt ở `dang_xu` là dấu vết máy chết GIỮA CHỪNG, và nó không tự hết.
 */

const nhipGia = (x) => async () => ({
  dangCho: 0, dangXu: 0, daXu: 0,
  choLauNhatGiay: null, dangXuLauNhatGiay: null, xongGanNhatGiay: null, ...x,
});

test('máy chạy bot · chưa nối bộ đọc → XÁM, không xanh', async () => {
  dungKho();
  const d = lay(await sk.bangDen(bcQt()), 'may_chay_bot');
  assert.equal(d.muc, sk.MUC.XAM);
  assert.match(d.vi, /chưa đo được/i);
});

test('máy chạy bot · ① hàng đợi rỗng và nguội → XÁM, KHÔNG xanh', async () => {
  // Cảnh 08–10/08/2026 viết lại bằng một câu: tiến trình «active», không ai nhắn, và không
  // ai biết. Tô xanh ở đây là hứa một điều mà phép đo không nói được.
  dungKho({}, { docNhip: nhipGia({ daXu: 120, xongGanNhatGiay: 3600 }) });
  const d = lay(await sk.bangDen(bcQt()), 'may_chay_bot');
  assert.equal(d.muc, sk.MUC.XAM, 'rỗng + nguội = chưa đo được, không phải đang ổn');
  assert.match(d.vi, /không có khách nhắn|chưa đo được/i);
});

test('máy chạy bot · hàng đợi rỗng nhưng vừa xử xong → XANH', async () => {
  dungKho({}, { docNhip: nhipGia({ daXu: 120, xongGanNhatGiay: 30 }) });
  const d = lay(await sk.bangDen(bcQt()), 'may_chay_bot');
  assert.equal(d.muc, sk.MUC.XANH);
});

test('máy chạy bot · tin khách chờ quá hạn mà KHÔNG gì xử xong → ĐỎ', async () => {
  dungKho({}, { docNhip: nhipGia({ dangCho: 4, choLauNhatGiay: 400, daXu: 9, xongGanNhatGiay: 900 }) });
  const d = lay(await sk.bangDen(bcQt()), 'may_chay_bot');
  assert.equal(d.muc, sk.MUC.DO);
  assert.match(d.vi, /KHÔNG ai trả lời|đang đứng/);
  assert.ok(d.diTiep && d.diTiep.chu, 'đèn đỏ phải chỉ việc phải làm');
});

test('máy chạy bot · ② tin dồn NHƯNG vẫn có tin vừa xử xong → VÀNG, không ĐỎ', async () => {
  // Năm mươi khách nhắn cùng lúc: tin cuối chờ vài phút là bình thường, máy vẫn đang chạy.
  dungKho({}, { docNhip: nhipGia({ dangCho: 50, choLauNhatGiay: 400, daXu: 90, xongGanNhatGiay: 5 }) });
  const d = lay(await sk.bangDen(bcQt()), 'may_chay_bot');
  assert.equal(d.muc, sk.MUC.VANG, 'máy vẫn xử được thì không được gọi là chết');
  assert.match(d.vi, /không kịp/);
});

test('máy chạy bot · ③ tin kẹt giữa chừng → ĐỎ và nói rõ tin đó không tự chạy tiếp', async () => {
  dungKho({}, { docNhip: nhipGia({ dangXu: 2, dangXuLauNhatGiay: 1800, daXu: 9, xongGanNhatGiay: 20 }) });
  const d = lay(await sk.bangDen(bcQt()), 'may_chay_bot');
  assert.equal(d.muc, sk.MUC.DO);
  assert.match(d.vi, /giữ giữa chừng/);
  assert.match(d.vi, /không tự chạy tiếp/);
});

test('máy chạy bot · bộ đọc NÉM → XÁM kèm lý do, không nuốt thành xanh', async () => {
  dungKho({}, { docNhip: async () => { throw new Error('CSDL từ chối'); } });
  const d = lay(await sk.bangDen(bcQt()), 'may_chay_bot');
  assert.equal(d.muc, sk.MUC.XAM);
  assert.match(d.vi, /CSDL từ chối/);
});
