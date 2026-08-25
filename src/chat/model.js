// CHỖ CẮM MODEL (DI) — phiếu L2-M1 ②.4, việc T6 của §7b sổ điều hành.
//
// Đây KHÔNG phải lớp model. Lớp model đa-nhà / dự phòng / độ ngẫu nhiên là L1-M4 của
// người B (docs/v3/05-PHAN-VIEC.md). Phiếu này chỉ dựng đúng ba thứ, không hơn:
//   (1) CHỮ KÝ để B cài vào:  layModel(ctx, { vaiTro }) → { client, maModel, nguon }
//   (2) câu SELECT `cau_hinh_model` theo team + vai trò
//   (3) đường LUI khi team chưa cấu hình: client `llm.js` cũ + mã model từ config THẬT
//
// ⚠️ LỜI KHAI PHẢI ĐÚNG TẦM (án lệ #32 skill tho-thi-cong): `client` mà hàm này trả về
//    là ĐÚNG object `anthropic` của `src/llm.js` — cùng object mà `src/closer.js` và
//    `src/classifier.js` tự import thẳng. Nghĩa là ở bản hiện tại, ĐỔI `client` ở đây
//    KHÔNG đổi được model mà `runCloser` gọi: closer.js (file CẤM SỬA) hardcode
//    `import { anthropic } from './llm.js'`. Chỗ cắm này hiện có hiệu lực thật với:
//      · `maModel` — đi thẳng vào `so_ai.ma_model` (kế toán chi phí theo model)
//      · `client`  — được truyền xuống closer qua `ctx.model` để B đọc ở L1-M4
//    B ở L1-M4 muốn ĐỔI ĐƯỢC model thật thì phải thay cả đường closer đọc client
//    (viết closer v3, hoặc thay `llm.js` ở tầng module). Đừng đọc file này thành
//    "model đã cắm xong".
import { anthropic } from "../llm.js";
import { config } from "../config.js";

export const VAI_TRO = Object.freeze(["chinh", "du_phong", "nen"]);

/** Team CÓ cấu hình model nhưng phiếu này chưa dựng nổi client cho nó — fail-CLOSED. */
export class LoiChuaCoLopModel extends Error {
  constructor(msg) {
    super(msg);
    this.name = "LoiChuaCoLopModel";
  }
}

/**
 * Chọn model cho một team + một vai trò.
 *
 * @param {import('pg').Pool} pool
 * @param {{teamId: string|number}} ctx  bối cảnh team (L0-M2). Bắt buộc có teamId THẬT —
 *        `ctxHeThong()` không dùng được ở đây vì "model của team nào" là câu hỏi
 *        BẮT BUỘC có team; worker lấy teamId từ chính dòng tin (xem queue/worker.js).
 * @param {{vaiTro?: 'chinh'|'du_phong'|'nen'}} tuyChon
 * @returns {Promise<{client: any, maModel: string, nguon: 'cau_hinh_model'|'config'}>}
 */
export async function layModel(pool, ctx, { vaiTro = "chinh" } = {}) {
  if (!VAI_TRO.includes(vaiTro)) {
    throw new Error(
      `layModel: vaiTro lạ "${vaiTro}" — chỉ nhận ${VAI_TRO.join("|")}.`,
    );
  }
  if (ctx?.teamId == null) {
    throw new Error(
      "layModel: thiếu ctx.teamId. 'Model của team nào' không có câu trả lời mặc định.",
    );
  }

  // Từ migration 008 khoá API nằm ở bảng `khoa_nha` (MỘT bản mỗi team × nhà), không còn
  // ở `cau_hinh_model.khoa_api_ma`. Ở đây chỉ cần biết CÓ hay KHÔNG có khoá riêng — đó là
  // câu hỏi định tuyến, không phải câu hỏi bí mật — nên hỏi bằng `IS NOT NULL`, không kéo
  // bản mã vào tiến trình chat như bản trước.
  //
  // LƯỚI MIGRATION (án lệ #7): hàm này nằm trên ĐƯỜNG CHAT SỐNG. Deploy code trước khi áp
  // 008 thì `khoa_nha` chưa tồn tại và câu JOIN ném `42P01` ⇒ MỌI lượt trả lời khách chết.
  // Nên bắt đúng mã đó và lui về cột cũ, kèm một dòng KÊU RA — «mù thì phải nói», đừng câm.
  const CAU_MOI = `SELECT c.nha_cung_cap, c.ma_model, c.do_ngau_nhien,
                          (k.khoa_api_ma IS NOT NULL) AS co_khoa_rieng
                     FROM cau_hinh_model c
                     LEFT JOIN khoa_nha k
                            ON k.team_id = c.team_id AND k.nha_cung_cap = c.nha_cung_cap
                    WHERE c.team_id = $1 AND c.vai_tro = $2 AND c.bat
                    LIMIT 1`;
  const CAU_CU = `SELECT nha_cung_cap, ma_model, do_ngau_nhien,
                         (khoa_api_ma IS NOT NULL) AS co_khoa_rieng
                    FROM cau_hinh_model
                   WHERE team_id = $1 AND vai_tro = $2 AND bat
                   LIMIT 1`;
  let r;
  try {
    r = await pool.query(CAU_MOI, [ctx.teamId, vaiTro]);
  } catch (e) {
    if (e?.code !== "42P01") throw e;
    console.warn(
      "[model] bảng `khoa_nha` chưa có (migration 008 chưa áp) — đọc tạm khoá ở cột cũ " +
        "`cau_hinh_model.khoa_api_ma`. Áp 008 rồi thì dòng này biến mất.",
    );
    r = await pool.query(CAU_CU, [ctx.teamId, vaiTro]);
  }

  if (!r.rowCount) {
    // ĐƯỜNG LUI — team chưa cấu hình. `maModel` lấy từ config THẬT đang chạy
    // (`MODEL_CLOSER` trong .env qua `config.modelCloser`), KHÔNG phải hằng gõ tay:
    // gõ tay là `so_ai.ma_model` khai một model trong khi hệ gọi một model khác, và
    // mọi phép so "model nào rẻ hơn" sau này đọc trên số bịa.
    return { client: anthropic, maModel: config.modelCloser, nguon: "config" };
  }

  const row = r.rows[0];
  // Team CÓ cấu hình. Phiếu này KHÔNG dựng client đa-nhà (việc B, L1-M4), nên chỉ
  // phục vụ được đúng ca client cũ dùng được: cùng nhà cung cấp VÀ không có khoá
  // riêng. Mọi ca khác ⇒ ném lỗi, KHÔNG lặng lẽ gọi nhà A bằng mã model của nhà B
  // (im lặng ở đây là hoá đơn sai + một lượt 400 mà khách chỉ thấy bot câm).
  if (row.nha_cung_cap !== config.aiProvider || row.co_khoa_rieng) {
    throw new LoiChuaCoLopModel(
      `Team ${ctx.teamId} cấu hình model riêng (nha_cung_cap=${row.nha_cung_cap}` +
        `${row.co_khoa_rieng ? " · có khoá API riêng" : ""}) nhưng L2-M1 chỉ có client ` +
        `của llm.js cũ (nhà đang chạy: ${config.aiProvider}). Cần lớp model L1-M4 ` +
        `của người B. Fail-CLOSED — không gọi bằng client sai nhà.`,
    );
  }
  return { client: anthropic, maModel: row.ma_model, nguon: "cau_hinh_model" };
}
