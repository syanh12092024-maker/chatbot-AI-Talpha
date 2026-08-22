#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG NGHIỆM THU PHIẾU L3-M2 — Lọc trùng CHÉO hai luồng + chấm tỉ lệ hoàn BỐN TẦNG.
# Thi hành đúng TÁM phép của ④ trong docs/thi-cong/phieu/PHIEU-L3-M2.md.
#
# LUẬT: mỗi phép in MỘT CON SỐ hoặc MỘT DANH SÁCH. Không dòng nào chỉ nói "chạy xong".
#
# BA TRẠNG THÁI — ✔ ĐẠT · ✘ TRƯỢT · ⏸ HOÃN (khuôn l3-m1.sh). «Hoãn» ở cổng này là
# nhánh CỐ Ý chưa đo được: phân tầng trên 144 khách THẬT (⑤ của phiếu — cần dữ liệu
# đầy ở cutover) và vế «cùng sản phẩm» trên đơn THẬT (cột `don_hang.san_pham_ma` chưa
# có người ghi — chủ cột là cửa POS L1-M1, đã ghi §9). Gộp hoãn vào đạt là nói dối.
#
# Cổng TỰ DỰNG CSDL sandbox `aicloser_v3_nt_l3m2` từ khuôn trần rồi TỰ DỌN (luật 11 sổ
# điều hành) — KHÔNG chạm `aicloser_v3` dev (đơn thật + dữ liệu hai thợ song song),
# KHÔNG chạm mạng lượt nào.
#
#   bash ops/bin/nghiem-thu/l3-m2.sh
#   GIU_SANDBOX=1 bash ops/bin/nghiem-thu/l3-m2.sh   # giữ CSDL lại để soi tay
# ═══════════════════════════════════════════════════════════════════════════════
set -uo pipefail

GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${GOC}" || exit 2

CONTAINER="talpha-pg"
DB="aicloser_v3_nt_l3m2"
LOI=0
PHEP=0
HOAN=0

muc()   { printf '\n── %s\n' "$1"; }
so()    { printf '   %-58s %s\n' "$1" "$2"; }
dat()   { PHEP=$((PHEP + 1)); printf '   ✔ %s\n' "$1"; }
truot() { PHEP=$((PHEP + 1)); LOI=$((LOI + 1)); printf '   ✘ %s\n' "$1"; }
hoan()  { HOAN=$((HOAN + 1)); printf '   ⏸ HOÃN — %s\n' "$1"; }
bang() {
  so "$1" "$2"
  case "$2" in
    *LOI-NODE*) truot "$1: câu đo HỎNG (LOI-NODE) — không đọc là đạt"; return ;;
  esac
  if [ "$2" = "$3" ]; then dat "$1 = $3"; else truot "$1: thật=$2 · chờ=$3"; fi
}

# Chạy một khối node -e; in đúng NỘI DUNG stdout, hoặc "LOI-NODE" khi rc≠0 — KHÔNG in
# nguyên văn lỗi (hai lượt cùng hỏng ra hai chuỗi BẰNG NHAU thì phép so đọc nhầm ĐẠT).
nodex() {
  local out
  if out="$(node -e "$1" 2>/tmp/l3m2-node-err.txt)"; then
    printf '%s' "${out}"
  else
    printf 'LOI-NODE'
  fi
}

if ! docker ps --format '{{.Names}}' | grep -qx "${CONTAINER}"; then
  echo "✘ container ${CONTAINER} không chạy — cổng không đo được"; exit 2
fi
docker exec "${CONTAINER}" psql -U aicloser -d postgres -tAc \
  "DROP DATABASE IF EXISTS ${DB} WITH (FORCE)" >/dev/null 2>&1
if ! docker exec "${CONTAINER}" psql -U aicloser -d postgres -v ON_ERROR_STOP=1 -tAc \
  "CREATE DATABASE ${DB}" >/dev/null 2>&1; then
  echo "✘ không tạo được CSDL sandbox ${DB} — cổng dừng"; exit 2
fi

