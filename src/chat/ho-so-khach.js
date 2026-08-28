// A7-2 · NỐI HỘI THOẠI MESSENGER VÀO HỒ SƠ KHÁCH — job, không phải đường tin sống.
//
// ═══ VIỆC NÀY LÀ GÌ ══════════════════════════════════════════════════════════
// `hoi_thoai.khach_id` đang NULL trên **28.953/28.953** dòng (đo 26/08 trên CSDL thật):
// chưa từng có ai ghi cột đó. Nghĩa là hai kênh — đơn POS và hội thoại Messenger — chưa
// bao giờ gặp nhau ở một hồ sơ. Job này nối chúng bằng ĐÚNG khoá mà cửa POS dùng.
//
// ═══ «BA KÊNH» CỦA ĐỀ BÀI HIỆN CHỈ CÓ HAI ════════════════════════════════════
// `don_hang.nguon` là `CHECK (nguon IN ('trang_ban_hang','messenger'))` — hai. WhatsApp
// chưa nối (việc người H1; L1-M3 mới là KHUNG + mock). Tôi KHÔNG dựng sẵn nhánh thứ ba:
// một nhánh không có dữ liệu đi qua là một nhánh không ai biết nó đúng hay sai. Khi cửa
// WhatsApp có thật thì nó nối vào cùng `khoaKhach`, không phải sửa file này.
//
// ═══ HAI QUYẾT ĐỊNH ĐO ĐƯỢC ══════════════════════════════════════════════════
// ① NƯỚC TRA QUA `pos_shop_id`, KHÔNG QUA `page.thi_truong`. Đã đo 23/08 (`hang-cho.js`):
//    khớp theo TÊN trúng **0/502** page vì `page.thi_truong` là nhãn NGƯỜI (`KSA`·`Khác`)
//    còn `ket_noi_pos.market` là `Saudi`. Trên tập hội thoại CÓ SĐT thì đường
//    `pos_shop_id` tra được **789/790 (99,9%)** — đo 26/08.
//
// ② HỘI THOẠI KHÔNG TRA ĐƯỢC NƯỚC ⇒ **BỎ QUA VÀ ĐẾM**, không tạo khách nước-NULL.
//    Tạo một `khach` với `thi_truong = NULL` là tạo một dòng mà ta ĐÃ BIẾT trước là
//    không gộp được với đơn POS của cùng người (khoá `|sdt` ≠ khoá `Saudi|sdt`) — tức
//    cố ý đẻ một bản trùng. Bỏ qua thì lượt chạy sau tự nối được ngay khi page có
//    `pos_shop_id`. Con số bỏ qua đi ra `kq.thieuNuoc` KÈM danh sách page, để người vận
//    hành biết phải sửa gì — «màn hình rỗng phải nói VÌ SAO rỗng» (bài học 3 của GD2).
//
// ═══ VÌ SAO KHÔNG DỰNG CỬA UPDATE HẸP THỨ NĂM ════════════════════════════════
// `ti-le-hoan.js` phải tự dựng `CAU_GHI_CHAM` vì lúc đó `suaTheoId` chưa nhận
// `ctxHeThong()` — nợ N3, đã cắn bốn lần và §9 chốt «bản vá đúng là suaTheoId cho
// ctxHeThong rồi gộp CẢ BỐN về một». G2-A1 đã cấp `ctxHeThong()` + `{neu}`. Nên job này
// đi bằng cửa chung, và KHÔNG cộng thêm một cửa thứ năm vào món nợ đó.
import { themMoi, suaTheoId, ctxHeThong, ghiNhatKy } from "../db/index.js";
import { khoaKhach, chuanHoaSdt } from "../orders/loc-trung.js";

/** Trần số hội thoại một lượt. Chạm trần thì NÓI RA, không cắt im lặng. */
export const TRAN_MOT_LUOT = 2000;

/**
 * Hội thoại CÓ SĐT mà CHƯA nối khách, kèm nước tra sẵn qua `pos_shop_id`.
 * ⛔ Vế `k.bat` không được rơi ra: một kết nối POS đã tắt vẫn còn dòng trong bảng, và
 *    lấy `market` của nó là gán khách vào một thị trường không còn chạy.
 * ⛔ Vế `h.team_id = $1` kẹp team ở CẢ ba bảng — join hở một chỗ là đọc sang team khác.
 */
export const CAU_TIM = `
  SELECT h.id,
         h.ho_so->>'phone' AS sdt_tho,
         h.page_id,
         p.ten            AS page_ten,
         k.market
    FROM hoi_thoai h
    LEFT JOIN page p
           ON p.id = h.page_id AND p.team_id = h.team_id
    LEFT JOIN ket_noi_pos k
           ON k.shop_id = p.pos_shop_id::text AND k.team_id = p.team_id AND k.bat
   WHERE h.team_id = $1
     AND h.khach_id IS NULL
     AND h.ho_so->>'phone' IS NOT NULL
     AND h.ho_so->>'phone' <> ''
   ORDER BY h.id
   LIMIT $2`;

/**
 * Nối hội thoại của MỘT team vào `khach`.
 *
 * Idempotent: chạy lại không đẻ thêm dòng nào — khoá `(team, nước, sđt)` khớp lại dòng
 * cũ, và lượt ghi là so-và-đặt `{neu: {khach_id: null}}` nên hai lượt chạy song song
 * không cùng gán một hội thoại.
 *
 * @returns thống kê ĐỦ ĐỂ TRẢ LỜI «vì sao không nối được cái nào», không chỉ số đếm.
 */
