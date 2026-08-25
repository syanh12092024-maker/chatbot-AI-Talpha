// MÀN «MODEL AI & KHOÁ» (G2-B3) — quy giá ra tiền, và luật «khoá vào được, không ra được».
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

process.env.V3_KHOA_VE ||= randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= randomBytes(32).toString('base64');
for (const n of ['V3_KHOA_KIMI', 'V3_KHOA_CLAUDE', 'V3_KHOA_OPENAI', 'V3_KHOA_DEEPSEEK']) delete process.env[n];

const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const {
  datTaoTruyVan, datPheuNhatKy, datKhoKhoa, xoaSachCauHinh,
} = await import('../../src/model/cau-hinh.js');
const km = await import('../../src/ui/model/kho-model.js');
const rt = await import('../../src/ui/model/router.js');

const GOC_REPO = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const QUYET_DINH = path.join(GOC_REPO, 'docs/v3/01-QUYET-DINH.md');

const KHOA_THU = 'sk-thu-0123456789-BI-MAT-abcd';
const bcQt = (teamId = 't1') => taoBoiCanh({
  nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId, vai: [VAI.QUAN_TRI],
});

function dungNen() {
  xoaSachCauHinh();
  const { kho, taoTruyVan } = dungCongGia();
  datTaoTruyVan(taoTruyVan);
  const nhatKy = [];
  datPheuNhatKy((bc, ban) => { nhatKy.push({ teamId: bc.teamId, ...ban }); });
  const khoaNha = new Map();
  const k = (t, n) => `${t}|${n}`;
  datKhoKhoa({
    coKhoa: async (t, n) => khoaNha.has(k(t, n)),
    docKhoa: async (t, n) => khoaNha.get(k(t, n)) ?? null,
    ghiKhoa: async (t, n, v) => { khoaNha.set(k(t, n), v); return 1; },
  });
  return { kho, nhatKy, khoaNha };
}

/* ═══════════ quy giá — đối chiếu THẲNG bảng của 01-QUYET-DINH §7 ═══════════ */

test('bảng giá · bội số so với model đang chạy khớp cột "So hiện tại" của tài liệu', () => {
  // ĐỌC TÀI LIỆU, KHÔNG GÕ TAY. Bảng giá là thứ người ta dựa vào để quyết đổi model — lệch
  // với tài liệu mà không ai biết thì quyết định dựa trên một con số đã trôi.
  const md = readFileSync(QUYET_DINH, 'utf8');
  const khoi = md.slice(md.indexOf('## 7 · Model AI'), md.indexOf('## 8 ·'));
  // Mỗi dòng bảng: | tên model | đ/tin | đ/đơn | bội số× |
  const dong = [...khoi.matchAll(/\|([^|]+)\|\s*([\d.,]+)\s*\|\s*([\d.,]+)\s*\|\s*([\d.,]+)×\s*\|/g)];
  assert.ok(dong.length >= 6, `tách được ${dong.length} dòng bảng giá — tài liệu đổi khuôn?`);

  const bang = km.bangGia({ dangChinh: 'kimi-k2.6' });
  const soVoi = new Map(bang.map((m) => [m.ma, m.soVoiDangDung]));
  const dTin = new Map(bang.map((m) => [m.ma, m.dTin]));

  // Khớp theo TÊN gần đúng: tài liệu viết "DeepSeek V4-Flash (ngoài cao điểm)", mã là
  // "deepseek-v4-flash". So bằng mảnh nhận dạng, không bằng cả chuỗi.
  const nhan = [
    ['deepseek-v4-flash', 'DeepSeek'], ['gpt-5.6-luna', 'GPT-5.6'],
    ['kimi-k2.5', 'Kimi K2.5'], ['claude-haiku-4.5', 'Claude Haiku'],
    ['kimi-k2.6', 'Kimi K2.6'], ['claude-sonnet-5', 'Claude Sonnet'],
    ['claude-opus-5', 'Claude Opus'],
  ];
  let daSo = 0;
  for (const [ma, mieng] of nhan) {
    const d = dong.find((x) => x[1].includes(mieng));
    if (!d) continue;
    const tlBoi = Number(String(d[4]).replace(',', '.'));
    const tlDTin = Number(String(d[2]).replace(/\./g, '').replace(',', '.'));
    // Sai số 0,02 cho bội số và 1% cho đ/tin — tài liệu làm tròn khác chỗ tính.
    assert.ok(Math.abs(soVoi.get(ma) - tlBoi) <= 0.02,
      `bội số của ${ma}: code ${soVoi.get(ma)}× ≠ tài liệu ${tlBoi}×`);
    assert.ok(Math.abs(dTin.get(ma) - tlDTin) / tlDTin <= 0.01,
      `đ/tin của ${ma}: code ${dTin.get(ma)} ≠ tài liệu ${tlDTin}`);
    daSo++;
  }
  assert.ok(daSo >= 6, `chỉ so được ${daSo}/7 model — phép đối chiếu thành cái vỏ rỗng`);
});

