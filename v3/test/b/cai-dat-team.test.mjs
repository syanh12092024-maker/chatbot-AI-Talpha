// MÀN «CÀI ĐẶT TEAM» (GD3 · 25/09/2026) — năm việc, làm một lần.
//
// Phụ lục A của kế hoạch: đường cài đặt là 12 bước trên 7 màn, và không màn nào trả lời
// «còn thiếu gì nữa thì team này chạy được» — trong khi mọi dữ kiện đều đã nằm trong CSDL.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const team = await import('../../src/ui/team/kho-team.js');
const cd = await import('../../src/ui/cai-dat-team/kho-cai-dat.js');

const bcQt = () => taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [VAI.QUAN_TRI] });

function dungKho(hat = {}, { khoToken, ketNoiPos } = {}) {
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'T', la_ky_thuat: false }],
    page: hat.page ?? [],
    cau_hinh_model: hat.cau_hinh_model ?? [],
    san_pham: hat.san_pham ?? [],
    goi_gia: hat.goi_gia ?? [],
    hoi_thoai: [],
    thanh_vien_team: hat.thanh_vien_team ?? [],
    nguoi_dung: [{ id: 'u1', email: 'an@t.vn' }],
  });
  team.datTaoTruyVan(taoTruyVan);
  team.datCongDanhTinh(() => taoTruyVan(bcQt()));
  cd.datTaoTruyVan(taoTruyVan);
  cd.datDocKhoToken(khoToken ?? null);
  cd.datDocKetNoiPos(ketNoiPos ?? null);
}

const lay = (d, ma) => d.buoc.find((b) => b.ma === ma);

test('① team rỗng ⇒ năm việc đều CHƯA, và nói rõ việc tiếp theo là việc nào', async () => {
  dungKho({}, { khoToken: async () => ({ token: [] }) });
  const d = await cd.manCaiDat(bcQt());
  assert.equal(d.buoc.length, 5);
  assert.equal(d.dem.xong, 0);
  assert.equal(d.tiepTheo.ma, 'nguoi', 'việc đầu tiên phải là có người trong team');
  for (const b of d.buoc) {
    assert.ok(b.di || b.viSaoChuaDo, `bước ${b.ma} chưa xong mà không chỉ đường đi làm`);
  }
});

test('② mỗi bước đo bằng SỐ THẬT, không bằng cảm giác', async () => {
  dungKho({
    page: [{ id: 'p1', team_id: 't1', page_id: '111', ten: 'A' }],
    cau_hinh_model: [{ id: 'm1', team_id: 't1', vai_tro: 'chinh', nha_cung_cap: 'kimi' }],
    san_pham: [{ id: 's1', team_id: 't1', ten: 'X' }],
    goi_gia: [{ id: 'g1', team_id: 't1', san_pham_id: 's1', gia: 99 }],
    thanh_vien_team: [{ team_id: 't1', nguoi_dung_id: 'u1', vai: 'quan-tri' }],
  }, { khoToken: async () => ({ token: [{ daHet: false }, { daHet: true }] }) });
  const d = await cd.manCaiDat(bcQt());
  assert.equal(lay(d, 'nguoi').xong, true);
  assert.equal(lay(d, 'token').xong, true);
  assert.match(lay(d, 'token').so, /1\/2/);
  assert.equal(lay(d, 'page').xong, true);
  assert.equal(lay(d, 'model').xong, true);
  assert.equal(lay(d, 'kho-hang').xong, true);
  assert.equal(d.tiepTheo, null, 'xong hết thì không còn việc tiếp theo');
});

test('③ CÓ sản phẩm mà KHÔNG có giá ⇒ CHƯA xong, và nói đúng hậu quả', async () => {
  // Một page có sản phẩm mà không có bậc giá là một page CÂM khi khách hỏi giá. Đếm mỗi
  // sản phẩm rồi tích xong là bỏ sót đúng chỗ đau.
  dungKho({
    san_pham: [{ id: 's1', team_id: 't1', ten: 'X' }],
    goi_gia: [],
  }, { khoToken: async () => ({ token: [{ daHet: false }] }) });
  const b = lay(await cd.manCaiDat(bcQt()), 'kho-hang');
  assert.equal(b.xong, false);
  assert.match(b.vi, /hỏi giá/);
});

test('④ CHƯA ĐO ĐƯỢC là trạng thái thứ BA, không phải «chưa làm»', async () => {
  // Gộp «chưa đo được» vào «chưa làm» là bảo người ta đi làm lại một việc có thể đã làm rồi.
  dungKho({}, { khoToken: null });
  const b = lay(await cd.manCaiDat(bcQt()), 'token');
  assert.equal(b.xong, null);
  assert.match(b.vi, /chưa đo được/i);
  assert.ok(b.viSaoChuaDo, 'phải nói ai sửa được chỗ này');
});

test('④b bộ đọc token NÉM ⇒ vẫn là chưa đo được, không thành «chưa làm»', async () => {
  dungKho({}, { khoToken: async () => { throw new Error('kho token hỏng'); } });
  const b = lay(await cd.manCaiDat(bcQt()), 'token');
  assert.equal(b.xong, null);
  assert.match(b.vi, /kho token hỏng/);
});

test('⑤ ba cái van của máy chủ KHÔNG trộn vào năm việc', async () => {
  // Trộn vào là bày ra một ô tích mà người dùng không có cách nào tích được — cách nhanh
  // nhất dạy người ta bỏ qua cả danh sách.
  dungKho({}, { khoToken: async () => ({ token: [] }) });
  const d = await cd.manCaiDat(bcQt());
  assert.equal(d.buoc.length, 5, 'đúng năm việc làm được trên màn');
  assert.equal(d.ngoaiHe.length, 3);
  for (const v of d.ngoaiHe) assert.ok(v.ten && v.vi && 'dangMo' in v);
});

test('⑤b ba cái van đọc ĐÚNG biến môi trường đang đặt', async () => {
  const v = cd.viecNgoaiHe({ V3_PANCAKE_GUI: '1', PANCAKE_READONLY: '1', V3_RAP_PROMPT_BAT: '1' });
  const guiTin = v.find((x) => x.ma === 'gui-tin');
  assert.equal(guiTin.dangMo, false, 'READONLY thắng cờ gửi — hai điều kiện, thiếu một là đóng');
  assert.equal(v.find((x) => x.ma === 'rap-loi').dangMo, true);
  assert.equal(v.find((x) => x.ma === 'giao-page').dangMo, false);
});