# CHỤP chuỗi nối CSDL DEV *TRƯỚC* khi ghi đè (án lệ l3-m1 vòng 1: một phép «đo dev»
# chạy dưới biến đã trỏ sandbox là phép đo SAI MÔI TRƯỜNG).
URL_DEV="$(node -e '
const { chuoiNoi } = await import("./db/ket-noi.js"); console.log(chuoiNoi());
')"
DATABASE_URL_V3="$(node -e '
const u = new URL(process.argv[1]); u.pathname = "/" + process.argv[2]; console.log(u.toString());
' "${URL_DEV}" "${DB}")"
export DATABASE_URL_V3
V3_KHOA_MA_HOA="$(node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))')"
export V3_KHOA_MA_HOA

don_dep() {
  if [ "${GIU_SANDBOX:-0}" = "1" ]; then
    printf '\n(giữ lại CSDL %s theo GIU_SANDBOX=1)\n' "${DB}"
  else
    docker exec "${CONTAINER}" psql -U aicloser -d postgres -tAc \
      "DROP DATABASE IF EXISTS ${DB} WITH (FORCE)" >/dev/null 2>&1
  fi
}
trap don_dep EXIT

echo "CỔNG NGHIỆM THU L3-M2 · $(date '+%F %T') · cây $(git rev-parse --short HEAD 2>/dev/null)"
echo "CSDL đo: ${DB} (sandbox, KHÔNG phải aicloser_v3 dev) · container ${CONTAINER}"

node db/migrate.js >/dev/null 2>&1
CO_COT="$(docker exec "${CONTAINER}" psql -U aicloser -d "${DB}" -tAc \
  "SELECT count(*) FROM information_schema.columns
    WHERE (table_name='khach'    AND column_name IN ('tang_hoan','so_don_ket','so_don_hoan','cham_hoan_luc'))
       OR (table_name='don_hang' AND column_name='san_pham_ma')" 2>/dev/null | tr -d ' ')"
so "migration 005 — 4 cột khach + 1 cột don_hang" "${CO_COT}"
[ "${CO_COT}" = "5" ] || { echo "✘ migration 005 chưa áp được — cổng dừng"; exit 2; }

