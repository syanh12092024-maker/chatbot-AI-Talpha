// L0-M3 · tiêu chí 3 và 4 — vé bị sửa / vé hết hạn → ném LoiChuaDangNhap;
// thiếu V3_KHOA_VE → ném lỗi, KHÔNG tự sinh khoá tạm.
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.V3_KHOA_VE = 'khoa-thu-cho-test-dai-hon-32-ky-tu-abcdefgh';

const { phatVe, phatVeTam, docVe, docVeAmTham, HAN_VE_MS, PHIEN_BAN_VE } = await import('../../src/auth/ve.js');
const { LoiChuaDangNhap, taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');

// ⚠️ Tên trường `tenDangNhap` giữ nguyên (hợp đồng với người A) nhưng GIÁ TRỊ nay là
//    EMAIL — lược đồ thật (`db/migrate/001_nen.up.sql`) không có cột tên đăng nhập.
const NGUOI = { nguoiDungId: 'u1', tenDangNhap: 'an@vidu.vn', teamId: 't1', vai: [VAI.SALE] };

test('vé · phát rồi đọc lại ra đúng nội dung, hạn 8 tiếng', () => {
  const truoc = Date.now();
  const than = docVe(phatVe(NGUOI));
  assert.equal(than.v, PHIEN_BAN_VE);
  assert.equal(than.nguoiDungId, 'u1');
  assert.equal(than.tenDangNhap, 'an@vidu.vn');
  assert.equal(than.teamId, 't1');
  assert.deepEqual(than.vai, ['sale']);
  assert.ok(than.hetHan - than.capLuc === HAN_VE_MS, 'hạn phải đúng 8 tiếng');
  assert.ok(than.capLuc >= truoc);
});

test('vé · KHÔNG nhét gì nhạy cảm vào payload — payload đọc được bằng mắt', () => {
  const ve = phatVe(NGUOI);
  const than = JSON.parse(Buffer.from(ve.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  assert.deepEqual(
    Object.keys(than).sort(),
    ['capLuc', 'hetHan', 'nguoiDungId', 'teamId', 'tenDangNhap', 'v', 'vai'],
    'payload chỉ được có đúng bảy trường này — thêm gì vào là công khai luôn thứ đó',
  );
});

test('vé · sửa MỘT ký tự → ném LoiChuaDangNhap (cả ở payload lẫn ở chữ ký)', () => {
  const ve = phatVe(NGUOI);
  const [p, k] = ve.split('.');

  const doiMotKyTu = (s, i) => s.slice(0, i) + (s[i] === 'A' ? 'B' : 'A') + s.slice(i + 1);

  assert.throws(() => docVe(`${doiMotKyTu(p, 5)}.${k}`), LoiChuaDangNhap, 'sửa payload phải bị bắt');
  assert.throws(() => docVe(`${p}.${doiMotKyTu(k, 5)}`), LoiChuaDangNhap, 'sửa chữ ký phải bị bắt');
  assert.throws(() => docVe(`${p}.`), LoiChuaDangNhap);
  assert.throws(() => docVe(p), LoiChuaDangNhap);
  assert.throws(() => docVe(`${p}.${k}.${k}`), LoiChuaDangNhap);
  assert.throws(() => docVe(''), LoiChuaDangNhap);
  assert.throws(() => docVe(null), LoiChuaDangNhap);
});

test('vé · đổi team trong payload rồi ký lại bằng khoá khác → không lọt', () => {
  const ve = phatVe(NGUOI);
  const than = JSON.parse(Buffer.from(ve.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  than.teamId = 't2';
  const pGia = Buffer.from(JSON.stringify(than), 'utf8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  // Giữ nguyên chữ ký cũ — chữ ký cũ không khớp payload mới.
  assert.throws(() => docVe(`${pGia}.${ve.split('.')[1]}`), LoiChuaDangNhap);
});

test('vé · hết hạn → ném LoiChuaDangNhap', () => {
  const veHetHan = phatVe(NGUOI, { hanMs: -1000 });
  assert.throws(() => docVe(veHetHan), LoiChuaDangNhap);
  assert.equal(docVeAmTham(veHetHan), null, 'docVeAmTham trả null thay vì ném');

  // vé còn sống thì đọc được — chứng minh phép thử trên không phải lúc nào cũng ném
  assert.ok(docVe(phatVe(NGUOI, { hanMs: 60_000 })));
});

test('vé · thông điệp lỗi KHÔNG nói sai chỗ nào', () => {
  const ve = phatVe(NGUOI);
  const loi = [];
  for (const xau of [`${ve}x`, phatVe(NGUOI, { hanMs: -1 }), 'rác.rác']) {
    try { docVe(xau); assert.fail('phải ném'); } catch (e) { loi.push(e.message); }
  }
  assert.equal(new Set(loi).size, 1, 'ba ca sai khác nhau phải cho ĐÚNG MỘT thông điệp');
  assert.equal(loi[0], 'Chưa đăng nhập.');
});

test('vé tạm · không mang teamId, không dựng nổi bối cảnh', () => {
  const than = docVe(phatVeTam({ nguoiDungId: 'u1', tenDangNhap: 'an@vidu.vn' }));
  assert.equal(than.tam, true);
  assert.equal(than.teamId, null);
  assert.deepEqual(than.vai, []);
  assert.throws(() => taoBoiCanh({ nguoiDungId: than.nguoiDungId, teamId: than.teamId, vai: than.vai }),
    /Thiếu bối cảnh team/, 'vé tạm mà dựng được bối cảnh là thủng lớp team');
});

test('vé · THIẾU V3_KHOA_VE → ném lỗi, KHÔNG tự sinh khoá tạm', () => {
  const cu = process.env.V3_KHOA_VE;
  const veCu = phatVe(NGUOI);
  try {
    delete process.env.V3_KHOA_VE;
    assert.throws(() => phatVe(NGUOI), /V3_KHOA_VE/);
    assert.throws(() => docVe(veCu), /V3_KHOA_VE/);
    process.env.V3_KHOA_VE = '   ';
    assert.throws(() => phatVe(NGUOI), /V3_KHOA_VE/, 'khoá toàn dấu cách cũng là thiếu khoá');
  } finally {
    process.env.V3_KHOA_VE = cu;
  }
  // Khoá cũ trở lại → vé phát TRƯỚC đó vẫn đọc được. Nếu module tự sinh khoá tạm thì
  // dòng này hỏng — đó chính là ca "khởi động lại là mọi người bị đá ra".
  assert.equal(docVe(veCu).nguoiDungId, 'u1');
});

test('vé · đổi khoá ký → vé cũ hết dùng được', () => {
  const cu = process.env.V3_KHOA_VE;
  const veCu = phatVe(NGUOI);
  try {
    process.env.V3_KHOA_VE = 'mot-khoa-hoan-toan-khac-cung-du-dai-1234567890';
    assert.throws(() => docVe(veCu), LoiChuaDangNhap);
  } finally {
    process.env.V3_KHOA_VE = cu;
  }
});

test('vé · phatVe từ chối vé đủ quyền mà thiếu team hoặc thiếu vai', () => {
  assert.throws(() => phatVe({ nguoiDungId: 'u1', vai: ['sale'] }), /teamId/);
  assert.throws(() => phatVe({ nguoiDungId: 'u1', teamId: 't1', vai: [] }), /vai/);
  assert.throws(() => phatVe({ teamId: 't1', vai: ['sale'] }), /nguoiDungId/);
});
