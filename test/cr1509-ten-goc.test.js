// CR-15/09 · BÓC SỐ HIỆU + GỢI Ý GỘP SẢN PHẨM (`src/pos/ten-goc.js`)
//
// Ca quan trọng nhất của bộ này là **P4**: `125 - Fitgum Acai Berry` và
// `128 - Fitgum Organic Barley` KHÔNG được gộp. Đó là ca phân biệt «gộp theo SỐ HIỆU»
// với «gộp theo TÊN» — và gộp theo tên là cái sẽ trộn hai sản phẩm thật vào một kịch bản,
// tức bot tư vấn sai hàng. Mọi ca còn lại chỉ là lưới chống hồi quy.
//
// Số trong chú thích lấy từ phép đo thật 15/09 trên danh mục 7 shop (470 biến thể,
// 173 số hiệu, 78 số ở >1 shop, 75/78 tên khớp, 113 biến thể không có số).
import test from "node:test";
import assert from "node:assert/strict";
import {
  tachSoHieu,
  chuanHoaTen,
  maGocDeXuat,
  gopTheoSoHieu,
} from "../src/pos/ten-goc.js";

/* ═══════════ ① BÓC SỐ HIỆU ═══════════ */

test("P1 · bóc số hiệu khỏi khuôn tên POS thật", () => {
  assert.deepEqual(tachSoHieu("125 - Fitgum Acai Berry"), {
    soHieu: "125",
    ten: "Fitgum Acai Berry",
  });
  // Khoảng trắng thừa quanh dấu gạch — đo 15/09: POS có cả `231 -  Knot Jewelry Set`.
  assert.deepEqual(tachSoHieu("231 -  Knot Jewelry Set"), {
    soHieu: "231",
    ten: "Knot Jewelry Set",
  });
});

test("P2 · `008` và `8` là CÙNG một số hiệu", () => {
  // Đo 15/09: số hiệu 8 xuất hiện là `008 - Necklace box` ở shop này và `8 - …` ở shop
  // khác. Giữ nguyên chuỗi là đẻ ra HAI sản phẩm gốc cho một thứ — đúng cái CR này đi sửa.
  assert.equal(tachSoHieu("008 - Necklace box").soHieu, "8");
  assert.equal(tachSoHieu("8 - Necklace box").soHieu, "8");
});

test("P3 · KHÔNG có số hiệu thì nói ra, KHÔNG bịa một số", () => {
  // 113/470 biến thể ở trạng thái này. Bịa số cho chúng là gộp bừa 113 sản phẩm.
  assert.deepEqual(tachSoHieu("Necklace box"), { soHieu: null, ten: "Necklace box" });
  assert.equal(tachSoHieu("").soHieu, null);
  assert.equal(tachSoHieu(null).soHieu, null);
  assert.equal(tachSoHieu(undefined).soHieu, null);
  // Số quá dài không phải số hiệu — 5 chữ số trở lên là mã vạch hoặc giá.
  assert.equal(tachSoHieu("12345 - Cái gì đó").soHieu, null);
});

/* ═══════════ ② CA CHÍNH — KHÔNG GỘP THEO TÊN ═══════════ */

test("P4 · hai sản phẩm KHÁC cùng tiền tố tên thì KHÔNG gộp", () => {
  const { nhom } = gopTheoSoHieu([
    { ma: "1:a", ten: "125 - Fitgum Acai Berry", cho: "Saudi" },
    { ma: "2:b", ten: "125 - Fitgum Acai Berry", cho: "Kuwait" },
    { ma: "3:c", ten: "128 - Fitgum Organic Barley", cho: "Saudi" },
  ]);
  const so = nhom.map((n) => n.soHieu).sort();
  assert.deepEqual(so, ["125", "128"], "125 và 128 phải là HAI sản phẩm");
  const n125 = nhom.find((n) => n.soHieu === "125");
  assert.equal(n125.soShop, 2, "125 bán ở hai thị trường");
  assert.equal(nhom.find((n) => n.soHieu === "128").soShop, 1);
  // Và mã gốc đề xuất phải khác nhau, kẻo hai sản phẩm dùng chung một kịch bản.
  assert.notEqual(n125.maGocDeXuat, nhom.find((n) => n.soHieu === "128").maGocDeXuat);
});

