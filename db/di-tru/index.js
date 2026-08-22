#!/usr/bin/env node
// `npm run di-tru` — đọc JSON thật ở gốc repo, ghi vào nền v3. CHẠY LẠI ĐƯỢC.
//
//   node db/di-tru/index.js
//   node db/di-tru/index.js --so-ai=/opt/aicloser/ai-messages.jsonl --ma-model-cu=kimi-k2.6
//
// In ra HAI VẾ của từng phép (nguồn ↔ đích) và LIỆT KÊ mọi thứ bị bỏ qua.
// ⛔ Chỉ ĐỌC các tệp nguồn. Không sửa, không xoá, không ghi ngược.
import { voiPool, GOC } from "../ket-noi.js";
import { diTruTatCa } from "./nap.js";
import { napSoAi } from "./so-ai.js";
import { diTruKetNoiPos, TEP_NGUON as TEP_SHOP } from "./ket-noi-pos.js";
import { seedBoLuatVaKyNang } from "./bo-luat-va-ky-nang.js";

function thamSo(ten) {
  const p = process.argv.find((a) => a.startsWith(`--${ten}=`));
  return p ? p.slice(ten.length + 3) : null;
}

export async function chay(
  pool,
  goc = GOC,
  { soAi = null, maModelCu = null } = {},
) {
  const kq = await diTruTatCa(pool, goc);
  const dem = async (bang) =>
    Number((await pool.query(`SELECT count(*) c FROM ${bang}`)).rows[0].c);
  kq.dich = {
    page: await dem("page"),
    pageBatAi: Number(
      (await pool.query("SELECT count(*) c FROM page WHERE bot_ai_bat")).rows[0]
        .c,
    ),
    hoiThoai: await dem("hoi_thoai"),
    kichBan: await dem("kich_ban"),
  };
  kq.ketNoiPos = await diTruKetNoiPos(pool, goc);
  // L2-M3 — seed mồi bo_luat_chung v1 (rút từ prompts.js) + ky_nang "hỏi size".
  kq.boLuatVaKyNang = await seedBoLuatVaKyNang(pool);
  if (soAi) kq.soAi = await napSoAi(pool, soAi, { maModelCu });
  return kq;
}

function inBaoCao(kq) {
  const d = kq.dich;
  console.log("── DI TRÚ v3 ──────────────────────────────────────────────");
  console.log(
    `page          nguồn pages.json = ${kq.page.nguon}   →  bảng page = ${d.page}`,
  );
  console.log(
    `công tắc AI   nguồn ai-enabled.json = ${kq.congTac.nguon}   →  page.bot_ai_bat = ${d.pageBatAi}`,
  );
  console.log(
    `hội thoại     nguồn conv-state.json = ${kq.hoiThoai.nguon}   →  bảng hoi_thoai = ${d.hoiThoai}`,
  );
  console.log(
    `kịch bản      nguồn ${kq.kichBan.soTepLichSu} tệp script-versions (${kq.kichBan.nguon} bản)` +
      ` + ${kq.kichBan.soMucKb} mục kb-overrides  →  bảng kich_ban = ${d.kichBan}`,
  );
  const kn = kq.ketNoiPos;
  if (kn?.chuaCoBang) {
    console.log(
      `kết nối POS  nguồn ${TEP_SHOP} = ${kn.nguon} thị trường  →  BỎ QUA: chưa áp migration 002_ket_noi_pos`,
    );
  } else if (kn) {
    console.log(
      `kết nối POS  nguồn ${TEP_SHOP} = ${kn.nguon} thị trường  →  bảng ket_noi_pos = ${kn.dich}` +
        `  (thêm ${kn.them} · cập nhật ${kn.capNhat} · giữ nguyên ${kn.giuNguyen})`,
    );
  }
  const bl = kq.boLuatVaKyNang;
  if (bl) {
    console.log(
      `bộ luật chung nguồn prompts.js#CORE (${bl.boLuatChung.doDai} ký tự) → ` +
        `bo_luat_chung v${bl.boLuatChung.phienBan} ` +
        `(${bl.boLuatChung.them ? "vừa thêm" : "đã có, giữ nguyên"})`,
    );
    console.log(
      `kỹ năng "hỏi size"  → ky_nang thêm ${bl.kyNang.them.length} team ` +
        `(${bl.kyNang.them.join(", ") || "-"}) · giữ nguyên ${bl.kyNang.giuNguyen.length} ` +
        `(${bl.kyNang.giuNguyen.join(", ") || "-"})`,
    );
  }
  if (kq.soAi) {
    console.log(
      `sổ AI         nguồn ${kq.soAi.soDongTep} dòng  →  thêm mới ${kq.soAi.them} (hỏng ${kq.soAi.hong.length})`,
    );
  } else {
    console.log(
      "sổ AI         BỎ QUA — tệp chỉ có trên VPS, nạp ở đợt cutover (nợ §9 sổ điều hành)",
    );
  }

  console.log("── ĐÃ SỬA / ĐÃ BỎ QUA (liệt kê, cấm nuốt im) ──────────────");
  console.log(
    `chuỗi phải vá surrogate lẻ (→ U+FFFD): kịch bản ${kq.kichBan.soVaSurrogate}` +
      ` · hội thoại ${kq.hoiThoai.soVaSurrogate}`,
  );
  console.log(
    `page LẠC (có dữ liệu, KHÔNG có trong pages.json): ${kq.pageLac.length}`,
  );
  for (const p of kq.pageLac)
    console.log(`   · ${p.pageId}  ← ${p.nguon.join(" · ")}`);
  console.log(
    `công tắc AI trỏ page không có dòng page: ${kq.congTac.khongCoDongPage.length}` +
      (kq.congTac.khongCoDongPage.length
        ? ` → ${kq.congTac.khongCoDongPage.join(", ")}`
        : ""),
  );
  console.log(
    `hội thoại bỏ vì page lạc: ${kq.hoiThoai.boQuaPageLac.length}` +
      `  · khoá conv-state sai khuôn: ${kq.hoiThoai.khoaLa.length}`,
  );
  console.log(`bản kịch bản bỏ vì page lạc: ${kq.kichBan.boQuaPageLac.length}`);
  for (const b of kq.kichBan.boQuaPageLac) console.log(`   · ${b}`);
  console.log(
    `mục kb-overrides chỉ có sản phẩm (0 kịch bản): ${kq.kichBan.kbKhongCfg.length}` +
      (kq.kichBan.kbKhongCfg.length
        ? ` → ${kq.kichBan.kbKhongCfg.join(", ")}`
        : ""),
  );
  console.log(
    `mục kb-overrides có kịch bản mà chưa có tệp lịch sử: ${kq.kichBan.kbRieng.length}` +
      (kq.kichBan.kbRieng.length ? ` → ${kq.kichBan.kbRieng.join(", ")}` : ""),
  );
}

async function main() {
  await voiPool(async (pool) => {
    const kq = await chay(pool, GOC, {
      soAi: thamSo("so-ai"),
      maModelCu: thamSo("ma-model-cu"),
    });
    inBaoCao(kq);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
