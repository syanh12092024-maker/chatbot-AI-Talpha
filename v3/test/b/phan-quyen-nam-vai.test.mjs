// NGHIỆM THU CẤP GIAI ĐOẠN — «NĂM VAI CHẠY ĐỦ».
//
// `docs/v3/gd2/00-KE-HOACH-GD2.md` §"Nghiệm thu sóng 4 — đây là nghiệm thu của cả giai đoạn 2":
//   · Marketer **chỉ thấy sản phẩm mình phụ trách**
//   · Sale **chỉ thấy bảng điều phối**
//   · Người duyệt kịch bản **duyệt được nhưng không sửa được bộ luật chung**
//
// Bài test này QUÉT MỌI MÀN thay vì kiểm từng màn một. Lý do: phân quyền là thứ đúng-hay-sai
// theo TOÀN BỘ hệ, không theo từng màn. Một màn mới quên chặn `sale` thì bài test của chính
// màn đó vẫn xanh — chỉ phép quét ngang mới bắt được.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { VAI } = await import('../../src/auth/boi-canh.js');
const GOC_UI = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../src/ui');

/** Mọi màn có router — tự dò, KHÔNG gõ tay danh sách. Thêm màn mới là nó tự vào lưới. */
const TEN_MAN = readdirSync(GOC_UI, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== 'chung'
    && existsSync(path.join(GOC_UI, e.name, 'router.js')))
  .map((e) => e.name)
  .sort();

const MAN = {};
for (const ten of TEN_MAN) {
  const m = await import(`../../src/ui/${ten}/router.js`);
  MAN[ten] = {
    vao: [...(m.VAI_VAO_DUOC || [])],
    // Ba tên khác nhau cho cùng một ý, vì ba màn đặt tên khác nhau lúc viết.
    sua: [...(m.VAI_SUA_DUOC || m.VAI_GHI_DUOC || [])],
  };
}