export async function noiKhachChoHoiThoai(
  pool,
  { teamId, tran = TRAN_MOT_LUOT, job = "noi-ho-so-khach" } = {},
) {
  if (teamId == null) throw new Error("noiKhachChoHoiThoai: thiếu teamId.");
  const ctx = ctxHeThong();

  const kq = {
    teamId: String(teamId),
    xet: 0,
    noiMoi: 0, // hội thoại vừa nối vào khách MỚI tạo
    noiVaoCoSan: 0, // nối vào khách ĐÃ CÓ (POS tạo trước, hoặc hội thoại khác)
    khachMoi: 0,
    thieuNuoc: 0, // bỏ qua — không tra được thị trường (quyết định ②)
    sdtKhongDocDuoc: 0, // có chuỗi nhưng không còn chữ số nào
    mataTranh: 0, // so-và-đặt trượt: lượt khác nối trước
    chamTran: false,
    pageThieuShop: [], // page nào đang chặn — để người vận hành sửa đúng chỗ
  };

  const r = await pool.query(CAU_TIM, [teamId, tran]);
  kq.xet = r.rowCount;
  kq.chamTran = r.rowCount >= tran;

  // Bản đồ khoá → khach.id, nạp DẦN trong lượt: hai hội thoại cùng người (cùng nước,
  // cùng số) phải về CÙNG một khách, kể cả khi cả hai đều mới trong lượt này.
  const banDo = new Map();
  const pageThieu = new Set();

  for (const h of r.rows) {
    if (!h.market) {
      kq.thieuNuoc++;
      pageThieu.add(`${h.page_id}${h.page_ten ? ` (${h.page_ten})` : ""}`);
      continue;
    }
    const sdt = chuanHoaSdt(h.sdt_tho);
    const khoa = khoaKhach(h.market, h.sdt_tho);
    if (!khoa) {
      kq.sdtKhongDocDuoc++;
      continue;
    }

    let khachId = banDo.get(khoa) ?? null;
    let vuaTao = false;
    if (!khachId) {
      // Cửa vào có thể đã có dòng do cửa POS tạo trước — hỏi trước khi tạo.
      const co = await pool.query(
        `SELECT id FROM khach
          WHERE team_id = $1 AND thi_truong = $2 AND so_dien_thoai = $3`,
        [teamId, h.market, sdt],
      );
      if (co.rowCount) {
        khachId = String(co.rows[0].id);
      } else {
        const moi = await themMoi(pool, ctx, "khach", {
          team_id: teamId,
          so_dien_thoai: sdt,
          thi_truong: h.market,
        });
        khachId = String(moi.id);
        vuaTao = true;
        kq.khachMoi++;
      }
      banDo.set(khoa, khachId);
    }

    // So-và-đặt: chỉ thắng nếu NGAY LÚC GHI hội thoại vẫn chưa có khách. Trượt KHÔNG
    // phải lỗi — nghĩa là một lượt khác vừa nối xong (ban-giao §3b).
    // `team_id` đặt ở `neu` vì `ctxHeThong()` đòi team tường minh (ban-giao §3c) — và ở
    // `neu` thì nó vừa là vế chỉ-team-mình vừa khai team, một chỗ làm cả hai việc.
    const thang = await suaTheoId(
      pool,
      ctx,
      "hoi_thoai",
      h.id,
      { khach_id: khachId },
      { neu: { khach_id: null, team_id: teamId } },
    );
    if (thang === null) kq.mataTranh++;
    else if (vuaTao) kq.noiMoi++;
    else kq.noiVaoCoSan++;
  }

  kq.pageThieuShop = [...pageThieu].slice(0, 20);

  // MỘT dòng nhật ký cho CẢ LƯỢT, không phải một dòng mỗi hội thoại — cùng lý lẽ với
  // `ti-le-hoan.js`: n nghìn dòng mỗi đêm chôn mất mọi dòng nghiệp vụ khác.
  if (kq.noiMoi || kq.noiVaoCoSan)
    await ghiNhatKy(pool, {
      teamId,
      tacNhan: `may:${job}`,
      hanhDong: "noi_ho_so_khach",
      doiTuong: "hoi_thoai",
      sau: {
        noiMoi: kq.noiMoi,
        noiVaoCoSan: kq.noiVaoCoSan,
        khachMoi: kq.khachMoi,
        thieuNuoc: kq.thieuNuoc,
      },
      ghiChu:
        "khoá (team, nước, sđt) — CÙNG luật với cửa POS (khoaKhach + migration 013); " +
        "hội thoại không tra được nước thì BỎ QUA, không tạo khách nước-NULL",
    });

  return kq;
}

/**
 * Câu trả lời cho «vì sao chưa nối được gì» — dựng từ chính `kq`, không gõ tay ở màn.
 * Trả `null` khi lượt chạy có kết quả thật (không cần giải thích cái rỗng).
 */
export function viSaoRong(kq) {
  if (kq.noiMoi || kq.noiVaoCoSan) return null;
  if (kq.xet === 0)
    return "Không hội thoại nào có số điện thoại chưa nối — hoặc chưa có hội thoại nào, hoặc đã nối hết.";
  if (kq.thieuNuoc === kq.xet)
    return (
      `Cả ${kq.xet} hội thoại đều không tra được thị trường: page chưa có ` +
      `\`pos_shop_id\` trỏ tới một kết nối POS đang bật. Điền cột đó rồi chạy lại. ` +
      `Page đang chặn: ${kq.pageThieuShop.join(" · ") || "(không kê được)"}`
    );
  if (kq.mataTranh === kq.xet)
    return "Mọi hội thoại đều vừa được một lượt chạy khác nối — không phải lỗi.";
  return (
    `Xét ${kq.xet} hội thoại: ${kq.thieuNuoc} thiếu thị trường · ` +
    `${kq.sdtKhongDocDuoc} số không đọc được · ${kq.mataTranh} bị lượt khác nối trước.`
  );
}
