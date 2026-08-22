// CỬA PANCAKE MESSENGER v3 (PHIẾU L1-M2) — MỘT chỗ DUY NHẤT cho CODE V3 khi đụng Pancake
// Messenger. Bọc `src/pancake.js` QUA IMPORT (cấm sửa file đó — bản đang chạy, 51 page
// khách thật), thêm HAI LỚP mà bản cũ không có ở một chỗ tập trung: (1) định tuyến team
// qua tầng truy vấn `src/db/`, (2) guard tại cửa fail-closed cho nhóm hàm GỬI/GHI.
// Đường v2 cũ (pancake-poll.js, tools.js, handler.js, scheduler-followup.js, admin*.js)
// KHÔNG đụng, có vòng đời riêng — xem nợ N2 ở §9 sổ điều hành (chuyển cho L2-M1).
//
// ⚠️ PHÁT HIỆN LỆCH ĐỀ BÀI (đo lại nguyên liệu, skill tho-thi-cong bước 3 + án lệ #4):
// phiếu ④#2b viết "Kiểm convId THUỘC pageId (N5): tra hoi_thoai (UNIQUE(page,psid))".
// Đo src/pancake.js + src/pancake-poll.js:277 (`const psid = c.from_psid`) và fixture cũ
// test/l7-miner-order.test.mjs:122 (`id: 'c${i}', from_psid: 'psid${i}'` — CỐ Ý hai chuỗi
// khác nhau) cho thấy: convId của Pancake (tham số `pkConvId`/`c.id`, dùng để gọi
// pkSendReply/pkSendImage/pkGetMessages/pkToggleTag) và `psid` (Facebook Page-Scoped ID
// của khách, `c.from_psid`, lưu trong cột `hoi_thoai.psid`) là HAI GIÁ TRỊ KHÁC NHAU,
// không phải cùng một trường đổi tên. `hoi_thoai` KHÔNG có cột nào lưu convId thô của
// Pancake. Nếu so trực tiếp convId với cột `psid` thì câu tra sẽ 0 dòng khớp VĨNH VIỄN —
// khoá cửa với MỌI hội thoại thật, không phải chỉ khoá hội thoại giả mạo.
// QUYẾT ĐỊNH (rule 11+13 skill — nói rõ, không đoán ngầm): N5 tra chéo bằng `psid` (đúng
// cột UNIQUE(page_id,psid) mà phiếu trích dẫn) — convId của Pancake vẫn được TRUYỀN
// XUỐNG NGUYÊN VẸN cho lệnh gọi HTTP thật (bắt buộc, API Pancake cần nó), nhưng KHÔNG
// dùng để so khớp quyền sở hữu. Giá phải trả: caller phải có sẵn `psid` bên cạnh `convId`
// khi gọi các hàm nhận hội thoại — đúng những gì vòng poll v2 vốn đã mang theo suốt
// (`processConv(pageId, c, psid, custId, mark)`), nên L2-M1 (người gọi kế tiếp) không
// phải tính toán gì thêm. Xem thêm docs/v3/ban-giao/cua-messenger-v1.md §"psid ≠ convId".
//
// KHUÔN LỖI: mọi chặn (định tuyến team, N5, guard) NÉM lỗi có tên — KHÔNG trả sentinel
// {ok:false}, khác với lỗi MẠNG/API thật của pancake.js (những cái đó vẫn trả nguyên
// {ok:false,error} như cũ, đi thẳng qua tầng này không đổi hình dạng).
import {
  pkGetConversations,
  pkGetMessages,
  pkSendReply,
  pkSendImage,
  pkAddNote,
  pkTagByName,
} from "../../pancake.js";
import { layNhieu, ctxHeThong, ghiNhatKy } from "../../db/index.js";
import {
  LoiPageKhongThuocTeam,
  LoiHoiThoaiKhongThuocPage,
  LoiCuaGuiDong,
} from "./loi.js";

export { LoiPageKhongThuocTeam, LoiHoiThoaiKhongThuocPage, LoiCuaGuiDong };

// ── N1: GUARD TẠI CỬA — FAIL-CLOSED ĐÚNG CHIỀU ──────────────────────────────────────
// Đọc process.env TƯƠI mỗi lượt gọi (không cache ở module-scope) — test đổi biến giữa
// các ca trong CÙNG tiến trình (node --test chạy nhiều test() trong một file) phải thấy
// giá trị mới ngay, không phải giá trị lúc import. Cùng khuôn với cách bản cũ đọc
// PANCAKE_READONLY rải rác (`process.env.PANCAKE_READONLY === '1'`, vd admin-orders.js:21),
// KHÁC Ở CHIỀU: bản cũ "vắng biến = mở" (danh sách cấm), cửa v3 "vắng biến = ĐÓNG" —
// đúng khuôn V3_POS_GHI của L1-M1 (phiếu ②, H9 sổ điều hành).
function cuaDangMo() {
  return (
    process.env.V3_PANCAKE_GUI === "1" && process.env.PANCAKE_READONLY !== "1"
  );
}