# ═══ ① KIỂM CHÉO HAI LUỒNG — CẢ HAI CHIỀU (02 §L3 nguyên văn) ═════════════════
# «Khách đặt trang bán hàng rồi chat Messenger cùng sản phẩm → bị bắt là trùng», và
# chiều ngược lại cũng phải bắt. In CẢ HAI chiều, không in một chiều rồi suy chiều kia.
muc "① KIỂM CHÉO HAI CHIỀU (đơn ở luồng A → hỏi ở luồng B, và ngược lại)"
KQ1="$(nodex '
const { kiemTrung } = await import("./src/orders/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const ctx = { teamId: t, nguoiDungId: null };
  const kh = async (sdt) => (await pool.query(
    "INSERT INTO khach (team_id, so_dien_thoai, ten) VALUES ($1,$2,$3) RETURNING id",[t,sdt,"K"])).rows[0].id;
  const don = async (khachId, nguon, sp) => pool.query(
    `INSERT INTO don_hang (team_id, ma_pos, nguon, trang_thai_he, trang_thai_pos, khach_id, san_pham_ma)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [t, "9999:"+Math.floor(Math.random()*1e9), nguon, "moi_tu_pos", "0", khachId, sp]);
  // chiều A: đơn LadiPage có trước, khách quay lại chat Messenger cùng SP
  const k1 = await kh("0583000101"); await don(k1, "trang_ban_hang", ["1:SP-A"]);
  const a = await kiemTrung(pool, ctx, { soDienThoai: "+966583000101", sanPhamId: "1:SP-A" });
  // chiều B (ĐẢO): đơn Messenger có trước, khách bấm BUY NOW trên trang bán hàng
  const k2 = await kh("0583000102"); await don(k2, "messenger", ["1:SP-B"]);
  const b = await kiemTrung(pool, ctx, { soDienThoai: "583000102", sanPhamId: "1:SP-B" });
  // khách có ĐỦ CẢ HAI luồng
  const k3 = await kh("0583000103");
  await don(k3, "trang_ban_hang", ["1:SP-C"]); await don(k3, "messenger", ["1:SP-C"]);
  const c = await kiemTrung(pool, ctx, { soDienThoai: "00966583000103", sanPhamId: "1:SP-C" });
  console.log(JSON.stringify({
    chieuA: [a.trung, a.nguon_trung, a.ly_do],
    chieuB: [b.trung, b.nguon_trung, b.ly_do],
    caHai:  [c.trung, c.nguon_trung, c.don.length],
    veNguonTrongCau: /nguon\s*=/.test((await import("./src/orders/loc-trung.js")).CAU_TRA_TRUNG),
  }));
});
')"
so "kết quả hai chiều" "${KQ1}"
bang "chiều A — LadiPage trước, hỏi từ Messenger" \
     "$(printf '%s' "${KQ1}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).chieuA.join("|"))}catch{console.log("LOI-NODE")}})')" \
     "true|trang_ban_hang|trung_khop_san_pham"
bang "chiều B (ĐẢO) — Messenger trước, hỏi từ trang bán hàng" \
     "$(printf '%s' "${KQ1}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).chieuB.join("|"))}catch{console.log("LOI-NODE")}})')" \
     "true|messenger|trung_khop_san_pham"
bang "khách có đơn ở CẢ HAI luồng ⇒ nguon_trung=ca_hai, 2 đơn" \
     "$(printf '%s' "${KQ1}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).caHai.join("|"))}catch{console.log("LOI-NODE")}})')" \
     "true|ca_hai|2"
bang "câu tra KHÔNG mang vế lọc \`nguon\` (mất vế = mất phép CHÉO)" \
     "$(printf '%s' "${KQ1}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(String(JSON.parse(s).veNguonTrongCau))}catch{console.log("LOI-NODE")}})')" \
     "false"

# ═══ ② CHUẨN HOÁ SĐT — BẢNG CA LỆCH THẬT, IN TỪNG CẶP ═════════════════════════
muc "② CHUẨN HOÁ SĐT — 9 ca lệch ĐO ĐƯỢC trên 5.144 đơn thật/7 shop, in TỪNG CẶP"
node -e '
const { chuanHoaSdt } = await import("./src/orders/loc-trung.js");
const bang = [
  ["0583077980","583077980","Saudi 0-đầu (1.068 ca thật)"],
  ["+966583077980","583077980","Saudi +E164 (270 ca thật)"],
  ["00966583077980","583077980","Saudi tiền tố 00 (25 ca thật)"],
  ["583077980","583077980","Saudi số trần (1.966 ca thật)"],
  [" 583 077-980 ","583077980","khoảng trắng + gạch nối"],
  ["+971568249989","568249989","UAE +E164"],
  ["+96556572241","56572241","Kuwait +E164 (nội địa 8 số)"],
  ["0056572241","56572241","Kuwait 00 + nội địa"],
  ["+886912345678","912345678","Taiwan +E164 (nội địa 9 số)"],
];
let hong = 0;
for (const [tho, cho, y] of bang) {
  const th = chuanHoaSdt(tho);
  const ok = th === cho;
  if (!ok) hong++;
  console.log(`   ${ok ? "✔" : "✘"} ${String(tho).padEnd(16)} → ${String(th).padEnd(12)} (chờ ${cho}) · ${y}`);
}
console.log(`   SO-CA=${bang.length} HONG=${hong}`);
' 2>/dev/null | tee /tmp/l3m2-sdt.txt
KQ2="$(grep -o 'SO-CA=[0-9]* HONG=[0-9]*' /tmp/l3m2-sdt.txt | tail -1)"
bang "bảng ca lệch SĐT (≥8 ca, 0 hỏng)" "${KQ2:-LOI-NODE}" "SO-CA=9 HONG=0"

# ═══ ③ SĐT NULL — NÓI RA, KHÔNG NÉM, KHÔNG IM ═════════════════════════════════
muc "③ SĐT NULL (Messenger giữa chừng) → trung:false + ly_do='chua_co_sdt'"
KQ3="$(nodex '
const { kiemTrung } = await import("./src/orders/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const ctx = { teamId: t, nguoiDungId: null };
  const ra = [];
  for (const v of [null, undefined, "", "   "]) {
    try { const k = await kiemTrung(pool, ctx, { soDienThoai: v, sanPhamId: "1:SP-A" });
          ra.push(`${k.trung}/${k.ly_do}`); }
    catch (e) { ra.push("NEM:"+e.name); }
  }
  const rac = await kiemTrung(pool, ctx, { soDienThoai: "khong-biet" });
  console.log([...new Set(ra)].join(",") + " · rác=" + rac.ly_do);
});
')"
bang "4 dạng SĐT vắng + 1 dạng rác (lý do RIÊNG, không lẫn)" "${KQ3}" \
     "false/chua_co_sdt · rác=sdt_khong_doc_duoc"

# ═══ ④ ĐỐI CHỨNG ÂM — KHÁC SP · NGOÀI CỬA SỔ NGÀY ═════════════════════════════
muc "④ ĐỐI CHỨNG ÂM (2 ca): khác sản phẩm · ngoài cửa sổ ngày"
KQ4="$(nodex '
const { kiemTrung, KEO_NGAY_MAC_DINH } = await import("./src/orders/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const ctx = { teamId: t, nguoiDungId: null };
  const kh = async (sdt) => (await pool.query(
    "INSERT INTO khach (team_id, so_dien_thoai, ten) VALUES ($1,$2,$3) RETURNING id",[t,sdt,"K"])).rows[0].id;
  const don = async (khachId, sp, truocNgay) => pool.query(
    `INSERT INTO don_hang (team_id, ma_pos, nguon, trang_thai_he, trang_thai_pos, khach_id, san_pham_ma, tao_luc)
     VALUES ($1,$2,$3,$4,$5,$6,$7, now() - ($8 * interval $$1 day$$))`,
    [t, "9999:"+Math.floor(Math.random()*1e9), "trang_ban_hang", "moi_tu_pos", "0", khachId, sp, truocNgay]);
  const k1 = await kh("0583000201"); await don(k1, ["1:SP-X"], 0);
  const khacSp = await kiemTrung(pool, ctx, { soDienThoai: "0583000201", sanPhamId: "1:SP-Y" });
  const k2 = await kh("0583000202"); await don(k2, ["1:SP-Z"], 30);
  const ngoai = await kiemTrung(pool, ctx, { soDienThoai: "0583000202", sanPhamId: "1:SP-Z" });
  // ĐỐI CHỨNG CỦA ĐỐI CHỨNG: nới cửa sổ thì CHÍNH đơn đó lại thấy ⇒ chứng minh cái
  // khác biệt là CỬA SỔ, không phải «đơn không tồn tại» (bẫy xanh giả).
  const noi = await kiemTrung(pool, ctx, { soDienThoai: "0583000202", sanPhamId: "1:SP-Z", keo_ngay: 60 });
  console.log(`khacSP=${khacSp.trung}/${khacSp.ly_do}/xet${khacSp.so_don_xet} ngoaiCuaSo=${ngoai.trung}/xet${ngoai.so_don_xet} noiCuaSo=${noi.trung} macDinh=${KEO_NGAY_MAC_DINH}`);
});
')"
bang "hai ca âm + đối chứng nới cửa sổ" "${KQ4}" \
     "khacSP=false/khong_trung/xet1 ngoaiCuaSo=false/xet0 noiCuaSo=true macDinh=7"

# ═══ ⑤ TỈ LỆ HOÀN — BỐN TẦNG, BIÊN, VÀ MÃ 8 ═══════════════════════════════════
muc "⑤ TỈ LỆ HOÀN: tầng đúng biên · 45% RA TẦNG RIÊNG · mã 8 KHÔNG tính hoàn"
KQ5="$(nodex '
const { chamTiLeHoanMotTeam, chamTang } = await import("./src/orders/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["auus"])).rows[0].id;
  const kh = async (sdt) => (await pool.query(
    "INSERT INTO khach (team_id, so_dien_thoai, ten) VALUES ($1,$2,$3) RETURNING id",[t,sdt,"K"])).rows[0].id;
  const don = async (khachId, ds) => { for (const ma of ds) await pool.query(
    `INSERT INTO don_hang (team_id, ma_pos, nguon, trang_thai_he, trang_thai_pos, khach_id)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [t, "9999:"+Math.floor(Math.random()*1e9), "trang_ban_hang", "moi_tu_pos", String(ma), khachId]); };
  const a = await kh("0500000101"); await don(a, [3,3,16,16]);                       // 0%
  const b = await kh("0500000102"); await don(b, [5,3,16,3]);                        // 25%
  const c = await kh("0500000103"); await don(c, [...Array(9).fill(6), ...Array(11).fill(3)]); // 45%
  const d = await kh("0500000104"); await don(d, [4,5,7,16]);                        // 75%
  const e = await kh("0500000105"); await don(e, [8,8,3,3]);                         // mã 8
  const f = await kh("0500000106"); await don(f, [5]);                               // 1/1 → dưới sàn
  await chamTiLeHoanMotTeam(pool, { teamId: t });
  const r = async (id) => (await pool.query("SELECT ti_le_hoan, tang_hoan, so_don_ket, so_don_hoan FROM khach WHERE id=$1",[id])).rows[0];
  const ds = [];
  for (const [ten,id] of [["0%",a],["25%",b],["45%",c],["75%",d],["ma8",e],["1don",f]]) {
    const x = await r(id);
    ds.push(`${ten}:${Number(x.ti_le_hoan)}%=${x.tang_hoan}(${x.so_don_hoan}/${x.so_don_ket})`);
  }
  // PHÉP ĐẾM CÓ/KHÔNG MÃ 8 trên CÙNG một khách — hai con số PHẢI lệch nhau.
  const v8 = (await pool.query(
    `SELECT count(*) FILTER (WHERE trang_thai_pos::int = ANY($1::int[])) AS hoan,
            count(*) FILTER (WHERE trang_thai_pos::int = ANY($2::int[])) AS ket
       FROM don_hang WHERE khach_id = $3`,
    [[4,5,6,7,8],[3,16,4,5,6,7,8],e])).rows[0];
  const dung = await r(e);
  ds.push(`ma8-neu-tinh-8=${v8.hoan}/${v8.ket}→${chamTang(Number(v8.hoan)/Number(v8.ket)*100, Number(v8.ket))}`);
  ds.push(`ma8-luat-dung=${dung.so_don_hoan}/${dung.so_don_ket}→${dung.tang_hoan}`);
  console.log(ds.join(" "));
});
')"
so "sáu hồ sơ + phép đếm có/không mã 8" "${KQ5}"
bang "biên tầng + 45% ra tầng RIÊNG + mã 8 không tính hoàn" "${KQ5}" \
     "0%:0%=tot(0/4) 25%:25%=binh_thuong(1/4) 45%:45%=canh_bao(9/20) 75%:75%=rui_ro_cao(3/4) ma8:0%=tot(0/2) 1don:100%=chua_du_don(1/1) ma8-neu-tinh-8=2/4→canh_bao ma8-luat-dung=0/2→tot"