/** Màn nào có cửa GHI — dò bằng chính mã nguồn router, không gõ tay. */
const CO_CUA_GHI = TEN_MAN.filter((ten) => {
  const src = readFileSync(path.join(GOC_UI, ten, 'router.js'), 'utf8');
  return /r\.(post|delete|put)\(/.test(src);
});

test('lưới quét · màn nào CÓ cửa ghi thì PHẢI khai danh sách ghi', () => {
  // Bịt đúng lỗ vừa gặp: router `bo-luat` NHẬP `VAI_SUA_DUOC` từ tầng dưới mà không XUẤT lại,
  // nên phép quét đọc ra `[]` và một màn nới quyền ghi sau này vẫn qua lưới. Lỗi của lưới,
  // không phải của phân quyền — nhưng lưới không bắt được thì nó chỉ là trang trí.
  assert.ok(CO_CUA_GHI.length >= 5, `chỉ dò ra ${CO_CUA_GHI.length} màn có cửa ghi`);
  const khongKhai = CO_CUA_GHI.filter((t) => !MAN[t].sua.length);
  assert.deepEqual(khongKhai, [],
    `màn có cửa ghi mà không xuất VAI_SUA_DUOC/VAI_GHI_DUOC: ${khongKhai.join(', ')}`);
});

test('lưới quét · dò được MỌI màn, không sót màn nào', () => {
  // Gõ tay danh sách là màn thứ mười lăm không vào lưới, và không ai biết.
  assert.ok(TEN_MAN.length >= 11, `chỉ dò ra ${TEN_MAN.length} màn — phép dò hỏng?`);
  for (const ten of TEN_MAN) {
    assert.ok(MAN[ten].vao.length, `màn "${ten}" không khai VAI_VAO_DUOC — mặc định là MỞ TOANG`);
  }
});

test('§9 · SALE chỉ thấy BẢNG ĐIỀU PHỐI, không màn nào khác', () => {
  // `01-QUYET-DINH.md` §10: «Sale không làm việc trên hệ thống này». Một màn quản trị lỡ cho
  // sale vào là cho họ nhìn thấy cấu hình, khoá, và nhật ký của cả team.
  const lot = TEN_MAN.filter((t) => t !== 'dispatch' && MAN[t].vao.includes(VAI.SALE));
  assert.deepEqual(lot, [], `sale lọt vào ${lot.length} màn ngoài bảng điều phối: ${lot.join(', ')}`);
  assert.ok(MAN.dispatch.vao.includes(VAI.SALE), 'và sale PHẢI vào được bảng điều phối');
});

test('§9 · NGƯỜI DUYỆT KỊCH BẢN xem được bộ luật nhưng KHÔNG sửa được', () => {
  // Đây là câu ghi nguyên văn trong tiêu chí nghiệm thu. Họ cần ĐỌC luật chung để duyệt kịch
  // bản cho khớp — nhưng sửa luật chung là việc của quản trị, vì nó đụng mọi page của team.
  assert.ok(MAN['bo-luat'].vao.includes(VAI.DUYET_KICH_BAN), 'phải XEM được');
  assert.ok(!MAN['bo-luat'].sua.includes(VAI.DUYET_KICH_BAN), 'nhưng KHÔNG được sửa');
  assert.deepEqual(MAN['bo-luat'].sua, [VAI.QUAN_TRI]);
});

test('§9 · người duyệt kịch bản DUYỆT được kịch bản — quyền của họ có thật, không rỗng', async () => {
  // «Duyệt được nhưng không sửa được» có hai vế. Vế thứ hai đã kiểm ở trên; vế thứ nhất phải
  // kiểm ở đây, nếu không thì một vai bị chặn sạch cũng "đạt" tiêu chí.
  const kb = await import('../../src/ui/kich-ban/kho-kich-ban.js');
  assert.ok(kb.VAI_DUYET_DUOC.includes(VAI.DUYET_KICH_BAN), 'phải đưa kịch bản lên LIVE được');
  assert.ok(!kb.VAI_SUA_DUOC.includes(VAI.DUYET_KICH_BAN), 'nhưng không SOẠN kịch bản');
});

test('§9 · MARKETER vào được tầng nội dung, KHÔNG vào được tầng hạ tầng', () => {
  // §6 xếp khối «Kỹ năng» và «Kịch bản page» cho marketer. Khoá API, token và cấu hình team
  // thì không — đó là hạ tầng.
  for (const t of ['ky-nang', 'kich-ban', 'prompt-page']) {
    assert.ok(MAN[t].vao.includes(VAI.MARKETER), `marketer phải vào được màn "${t}"`);
  }
  for (const t of ['ket-noi', 'team', 'nhat-ky']) {
    assert.ok(!MAN[t].vao.includes(VAI.MARKETER), `marketer KHÔNG được vào màn "${t}"`);
  }
});

test('§9 · QUẢN TRỊ vào được mọi màn — không có góc nào quản trị bị khoá ngoài', () => {
  const thieu = TEN_MAN.filter((t) => !MAN[t].vao.includes(VAI.QUAN_TRI));
  assert.deepEqual(thieu, [], `quản trị không vào được: ${thieu.join(', ')}`);
});

test('§9 · QUẢN LÝ xem được nhưng KHÔNG sửa được gì', () => {
  // Quản lý đi kiểm, không đi làm. Cho họ sửa là xoá mất ranh giới giữa kiểm và làm.
  const suaDuoc = TEN_MAN.filter((t) => MAN[t].sua.includes(VAI.QUAN_LY));
  assert.deepEqual(suaDuoc, [], `quản lý sửa được ${suaDuoc.length} màn: ${suaDuoc.join(', ')}`);
  assert.ok(MAN['suc-khoe'].vao.includes(VAI.QUAN_LY), 'nhưng phải xem được sức khoẻ hệ thống');
});

test('mọi màn · danh sách SỬA luôn là tập con của danh sách VÀO', () => {
  // Sửa được mà không vào được là một quyền không dùng được — và gần như chắc chắn là dấu
  // hiệu ai đó sửa một danh sách mà quên danh sách kia.
  for (const ten of TEN_MAN) {
    for (const v of MAN[ten].sua) {
      assert.ok(MAN[ten].vao.includes(v),
        `màn "${ten}": vai "${v}" sửa được nhưng KHÔNG vào được`);
    }
  }
});

test('mọi màn · chỉ dùng mã vai CÓ THẬT trong hằng VAI', () => {
  // Bài học ② giai đoạn 1: gõ `quan_tri` gạch dưới thì mọi người thành không có vai, và màn
  // hình trông y hệt phân quyền chạy đúng.
  const that = new Set(Object.values(VAI));
  for (const ten of TEN_MAN) {
    for (const v of [...MAN[ten].vao, ...MAN[ten].sua]) {
      assert.ok(that.has(v), `màn "${ten}" dùng mã vai lạ: "${v}"`);
    }
  }
});

test('hai đường KHÁC NHAU · kịch bản người viết áp thẳng, đề xuất AI phải duyệt', async () => {
  // Tiêu chí nghiệm thu giai đoạn 2, nguyên văn: «Kịch bản NGƯỜI VIẾT → áp thẳng. Đề xuất
  // CỦA AI → phải duyệt mới áp. Hai đường khác nhau, có test.»
  //
  // Đường người: `/api/bo-luat/nhap` ghi CỨNG `nguon:'nguoi'` (bài test riêng ở bo-luat).
  // Đường AI:    cửa `apBoLuat` của người A từ chối bản `nguon='ai'` chưa có `duyet_luc`.
  const bl = await import('../../src/ui/bo-luat/kho-bo-luat.js');
  assert.ok(bl.TRANG_THAI.AI_CHUA_DUYET, 'phải có trạng thái riêng cho bản AI chưa duyệt');
  assert.notEqual(bl.TRANG_THAI.AI_CHUA_DUYET, bl.TRANG_THAI.CHO_DUYET,
    'gộp hai trạng thái là mất luôn chỗ phân biệt hai đường');
  assert.ok(typeof bl.duyetBan === 'function', 'phải có đường duyệt riêng');
});