function kiemGuardGuiGhi(tenThaoTac) {
  if (!cuaDangMo()) {
    throw new LoiCuaGuiDong(
      `Cửa GỬI/GHI Pancake đang ĐÓNG (${tenThaoTac}) — cần V3_PANCAKE_GUI==='1' VÀ ` +
        `PANCAKE_READONLY!=='1'. Đo lúc gọi: V3_PANCAKE_GUI=${JSON.stringify(
          process.env.V3_PANCAKE_GUI,
        )} · PANCAKE_READONLY=${JSON.stringify(
          process.env.PANCAKE_READONLY,
        )}. Vắng biến = ĐÓNG (fail-closed).`,
    );
  }
}

// ── Định tuyến team + N3 (ctxHeThong gắn ĐÚNG team của page) ────────────────────────
// Trả về { teamId, pageRowId, ctxHieuLuc } đã xác nhận page thuộc đúng team, hoặc ném
// LoiPageKhongThuocTeam. `pageRowId` là `page.id` (bigint nội bộ, khác `page_id` text
// Facebook) — dùng để tra hoi_thoai ở bước N5 kế tiếp (hoi_thoai.page_id là FK tới đây).
async function trangPageTheoTeam(pool, ctx, pageId) {
  if (ctx?.laHeThong) {
    // N3: đường job nền (poll/webhook — "không có NGƯỜI") KHÔNG có team cố định để tầng
    // truy vấn tự chèn hộ — phải tự tìm team của CHÍNH page đang xử lý rồi mới có ctx hợp
    // lệ để gọi tiếp. Tra RAW ngoài tầng truy vấn (bỏ qua ctx-scope vì CHƯA CÓ team để mà
    // scope) — CÙNG TIỀN LỆ với `thanh_vien_team` (docs/v3/ban-giao/luoc-do-v1.md §6: "tra
    // team TRƯỚC KHI có ctx là chuyện con-gà-quả-trứng... SQL trực tiếp qua db/ket-noi.js,
    // không qua src/db/"). Chỉ đọc đúng 1 dòng theo khoá tự nhiên (page_id), không liệt kê
    // rộng — không phải lối vòng bỏ rào team, mà là bước DUY NHẤT có thể bootstrap ra team.
    const r = await pool.query(
      "SELECT id, team_id FROM page WHERE page_id = $1",
      [String(pageId)],
    );
    if (!r.rowCount) {
      throw new LoiPageKhongThuocTeam(
        `page_id=${pageId} không tồn tại (đường hệ-thống — chưa có team nào để ghi nhat_ky).`,
      );
    }
    return {
      teamId: r.rows[0].team_id,
      pageRowId: r.rows[0].id,
      ctxHieuLuc: ctxHeThong(), // vẫn "hệ-thống" — mọi lượt gọi kế tiếp qua tầng truy vấn
    }; //   dưới ctx này đều tự ghi nhat_ky (xem src/db/truy-van.js ghiNhatKyHeThong).
  }

  // ctx NGƯỜI — dùng ĐÚNG tầng truy vấn để tự chèn team_id + xác nhận ctx hợp lệ (ném
  // LoiThieuBoiCanhTeam hộ nếu ctx rỗng/sai/kỹ thuật — không viết lại kiểm tra đó ở đây,
  // tầng truy vấn đã là nguồn sự thật DUY NHẤT cho việc đó).
  const rows = await layNhieu(pool, ctx, "page", {
    dieuKien: { page_id: String(pageId) },
  });
  if (!rows.length) {
    await ghiNhatKy(pool, {
      teamId: ctx.teamId,
      tacNhan: `nguoi:${ctx.nguoiDungId ?? "?"}`,
      nguoiDungId: ctx.nguoiDungId ?? null,
      hanhDong: "chan_page_xuyen_team",
      doiTuong: "page",
      doiTuongId: String(pageId),
      ghiChu: `ctx.teamId=${ctx.teamId} không sở hữu page_id=${pageId} (không tồn tại hoặc thuộc team khác).`,
    });
    throw new LoiPageKhongThuocTeam(
      `page_id=${pageId} không thuộc team ${ctx.teamId} (không tồn tại hoặc của team khác).`,
    );
  }
  return { teamId: ctx.teamId, pageRowId: rows[0].id, ctxHieuLuc: ctx };
}