# ═══ ⑥ JOB ĐÊM LŨY ĐẲNG + KHÔNG ĐỤNG ĐƠN ══════════════════════════════════════
muc "⑥ JOB ĐÊM: chạy 2 lượt số KHÔNG đổi · KHÔNG UPDATE đơn · KHÔNG đẻ việc sale"
KQ6="$(nodex '
const { chamTiLeHoan } = await import("./src/orders/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const anh = async () => (await pool.query(
    `SELECT count(*)::int n, coalesce(max(sua_luc),$$epoch$$)::text m,
            md5(string_agg(id||$$:$$||trang_thai_he||$$:$$||coalesce(trang_thai_pos,$$-$$), $$,$$ ORDER BY id)) k
       FROM don_hang`)).rows[0];
  const viec = async () => (await pool.query("SELECT count(*)::int n FROM viec_can_xu_ly")).rows[0].n;
  const a0 = await anh(), v0 = await viec();
  const l1 = await chamTiLeHoan(pool, {});
  const t1 = (await pool.query("SELECT md5(string_agg(id||$$:$$||coalesce(ti_le_hoan::text,$$-$$)||$$:$$||coalesce(tang_hoan,$$-$$)||$$:$$||so_don_ket||$$/$$||so_don_hoan, $$,$$ ORDER BY id)) k FROM khach")).rows[0].k;
  const l2 = await chamTiLeHoan(pool, {});
  const t2 = (await pool.query("SELECT md5(string_agg(id||$$:$$||coalesce(ti_le_hoan::text,$$-$$)||$$:$$||coalesce(tang_hoan,$$-$$)||$$:$$||so_don_ket||$$/$$||so_don_hoan, $$,$$ ORDER BY id)) k FROM khach")).rows[0].k;
  const a1 = await anh(), v1 = await viec();
  // ⚠️ THƯỚC đo BẤT BIẾN (trước == sau), KHÔNG đo một con số đếm: số đơn trong sandbox
  //    phụ thuộc các phép ① ④ ⑤ chạy trước, nên neo cứng «15 đơn» là một hằng số ăn
  //    may — nó đỏ ngay lần đầu ai thêm một ca vào phép khác. Số THẬT vẫn được in ra
  //    ở dòng `so` bên dưới để đọc được, chỉ không đem đi so.
  const key = `luot1CapNhat=${l1.capNhat>0} luot2CapNhat=${l2.capNhat} diemSoDoi=${t1!==t2} donSoDoi=${a0.n!==a1.n} donDoi=${a0.k!==a1.k||a0.m!==a1.m} viecDoi=${v1-v0} teamHong=${l1.teamHong.length+l2.teamHong.length}`;
  console.log(`${key}::đơn ${a0.n}→${a1.n} · việc ${v0}→${v1} · khách chấm ${l1.khach}`);
});
')"
KQ6_KEY="${KQ6%%::*}"
so "số thật của lượt đo (không đem đi so — xem chú thích)" "${KQ6##*::}"
bang "lũy đẳng + không đụng đơn/việc" "${KQ6_KEY}" \
     "luot1CapNhat=true luot2CapNhat=0 diemSoDoi=false donSoDoi=false donDoi=false viecDoi=0 teamHong=0"