test('bảng giá · sắp theo đ/ĐƠN tăng dần, không phải theo đ/tin', () => {
  // `01-QUYET-DINH` §7 chốt: đo bằng tiền MỖI ĐƠN. Sắp theo đ/tin là mời người ta chọn sai
  // đúng cái cách tài liệu bảo đừng chọn.
  const b = km.bangGia({ dangChinh: 'kimi-k2.6' });
  for (let i = 1; i < b.length; i++) {
    assert.ok(b[i].dDon >= b[i - 1].dDon, 'phải tăng dần theo đ/đơn');
  }
  assert.equal(b[0].ma, 'deepseek-v4-flash', 'rẻ nhất lên đầu');
});

test('bảng giá · model nào giá SUY NGƯỢC thì phải khai ra', () => {
  // "suy-nguoc" = chưa ai mở tài khoản nhà đó, đơn giá giải ngược từ bảng đ/tin của tài liệu.
  // Không khai thì người ta chọn model dựa trên số bịa mà tưởng là giá công bố.
  const b = km.bangGia({});
  const suyNguoc = b.filter((m) => !m.giaChacChan).map((m) => m.ma);
  assert.ok(suyNguoc.includes('deepseek-v4-flash'));
  assert.ok(suyNguoc.includes('gpt-5.6-luna'));
  assert.ok(b.every((m) => typeof m.giaChacChan === 'boolean'), 'mọi dòng phải khai rõ');
  assert.ok(b.some((m) => m.giaChacChan), 'và phải có model giá công bố để so');
});

test('bảng giá · không có model đang dùng thì bội số là null, KHÔNG phải 1', () => {
  // Trả 1 là nói dối: "bằng với cái đang chạy" khác hẳn "không biết cái đang chạy là gì".
  const b = km.bangGia({});
  assert.ok(b.every((m) => m.soVoiDangDung === null));
});

/* ═══════════ khoá vào được, KHÔNG ra được ═══════════ */

test('khoá · dán được, và KHÔNG có đường nào đọc ngược ra', async () => {
  const { khoaNha } = dungNen();
  await km.luuCauHinh(bcQt(), { chinh: 'kimi-k2.6', duPhong: 'claude-haiku-4.5' });
  const d = await km.luuCauHinh(bcQt(), { khoa: { kimi: KHOA_THU } });

  assert.equal(khoaNha.get('t1|kimi'), KHOA_THU, 'khoá phải xuống tới kho');
  // Đây là khẳng định quan trọng nhất của cả bài test này.
  const chu = JSON.stringify(d);
  assert.ok(!chu.includes(KHOA_THU), 'màn hình KHÔNG được mang khoá thật');
  assert.ok(!chu.includes('sk-thu'), 'kể cả một mảnh khoá');
  assert.deepEqual(d.khoa.kimi, { daCo: true, duoi: null, tuEnv: false });
});

test('khoá · phân biệt khoá RIÊNG của team với khoá từ biến môi trường', async () => {
  // Hai thứ này dẫn tới hai việc khác nhau: khoá env là dùng chung cho mọi team và sửa ở
  // máy chủ; khoá riêng là của team và sửa ngay trên màn. Gộp một nhãn "đã có" là giấu mất
  // việc phải làm.
  dungNen();
  process.env.V3_KHOA_OPENAI = 'sk-env-openai-000000';
  try {
    const d = await km.manModel(bcQt());
    assert.equal(d.khoa.openai.daCo, true);
    assert.equal(d.khoa.openai.tuEnv, true, 'phải khai là khoá env');
    assert.equal(d.khoa.kimi.daCo, false);
  } finally { delete process.env.V3_KHOA_OPENAI; }
});

/* ═══════════ cảnh báo — «thấy SẮP gãy TRƯỚC khi gãy» ═══════════ */

