// MÀN «THƯ VIỆN ẢNH» (G2-D5).
//
// Yêu cầu: *«Ảnh gắn nhãn theo chủ đề để bot chọn đúng lúc»* — HAI vế. Ảnh thì có (459 ảnh,
// đo 25/08). Chủ đề thì KHÔNG: nhãn thật chỉ là chữ «Ảnh sản phẩm» lặp lại.
//
// Bài test ở đây canh đúng chỗ dễ nói dối nhất: trưng một thư viện đẹp rồi im chuyện vế thứ
// hai chưa làm được. Một màn đầy ảnh trông y như một tính năng đã xong.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const tv = await import('../../src/ui/thu-vien-anh/kho-anh.js');

const PAGE = [
  { id: 'p1', team_id: 't1', page_id: '111', ten: 'A' },
  { id: 'p2', team_id: 't1', page_id: '222', ten: 'B' },
  { id: 'px', team_id: 't2', page_id: '999', ten: 'CỦA TEAM KHÁC' },
];

const anh = (nhan) => ({ duong: 'https://x/' + Math.abs(nhan.length) + '.jpg', nhan });
const spCo = (ma, nhans, ten = '') => ({ ma, ten, moTa: '', bienThe: '', tienTe: 'SAR',
  giaDau: 1, bacGia: [], anh: nhans.map(anh) });

function dung({ danhSach, motPage, themPage = [] } = {}) {
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'a', ten: 'A', la_ky_thuat: false },
           { id: 't2', slug: 'b', ten: 'B', la_ky_thuat: false }],
    page: [...PAGE, ...themPage],
  });
  tv.datTaoTruyVan(taoTruyVan);
  tv.datDocKhoSanPham({ danhSach, motPage });
}

const bc = (team = 't1') => taoBoiCanh({
  nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId: team, vai: [VAI.QUAN_TRI],
});

const ds = (ids) => async () => ids.map((id) => ({ pageId: id, ten: 'Page ' + id, soSanPham: 1, botBat: false, coKichBan: true, thiTruong: '', nganhHang: '', marketer: '' }));

/* ═══════════ ① NHÃN ≠ CHỦ ĐỀ ═══════════ */

test('①a · «Ảnh sản phẩm» KHÔNG phải chủ đề', () => {
  for (const s of ['Ảnh sản phẩm', 'ảnh sản phẩm', 'ANH SAN PHAM', 'Ảnh', 'image', '', '   ']) {
    assert.equal(tv.laChuDe(s), false, `"${s}" không phân biệt được ảnh nào dùng lúc nào`);
  }
});

test('①b · nhãn nói ĐƯỢC ngữ cảnh thì LÀ chủ đề', () => {
  for (const s of ['ảnh mặt trước', 'đang dùng', 'giấy chứng nhận', 'so sánh trước sau']) {
    assert.equal(tv.laChuDe(s), true);
  }
});

/* ═══════════ ② VẾ «BOT CHỌN ĐÚNG LÚC» — CHƯA LÀM ĐƯỢC THÌ PHẢI NÓI ═══════════ */

test('②a · toàn ảnh cùng một nhãn → khai CHƯA làm được, kèm việc phải làm', async () => {
  // Đúng cảnh thật 25/08: mọi ảnh mang nhãn «Ảnh sản phẩm».
  dung({
    danhSach: ds(['111']),
    motPage: async () => ({ pageId: '111', tenPage: 'A', sanPham: [spCo('SP01', ['Ảnh sản phẩm', 'Ảnh sản phẩm', 'Ảnh sản phẩm'])] }),
  });
  const d = await tv.manAnh(bc());
  assert.equal(d.dem.anh, 3, 'ảnh vẫn phải hiện đủ — có ảnh là sự thật');
  assert.equal(d.chuDe.duoc, false, 'ba ảnh cùng một nhãn thì không có gì để chọn giữa');
  assert.equal(d.chuDe.soChuDe, 0);
  assert.match(d.chuDe.noi, /chưa làm\s*\*{0,2}được|chưa làm được/i);
  assert.ok(d.chuDe.diTiep && d.chuDe.diTiep.length > 60, 'chưa làm được thì phải nói AI làm và làm ở đâu');
  assert.equal(d.dem.khongChuDe, 3);
  assert.equal(d.dem.coChuDe, 0);
});

test('②b · MỘT chủ đề vẫn chưa đủ — phải có ít nhất hai để mà chọn', async () => {
  dung({
    danhSach: ds(['111']),
    motPage: async () => ({ pageId: '111', tenPage: 'A', sanPham: [spCo('SP01', ['ảnh mặt trước', 'ảnh mặt trước'])] }),
  });
  const d = await tv.manAnh(bc());
  assert.equal(d.chuDe.soChuDe, 1);
  assert.equal(d.chuDe.duoc, false, 'chỉ một chủ đề thì «chọn đúng lúc» vẫn là chọn giữa một thứ');
});