# ═══ ⑦ MIGRATION 005 — LŨY ĐẲNG · DOWN→UP · KHÔNG GÃY THƯỚC l0-m1 ═════════════
muc "⑦ MIGRATION 005: chạy lại · down→up · KHÔNG thêm bảng (thước l0-m1 giữ 21)"
SO_BANG_TAO="$(grep -c '^CREATE TABLE' db/migrate/005_*.up.sql | tr -d ' ')"
bang "số CREATE TABLE trong 005 (thêm bảng là phải vá NEO l0-m1)" "${SO_BANG_TAO}" "0"
KQ7="$(nodex '
const fs = await import("node:fs");
const { voiPool } = await import("./db/ket-noi.js");
const { xuong, len, daAp } = await import("./db/migrate.js");
await voiPool(async (pool) => {
  const demCot = async () => (await pool.query(
    `SELECT count(*)::int n FROM information_schema.columns
      WHERE (table_name=$$khach$$ AND column_name IN ($$tang_hoan$$,$$so_don_ket$$,$$so_don_hoan$$,$$cham_hoan_luc$$))
         OR (table_name=$$don_hang$$ AND column_name=$$san_pham_ma$$)`)).rows[0].n;
  const demBang = async () => (await pool.query(
    `SELECT count(*)::int n FROM information_schema.tables
      WHERE table_schema=$$public$$ AND table_type=$$BASE TABLE$$ AND table_name <> $$_migrations$$`)).rows[0].n;
  const bang0 = await demBang();
  // (a) CHẠY LẠI nguyên văn tệp .up trên CSDL đã áp — phải KHÔNG ném (IF NOT EXISTS
  //     + DO block kiểm pg_constraint). Đây mới là phép «lũy đẳng» thật của bản vá.
  const tep = fs.readdirSync("db/migrate").find(f => f.startsWith("005_") && f.endsWith(".up.sql"));
  let chayLai = "OK";
  try { await pool.query(fs.readFileSync("db/migrate/"+tep, "utf8")); } catch (e) { chayLai = "NEM:"+e.message.slice(0,60); }
  const cot1 = await demCot();
  // (b) `xuong()` gỡ bản MỚI NHẤT — từ VA-Q12 (006_lich_su_trang_thai) bản mới nhất
  //     KHÔNG còn là 005. Lùi từng bản tới khi 005 là bản chót rồi mới down ĐÚNG nó
  //     (khuôn ops/bin/nghiem-thu/l1-m1.sh dòng ~112 đã vá 23/08, xem PHIẾU VA-T1 #3).
  let xong = await daAp(pool);
  let vongLui = 0;
  while (xong[xong.length - 1] !== "005_loc_trung_va_ti_le_hoan" && vongLui < 10) {
    await xuong(pool, { im: true });
    xong = await daAp(pool);
    vongLui++;
  }
  const chotTruocDown = xong[xong.length - 1];
  await xuong(pool, { im: true }); // gỡ ĐÚNG 005 (giờ nó mới là bản chót)
  const cot2 = await demCot();
  // (c) up lại — len() áp lại MỌI bản còn thiếu (005 + mọi bản sau nó, vd 006), số
  //     bảng không đổi vì cả 005 lẫn 006 đều CHỈ alter cột, không tạo/xoá bảng.
  await len(pool, { im: true });
  const cot3 = await demCot();
  const bang1 = await demBang();
  console.log(`${chotTruocDown}|chayLai=${chayLai} cotSauChayLai=${cot1} cotSauDown=${cot2} cotSauUp=${cot3} bangTruoc=${bang0} bangSau=${bang1}`);
});
')"
so "⑦ bản chót TRƯỚC khi down 005 (phải LÙI về đúng 005 trước, không phải 006)" \
   "$(echo "${KQ7}" | cut -d'|' -f1)"