test('cảnh báo · chưa có khoá cho model chính là cảnh ĐỎ, nói rõ hệ quả', async () => {
  dungNen();
  const d = await km.manModel(bcQt());
  const c = d.canhBao.find((x) => x.ma === 'chinh_khong_khoa');
  assert.ok(c, 'model chính không khoá thì phải kêu');
  assert.equal(c.muc, 'do');
  assert.match(c.chu, /rơi thẳng sang dự phòng|chết hẳn/i, 'phải nói HỆ QUẢ, không chỉ nói trạng thái');
});

test('cảnh báo · dự phòng không khoá thì nhắc thẳng hai sự cố đã xảy ra', async () => {
  // 06/08 bot chết 3 tiếng, 23/08 chết 731 phút — cả hai vì hết tiền nhà chính mà không ai
  // biết trước. Cảnh báo nhắc số cụ thể thì người đọc hiểu đây không phải cảnh báo lý thuyết.
  dungNen();
  const d = await km.manModel(bcQt());
  const c = d.canhBao.find((x) => x.ma === 'du_phong_khong_khoa');
  assert.ok(c);
  assert.match(c.chu, /731/, 'phải dẫn sự cố thật, không nói chung chung');
});

test('cảnh báo · dán đủ khoá thì các cảnh ĐỎ tắt', async () => {
  dungNen();
  await km.luuCauHinh(bcQt(), { chinh: 'kimi-k2.6', duPhong: 'claude-haiku-4.5', nen: 'kimi-k2.5' });
  await km.luuCauHinh(bcQt(), { khoa: { kimi: KHOA_THU } });
  await km.luuCauHinh(bcQt(), { khoa: { claude: 'sk-ant-000000000000' } });
  const d = await km.manModel(bcQt());
  assert.ok(!d.canhBao.some((x) => x.muc === 'do'), `còn cảnh đỏ: ${d.canhBao.map((x) => x.ma).join(', ')}`);
  // Còn lại là cảnh TIN: hai nhà kia chưa dán khoá — đúng, nhưng không phải chuyện gấp.
  assert.ok(d.canhBao.every((x) => x.muc === 'tin'));
});

test('cảnh báo · team chưa cấu hình thì nói rõ đang chạy bằng bộ MẶC ĐỊNH', async () => {
  dungNen();
  const d = await km.manModel(bcQt());
  const c = d.canhBao.find((x) => x.ma === 'chua_cau_hinh');
  assert.ok(c, 'chưa cấu hình mà im lặng là để người ta tưởng đã cấu hình rồi');
  assert.equal(d.macDinh, true);
  assert.equal(d.soDong, 0);
});

/* ═══════════ phân quyền ═══════════ */

test('vai · quản lý XEM được, nhưng danh sách sửa chỉ có quản trị', () => {
  assert.ok(rt.VAI_VAO_DUOC.includes(VAI.QUAN_LY));
  assert.deepEqual([...rt.VAI_SUA_DUOC], [VAI.QUAN_TRI]);
});

test('màn · thiếu bối cảnh thì NÉM, không trả cấu hình mặc định', async () => {
  dungNen();
  await assert.rejects(() => km.manModel(null), /bối cảnh|teamId/i);
});

/* ═══════════ nạp nóng ═══════════ */

test('lưu · đổi model xong thì ĐỌC LẠI ra ngay model mới (nạp nóng, không khởi động lại)', async () => {
  dungNen();
  const d = await km.luuCauHinh(bcQt(), { chinh: 'claude-haiku-4.5', duPhong: 'kimi-k2.6' });
  assert.equal(d.dangDung.chinh.ma, 'claude-haiku-4.5', 'kết quả trả về đã là bản mới');
  const lai = await km.manModel(bcQt());
  assert.equal(lai.dangDung.chinh.ma, 'claude-haiku-4.5', 'đọc lại vẫn là bản mới, đệm đã bị xoá');
});

test('lưu · dự phòng CÙNG NHÀ bị chặn, và không ghi gì', async () => {
  const { kho } = dungNen();
  await assert.rejects(
    () => km.luuCauHinh(bcQt(), { chinh: 'claude-haiku-4.5', duPhong: 'claude-sonnet-5' }),
    /cùng nhà/,
  );
  assert.equal(kho.docThang('cau_hinh_model').length, 0, 'chặn rồi thì không được ghi dòng nào');
});
