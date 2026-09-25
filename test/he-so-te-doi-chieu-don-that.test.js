// HỆ SỐ TỆ — ĐỐI CHIẾU VỚI MỨC TIỀN ĐO ĐƯỢC TỪ ĐƠN THẬT, TỪNG THỊ TRƯỜNG.
//
// ═══ VÌ SAO CÓ BỘ CA NÀY ══════════════════════════════════════════════════════════════
// Sổ điều hành §9 đặt điều kiện cho phiếu vá hệ số: «người quyết xác nhận rồi mới mở phiếu
// vá, KÈM BỘ CA ĐỐI CHIẾU giá-kịch-bản ↔ `cod` cho từng thị trường». Đây là bộ ca đó.
//
// Lỗi được vá: `HE_SO_TE` khai `KWD/OMR/BHD ×1000` theo chuẩn ISO 4217 (ba tệ ấy 3 chữ số
// thập phân). POS KHÔNG theo chuẩn đó — nó lưu ×100 cho MỌI tệ. Hậu quả: `quyTongTienNho()`
// nhân hệ số ngay lúc Sale bấm duyệt ⇒ thu gấp 10 ở ba thị trường.
//
// ⚠️ ĐÂY LÀ KNOWN-ANSWER, KHÔNG GỌI MẠNG. Các mức `cod` dưới đây là số ĐO ĐƯỢC ngày
// 16/09/2026, mỗi shop 100 đơn mới nhất qua `GET /shops/{id}/orders`. Ca này KHÔNG đo lại
// POS: một bộ ca gọi mạng thì đỏ khi mất mạng, và đỏ vì lý do không liên quan tới cái nó đo.
// Muốn đo lại thì chạy `node ops/bin/do-page-pos.mjs`.
//
// Phép xác nhận neo cả bảng vào thực tế: page `Healthy Figure PH in Kuwait`
// (1240652985789530) hiện giá **10.9 KWD** trên POS, và `cod` của đơn đó là **1090**.

import test from "node:test";
import assert from "node:assert/strict";
import { HE_SO_TE, doiSangDonViNho } from "../src/pos/tao-don.js";

// Mỗi dòng: tệ · các mức `cod` THẬT · khoảng giá mà người đọc hoá đơn thấy là hợp lý.
// Khoảng «hợp lý» cố ý RỘNG — nó chỉ cần loại được sai số 10 lần, không cần chính xác.
const DO_DUOC = [
  { tt: "Kuwait", te: "KWD", cod: [990, 1090, 1290, 1590, 1890], hopLy: [5, 60] },
  { tt: "Oman", te: "OMR", cod: [1000, 1100, 1200, 1800, 2900], hopLy: [5, 60] },
  { tt: "Bahrain", te: "BHD", cod: [1100, 1200, 1500, 1800, 2800], hopLy: [5, 60] },
  { tt: "Saudi", te: "SAR", cod: [9900, 10000, 10900, 15900, 19900], hopLy: [50, 400] },
  { tt: "UAE", te: "AED", cod: [6900, 8900, 9900, 10900, 15900], hopLy: [50, 400] },
  { tt: "Qatar", te: "QAR", cod: [9900, 10000, 10900, 14900, 15900], hopLy: [50, 400] },
];

test("H1 · mọi mức cod thật, chia theo HE_SO_TE, phải ra số tiền người đọc được", () => {
  const bang = [];
  for (const { tt, te, cod, hopLy } of DO_DUOC) {
    const he = HE_SO_TE[te];
    assert.ok(he, `${te} phải có trong HE_SO_TE`);
    for (const c of cod) {
      const lon = c / he;
      assert.ok(
        lon >= hopLy[0] && lon <= hopLy[1],
        `${tt} ${te}: cod ${c} ÷ ${he} = ${lon} — ngoài khoảng hợp lý ${hopLy[0]}–${hopLy[1]}. `
        + `Hệ số ${he} sai cho tệ này.`,
      );
    }
    bang.push(`${tt.padEnd(9)} ${te} ×${he}: ${cod.map((c) => `${c}→${c / he}`).join(" ")}`);
  }
  console.log("   " + bang.join("\n   "));
});

test("H2 · HỆ SỐ CŨ (KWD/OMR/BHD ×1000) phải làm ca H1 ĐỎ — chứng minh H1 có sức bắt", () => {
  // Không có ca này thì H1 có thể xanh vì khoảng «hợp lý» quá rộng, chứ không vì hệ số đúng.
  const CU = { ...HE_SO_TE, KWD: 1000, OMR: 1000, BHD: 1000 };
  let batDuoc = 0;
  for (const { te, cod, hopLy } of DO_DUOC) {
    for (const c of cod) {
      const lon = c / CU[te];
      if (!(lon >= hopLy[0] && lon <= hopLy[1])) batDuoc += 1;
    }
  }
  assert.ok(
    batDuoc >= 15,
    `hệ số cũ chỉ bị bắt ${batDuoc} lần — khoảng hợp lý quá rộng, H1 không đủ sức bắt lỗi`,
  );
  console.log(`   hệ số cũ bị bắt ${batDuoc} lần trên 3 thị trường KWD·OMR·BHD`);
});

test("H3 · neo tuyệt đối: 10,9 KWD ⇔ cod 1090 (đơn thật, page Healthy Figure Kuwait)", () => {
  assert.equal(doiSangDonViNho(10.9, "KWD"), 1090);
  assert.equal(doiSangDonViNho(18.9, "KWD"), 1890);
  assert.equal(doiSangDonViNho(99, "SAR"), 9900);
  assert.equal(doiSangDonViNho(12, "OMR"), 1200);
  assert.equal(doiSangDonViNho(18, "BHD"), 1800);
});

test("H4 · POS lưu CÙNG một hệ số cho mọi tệ — tệ mới thêm vào cũng phải ×100", () => {
  // Bài học của lỗi này: người thêm tệ theo CHUẨN ISO sẽ lại viết 1000 cho tệ 3 số lẻ.
  // Ca này chặn đúng lượt đó. Đếm TỪ NGUỒN, không gõ cứng danh sách tệ (án lệ #22).
  const khac = Object.entries(HE_SO_TE).filter(([, he]) => he !== 100);
  assert.deepEqual(
    khac,
    [],
    `POS lưu ×100 cho mọi tệ (đo 16/09, 6 thị trường). Tệ khai khác: ${JSON.stringify(khac)}`
    + " — nếu POS thật sự đổi hành vi thì đo lại rồi sửa cả khối chú thích trên HE_SO_TE,"
    + " đừng chỉ nới ca này.",
  );
});

test("H5 · tệ KHÔNG có trong bảng ⇒ null, không rơi về ×100 im lặng", () => {
  assert.equal(doiSangDonViNho(10, "VND"), null);
  assert.equal(doiSangDonViNho(10, "XYZ"), null);
  assert.equal(doiSangDonViNho(10, ""), null);
  assert.equal(doiSangDonViNho(10, null), null);
});