// ── N5: psid PHẢI khớp một dòng hoi_thoai của ĐÚNG page đã xác định ở trên ──────────
// (xem ghi chú "psid ≠ convId" đầu file — đây là lý do vì sao tham số là `psid`, không
// phải `convId`). Yêu cầu ngầm cho L2-M1: hội thoại MỚI (khách nhắn lần đầu, chưa có
// dòng hoi_thoai) phải được `themMoi` vào `hoi_thoai` TRƯỚC khi gọi các hàm nhận `psid`
// ở cửa này — khai rõ trong ban-giao, không phải hành vi ngầm.
async function xacNhanHoiThoaiThuocPage(
  pool,
  ctxHieuLuc,
  teamId,
  pageRowId,
  psid,
  pageIdGoc,
) {
  const dieuKien = ctxHieuLuc?.laHeThong
    ? { team_id: teamId, page_id: pageRowId, psid: String(psid) }
    : { page_id: pageRowId, psid: String(psid) };
  const rows = await layNhieu(pool, ctxHieuLuc, "hoi_thoai", { dieuKien });
  if (!rows.length) {
    throw new LoiHoiThoaiKhongThuocPage(
      `psid=${psid} không khớp dòng hoi_thoai nào của page_id=${pageIdGoc} (N5).`,
    );
  }
  return rows[0];
}

// ══ ĐỌC — không bị guard N1 chặn (chỉ định tuyến team) ══════════════════════════════

/** Đọc danh sách hội thoại có tin mới của MỘT page (vòng poll). */
export async function docHoiThoai(pool, ctx, { pageId }, deps = {}) {
  const { getConversations = pkGetConversations } = deps;
  await trangPageTheoTeam(pool, ctx, pageId);
  return getConversations(pageId);
}

/** Đọc tin nhắn của MỘT hội thoại (tối đa 25 tin/lần, theo TONG-QUAN §4.2). */
export async function docTin(
  pool,
  ctx,
  { pageId, psid, convId, custId },
  deps = {},
) {
  const { getMessages = pkGetMessages } = deps;
  const { teamId, pageRowId, ctxHieuLuc } = await trangPageTheoTeam(
    pool,
    ctx,
    pageId,
  );
  await xacNhanHoiThoaiThuocPage(
    pool,
    ctxHieuLuc,
    teamId,
    pageRowId,
    psid,
    pageId,
  );
  return getMessages(pageId, convId, custId);
}

// ══ GỬI/GHI — dưới guard N1 (V3_PANCAKE_GUI==='1' VÀ PANCAKE_READONLY!=='1') ═════════

/** Gửi tin CHỮ trả lời khách. */
export async function guiTin(
  pool,
  ctx,
  { pageId, psid, convId, custId, text },
  deps = {},
) {
  const { send = pkSendReply } = deps;
  const { teamId, pageRowId, ctxHieuLuc } = await trangPageTheoTeam(
    pool,
    ctx,
    pageId,
  );
  await xacNhanHoiThoaiThuocPage(
    pool,
    ctxHieuLuc,
    teamId,
    pageRowId,
    psid,
    pageId,
  );
  kiemGuardGuiGhi("guiTin");
  return send(pageId, convId, custId, text);
}

/** Gửi ẢNH (content_url công khai) kèm caption. */
export async function guiAnh(
  pool,
  ctx,
  { pageId, psid, convId, custId, url, caption = "" },
  deps = {},
) {
  const { sendImage = pkSendImage } = deps;
  const { teamId, pageRowId, ctxHieuLuc } = await trangPageTheoTeam(
    pool,
    ctx,
    pageId,
  );
  await xacNhanHoiThoaiThuocPage(
    pool,
    ctxHieuLuc,
    teamId,
    pageRowId,
    psid,
    pageId,
  );
  kiemGuardGuiGhi("guiAnh");
  return sendImage(pageId, convId, custId, url, caption);
}

/** Ghi GHI CHÚ vào hồ sơ khách (cơ chế bàn giao sale, §7.4 TONG-QUAN). `pkAddNote` của
 *  Pancake CHỈ nhận pageId+custId (không có convId/psid) — nên KHÔNG áp N5 ở đây, chỉ
 *  định tuyến team theo page (cấu trúc, không phải thiếu sót — xem index.js §"N5"). */
export async function ghiNote(
  pool,
  ctx,
  { pageId, custId, message },
  deps = {},
) {
  const { addNote = pkAddNote } = deps;
  await trangPageTheoTeam(pool, ctx, pageId);
  kiemGuardGuiGhi("ghiNote");
  return addNote(pageId, custId, message);
}

/** Gắn/gỡ THẺ theo TÊN (cơ chế bàn giao sale, cùng nhóm với ghiNote). */
export async function gatThe(
  pool,
  ctx,
  { pageId, psid, convId, name, on = true },
  deps = {},
) {
  const { tagByName = pkTagByName } = deps;
  const { teamId, pageRowId, ctxHieuLuc } = await trangPageTheoTeam(
    pool,
    ctx,
    pageId,
  );
  await xacNhanHoiThoaiThuocPage(
    pool,
    ctxHieuLuc,
    teamId,
    pageRowId,
    psid,
    pageId,
  );
  kiemGuardGuiGhi("gatThe");
  return tagByName(pageId, convId, name, on);
}