bang "⑦ bản chót trước down = 005 chính nó" "$(echo "${KQ7}" | cut -d'|' -f1)" "005_loc_trung_va_ti_le_hoan"
bang "005 chạy lại được · down→up tròn · số bảng không đổi" "$(echo "${KQ7}" | cut -d'|' -f2-)" \
     "chayLai=OK cotSauChayLai=5 cotSauDown=0 cotSauUp=5 bangTruoc=21 bangSau=21"

# ═══ ⑧ BỘ CA L3-M2 + HỒI QUY L3-M1 ════════════════════════════════════════════
muc "⑧ node --test: bộ ca L3-M2 xanh + hồi quy L3-M1 KHÔNG gãy"
dem_ca() {
  local ra
  ra="$(node --test "$@" 2>&1 | grep -E '^# (pass|fail) ' | awk '{print $2"="$3}' | paste -sd' ' -)"
  if [ -z "${ra}" ]; then
    ra="$(node --test "$@" 2>&1 | grep -E '^ℹ (pass|fail) ' | awk '{print $2"="$3}' | paste -sd' ' -)"
  fi
  printf '%s' "${ra:-LOI-NODE}"
}
# ⚠️ Bộ ca tự dựng CSDL sandbox RIÊNG của chúng — chúng KHÔNG đọc DATABASE_URL_V3 đang
#    trỏ sandbox của cổng này (chỉ mượn host/cổng), nên không đụng nhau.
CA_M2="$(dem_ca test/l3-m2-loc-trung.test.js test/l3-m2-ti-le-hoan.test.js)"
bang "bộ ca L3-M2 (21 lọc trùng + 17 tỉ lệ hoàn)" "${CA_M2}" "pass=38 fail=0"
CA_M1="$(dem_ca test/l3-m1-may-trang-thai.test.js test/l3-m1-quet-don.test.js)"
bang "hồi quy L3-M1 (28 ca) — máy trạng thái không gãy" "${CA_M1}" "pass=28 fail=0"