test('②c · hai chủ đề trở lên → khai LÀM ĐƯỢC, không cảnh báo thừa', async () => {
  dung({
    danhSach: ds(['111']),
    motPage: async () => ({ pageId: '111', tenPage: 'A', sanPham: [spCo('SP01', ['ảnh mặt trước', 'đang dùng'])] }),
  });
  const d = await tv.manAnh(bc());
  assert.equal(d.chuDe.duoc, true);
  assert.equal(d.chuDe.soChuDe, 2);
  assert.equal(d.chuDe.diTiep, null, 'làm được rồi thì đừng bắt người ta đọc việc phải làm');
});

/* ═══════════ ③ TEAM ═══════════ */

test('③ · chỉ ảnh của page trong team, page team khác không lọt', async () => {
  const goi = [];
  dung({
    danhSach: ds(['111', '999']),
    motPage: async (id) => { goi.push(id); return { pageId: id, tenPage: 'P' + id, sanPham: [spCo('S', ['Ảnh sản phẩm'])] }; },
  });
  const d = await tv.manAnh(bc());
  assert.deepEqual(goi, ['111'], 'không được gọi sang page của team khác — gọi là đã lộ page đó có thật');
  assert.equal(d.dem.anh, 1);
  assert.ok(!JSON.stringify(d).includes('999'));
});

/* ═══════════ ④ MỘT PAGE HỎNG KHÔNG LÀM HỎNG CẢ THƯ VIỆN ═══════════ */

test('④ · page đọc lỗi → ghi lại và ĐI TIẾP, không mất phần còn lại', async () => {
  dung({
    danhSach: ds(['111', '222']),
    motPage: async (id) => {
      if (id === '111') throw new Error('Sheet hỏng');
      return { pageId: id, tenPage: 'B', sanPham: [spCo('S', ['Ảnh sản phẩm', 'Ảnh sản phẩm'])] };
    },
  });
  const d = await tv.manAnh(bc());
  assert.equal(d.dem.anh, 2, 'ảnh của page lành phải còn nguyên');
  assert.equal(d.hong.length, 1);
  assert.equal(d.hong[0].pageId, '111');
});

/* ═══════════ ⑤ CẦU HỎNG ≠ KHÔNG CÓ ẢNH ═══════════ */

test('⑤a · cầu hỏng thì NÉM, không trả thư viện rỗng', async () => {
  dung({ danhSach: async () => { throw new Error('bot không chạy'); }, motPage: async () => ({}) });
  await assert.rejects(() => tv.manAnh(bc()), (e) => {
    assert.equal(e.ma, 'cau_hong');
    assert.match(e.message, /chưa có ảnh nào/i);
    return true;
  });
});

test('⑤b · chưa nối cầu → nói rõ chưa cài đặt, kèm biến cần đặt', async () => {
  dung({});
  const d = await tv.manAnh(bc());
  assert.equal(d.trong.vi, 'chua-nap');
  assert.match(d.trong.diTiep, /V3_BOT_V1_GOC|ADMIN_USER/);
});

/* ═══════════ ⑥ ĐỌC THEO TRANG ═══════════ */

test('⑥ · đọc theo trang — không gọi 69 lượt HTTP cho một cú bấm', async () => {
  const nhieu = Array.from({ length: 55 }, (_, i) => String(1000 + i));
  const goi = [];
  dung({
    // Phải gieo CẢ vào bảng `page` của team — bản đầu của bài này chỉ bịa id ở phía cầu, và
    // màn lọc sạch chúng (đúng), nên bài test đỏ vì lỗi của chính nó, không phải của màn.
    themPage: nhieu.map((id, i) => ({ id: 'g' + i, team_id: 't1', page_id: id, ten: 'G' + i })),
    danhSach: ds(nhieu),
    motPage: async (id) => { goi.push(id); return { pageId: id, tenPage: id, sanPham: [spCo('S', ['Ảnh sản phẩm'])] }; },
  });
  const d = await tv.manAnh(bc());
  assert.ok(goi.length <= 40, `gọi ${goi.length} lượt trong một lần tải — quá nhiều`);
  assert.equal(d.trang.tong, 55);
  assert.equal(d.dem.pageCoSanPham, 55, 'phải khai TỔNG, không chỉ phần đã đọc');
  assert.ok(d.dem.pageDaDoc < d.dem.pageCoSanPham, 'màn phải cho biết nó mới đọc một phần');
});