/* ═══════════ ③ TÊN LỆCH — GẮN CỜ, KHÔNG TỰ QUYẾT ═══════════ */

test("P5 · cùng số hiệu mà tên khác ⇒ gắn cờ cho NGƯỜI xem", () => {
  const { nhom } = gopTheoSoHieu([
    { ma: "1:a", ten: "8 - Necklace box", cho: "Kuwait" },
    { ma: "2:b", ten: "008 - Box", cho: "Oman" },
  ]);
  assert.equal(nhom.length, 1, "vẫn là một sản phẩm — số hiệu là khoá");
  const n = nhom[0];
  assert.ok(n.tenLech.length >= 2, "phải nêu ra cả hai tên, đừng im lặng chọn một");
  // Tên đại diện = bản DÀI hơn. Đo 15/09: bản ngắn hay là bản bị cắt (`Box` ⊂ `Necklace box`).
  assert.equal(n.ten, "Necklace box");
});

test("P6 · tên khớp nhau thì KHÔNG gắn cờ — cờ phải im khi không có gì", () => {
  const { nhom } = gopTheoSoHieu([
    { ma: "1:a", ten: "133 - Feng Shui 2 – Lucky Charm", cho: "Saudi" },
    { ma: "2:b", ten: "133 - Feng Shui 2 – Lucky Charm", cho: "UAE" },
  ]);
  assert.deepEqual(nhom[0].tenLech, [], "cảnh báo bắn oan thì lần sau không ai đọc");
  assert.equal(nhom[0].soShop, 2);
});

/* ═══════════ ④ MÃ GỐC ĐỀ XUẤT ═══════════ */

test("P7 · mã gốc là slug đọc được, và KHÔNG mang số hiệu", () => {
  assert.equal(maGocDeXuat("125 - Fitgum Acai Berry"), "fitgum-acai-berry");
  assert.equal(maGocDeXuat("216 - White Tooth Repair Toothpaste"), "white-tooth-repair-toothpaste");
  // Số hiệu là khoá MÁY, mã gốc là thứ người đọc trên màn và trong kịch bản. Trộn hai vai
  // vào một chuỗi là đúng cái lỗi CR này sinh ra để sửa.
  assert.ok(!maGocDeXuat("125 - Fitgum Acai Berry").includes("125"));
  // Tên không bóc được chữ nào ⇒ null, để người đặt tay (không trả chuỗi rỗng).
  assert.equal(maGocDeXuat("999 - ???"), null);
});

test("P8 · chuẩn hoá tên bỏ dấu và hoa/thường, nhưng KHÔNG bỏ khoảng trắng", () => {
  assert.equal(chuanHoaTen("Fitgum  Açaí  BERRY"), "fitgum acai berry");
  // `Birthstone` và `Birth stone` vẫn KHÁC nhau — cố ý. Đo 15/09 có đúng ba ca như vậy, và
  // kết luận «vẫn là một sản phẩm» là của người, không của một phép bỏ khoảng trắng.
  assert.notEqual(chuanHoaTen("Birthstone Set"), chuanHoaTen("Birth stone Set"));
});

/* ═══════════ ⑤ THÙNG «KHÔNG SỐ» ═══════════ */

test("P9 · biến thể không số đi vào thùng riêng, KHÔNG lẫn vào nhóm nào", () => {
  const { nhom, khongSo } = gopTheoSoHieu([
    { ma: "1:a", ten: "125 - Fitgum Acai Berry", cho: "Saudi" },
    { ma: "2:b", ten: "Hàng lẻ không mã", cho: "UAE" },
    { ma: "3:c", ten: "", cho: "Oman" },
  ]);
  assert.equal(nhom.length, 1);
  assert.equal(khongSo.length, 2, "cả dòng tên rỗng cũng phải vào thùng, không bị mất");
  assert.ok(khongSo.every((v) => v.ma), "giữ mã POS để người tra lại được");
});

test("P10 · danh sách rỗng không nổ, trả hai thùng rỗng", () => {
  assert.deepEqual(gopTheoSoHieu([]), { nhom: [], khongSo: [] });
  assert.deepEqual(gopTheoSoHieu(), { nhom: [], khongSo: [] });
});