# ═══ HOÃN — nói thẳng cái CHƯA đo được ở lượt này ═════════════════════════════
muc "HOÃN (cố ý — không giả xanh)"
hoan "phân tầng trên 144 khách THẬT (⑤ phiếu): CSDL dev có 0 dòng \`khach\` và 0/26 đơn
        có \`khach_id\` — cửa POS chưa tạo hồ sơ khách. Đo được khi cutover có dữ liệu đầy."
hoan "vế «cùng sản phẩm» trên đơn THẬT: \`don_hang.san_pham_ma\` (005) chưa có người ghi
        — chủ cột là cửa POS \`src/pos/doc-don.js\` (L1-M1), đã ghi §9. POS THẬT có sẵn dữ
        liệu (\`items[].variation_id\` trên 4.935/5.144 đơn đo 23/08), chỉ thiếu lượt ghi."

# ═══ TỔNG KẾT ═════════════════════════════════════════════════════════════════
printf '\n──────────────────────────────────────────────────────────────\n'
printf 'L3-M2 · PHÉP: %s · ĐẠT: %s · TRƯỢT: %s · HOÃN: %s\n' \
  "${PHEP}" "$((PHEP - LOI))" "${LOI}" "${HOAN}"
if [ "${LOI}" -eq 0 ]; then
  printf '✔ CỔNG L3-M2 XANH (hoãn %s mục — KHÔNG tính là đạt)\n' "${HOAN}"
  exit 0
fi
printf '✘ CỔNG L3-M2 ĐỎ — %s phép trượt\n' "${LOI}"
exit 1
