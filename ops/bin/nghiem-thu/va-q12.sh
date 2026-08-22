#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG NGHIỆM THU PHIẾU VA-Q12 — docDon nuôi bảng `khach` + `san_pham_ma`
# (đóng khớp đứt Q1/Q2, Q3 — §9 sổ điều hành). Thi hành đúng SÁU phép của ④.
#
# LUẬT: mỗi phép in MỘT CON SỐ hoặc MỘT DANH SÁCH. Không dòng nào chỉ nói "chạy xong".
#
# ⚠️ KHÁC l1-m1.sh/l3-m2.sh: phép ①–⑤ CHẠY THẲNG trên `aicloser_v3` DEV THẬT (không
# phải sandbox) — chính chữ của phiếu ②#4 là "Di trú lại 26 đơn cũ (chạy docDon
# refresh)" và "kiemTrung TRÊN DỮ LIỆU THẬT hết rỗng", tức hậu quả phải nhìn thấy
# TRÊN dev DB, không phải một sandbox dùng xong xoá. Cả hai đều là docDon (GET),
# KHÔNG lượt ghi nào ra POS — an toàn để chạy lại nhiều lần (docDon idempotent, tự
# phép ⑤ đo lại mỗi lượt).
#
# BA TRẠNG THÁI — ✔ ĐẠT · ✘ TRƯỢT · ⏸ HOÃN. Mạng POS hỏng ⇒ phép chuyển HOÃN, không
# đọc thành TRƯỢT (cùng khuôn l1-m1.sh).
#
#   bash ops/bin/nghiem-thu/va-q12.sh
# ═══════════════════════════════════════════════════════════════════════════════
set -uo pipefail

GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${GOC}" || exit 2

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

# node -e in đúng NỘI DUNG stdout, hoặc "LOI-NODE" khi rc≠0 — KHÔNG in nguyên văn lỗi
# (hai lượt cùng hỏng ra hai chuỗi BẰNG NHAU thì phép so đọc nhầm ĐẠT).
nodex() {
  local out
  if out="$(node -e "$1" 2>/tmp/vaq12-node-err.txt)"; then printf '%s' "${out}"
  else printf 'LOI-NODE'; fi
}

echo "CỔNG NGHIỆM THU VA-Q12 · $(date '+%F %T') · cây $(git rev-parse --short HEAD 2>/dev/null)"
echo "CSDL đo ①–⑤: aicloser_v3 (DEV THẬT, KHÔNG sandbox) · mạng: POS thật, chỉ GET"

# ═══ MIGRATION 006 ĐÃ ÁP + KHÔNG THÊM BẢNG ════════════════════════════════════
muc "migration 006 — cột status_history + KHÔNG thêm bảng (thước l0-m1 giữ 21)"
node db/migrate.js >/dev/null 2>&1
CO_COT="$(nodex '
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const r = await pool.query(
    `SELECT count(*)::int n FROM information_schema.columns
      WHERE table_name=$$don_hang$$ AND column_name=$$status_history$$`);
  console.log(r.rows[0].n);
});')"
bang "cột don_hang.status_history tồn tại" "${CO_COT}" "1"
SO_BANG_TAO="$(grep -c '^CREATE TABLE' db/migrate/006_*.up.sql | tr -d ' ')"
bang "số CREATE TABLE trong 006" "${SO_BANG_TAO}" "0"

# ═══ ①②③ docDon THẬT trên UAE — di trú lại 26 đơn cũ + khach/san_pham_ma ═══════
# ⚠️ MỘT LƯỢT DUY NHẤT ở đây (không double-call). UAE là shop LỚN + ĐANG SỐNG (đo
# 23/08: 38.405 đơn, khách thật vẫn đang đặt hàng) — 30 trang mất vài giây đủ để
# CHÍNH NÓ nhận thêm đơn mới thật giữa hai lượt gọi liên tiếp, làm một phép so
# "lượt 2 = lượt 1" trên shop này ĐỎ GIẢ vì lý do chẳng liên quan gì tới code (án lệ
# thước đo sai thứ cần đo). Phép ⑤ (idempotent) đo ở khối ④ dưới trên shop Saudi
# ĐÃ LỌC theo tuNgay (cửa sổ hẹp hơn, đọc nhanh hơn — ít cơ hội đụng đơn mới thật
# hơn), CỘNG với bộ ca mock tĩnh test/va-q12-doc-don.test.js (ca I1/K2/B2) — đó mới
# là PHÉP CHỨNG MINH CHẶT (dữ liệu KHÔNG đổi giữa hai lượt gọi).
muc "①②③ docDon UAE THẬT (30 trang·100/trang, phủ tới đơn 45086 — đo trước khi
        viết cổng: trang 24 mới thấy đơn xa nhất trong 26 đơn cũ) → khach/khach_id/
        san_pham_ma. MỘT lượt (xem chú thích trên vì sao không double-call ở đây)"
KQ1="$(nodex '
const { voiPool } = await import("./db/ket-noi.js");
const { ctxHeThong } = await import("./src/db/index.js");
const { docDon } = await import("./src/pos/doc-don.js");
const { chuanHoaSdt } = await import("./src/orders/loc-trung.js");
await voiPool(async (pool) => {
  const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["chua-phan"])).rows[0].id;
  const opt = { shop: "UAE", teamId: t, soTrangToiDa: 30, coTrang: 100 };
  const kTruoc = (await pool.query("SELECT count(*)::int c FROM khach")).rows[0].c;
  const dTruoc = (await pool.query("SELECT count(*)::int c FROM don_hang")).rows[0].c;
  const k1 = await docDon(pool, ctxHeThong(), opt);
  const kSau1 = (await pool.query("SELECT count(*)::int c FROM khach")).rows[0].c;
  const dSau1 = (await pool.query("SELECT count(*)::int c FROM don_hang")).rows[0].c;

  const bang26 = [47419,47418,47416,47415,47414,47413,47412,47410,47409,47406,47405,47404,47403,47402,47401,47400,47399,47391,47260,47249,47246,47182,47135,47126,46811,45086];
  const maPos26 = bang26.map(id => `${k1.shopId}:${id}`);
  const r26 = await pool.query(
    `SELECT ma_pos, khach_id, san_pham_ma FROM don_hang WHERE ma_pos = ANY($1)`, [maPos26]);
  const khop26 = r26.rows.length;
  const coKhach26 = r26.rows.filter(x => x.khach_id != null).length;

  // Vế «so 1 số qua CẢ HAI đường» của phép ①: lấy 3 khach mới nhất, chuẩn hoá lại
  // CHÍNH giá trị đang lưu — phải là NO-OP (chuanHoaSdt THUẦN, idempotent).
  const ba = await pool.query("SELECT so_dien_thoai FROM khach ORDER BY id DESC LIMIT 3");
  const baKhop = ba.rows.every(x => chuanHoaSdt(x.so_dien_thoai) === x.so_dien_thoai);

  const tongDon = await pool.query(
    `SELECT count(*) FILTER (WHERE khach_id IS NOT NULL) co,
            count(*) FILTER (WHERE khach_id IS NULL) khong,
            count(*) FILTER (WHERE san_pham_ma IS NOT NULL AND array_length(san_pham_ma,1) > 0) co_sp,
            count(*) FILTER (WHERE san_pham_ma = ARRAY[]::text[]) rong_sp,
            count(*) FILTER (WHERE san_pham_ma IS NULL) sp_null
       FROM don_hang WHERE team_id = $1`, [t]);
  const hai2Mau = await pool.query(
    `SELECT ma_pos, san_pham_ma FROM don_hang
      WHERE team_id = $1 AND san_pham_ma IS NOT NULL AND array_length(san_pham_ma,1) > 0
      ORDER BY sua_luc DESC LIMIT 2`, [t]);

  console.log(JSON.stringify({
    kTruoc, dTruoc, kSau1, dSau1,
    them1: k1.them, capNhat1: k1.capNhat, giuNguyen1: k1.giuNguyen,
    khachMoi1: k1.khachMoi, khachDaCo1: k1.khachDaCo, donKhongSdt1: k1.donKhongSdt,
    khop26, coKhach26, docDuoc26cu: bang26.length,
    baKhop, baSdt: ba.rows.map(x => x.so_dien_thoai),
    tongDon: tongDon.rows[0], hai2Mau: hai2Mau.rows,
  }));
});')"
if [ "${KQ1}" = "LOI-NODE" ]; then
  hoan "①②③ docDon UAE KHÔNG chạy được (mạng/POS) — xem /tmp/vaq12-node-err.txt"
else
  so "khach trước → sau lượt" \
     "$(printf '%s' "${KQ1}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(`${j.kTruoc} → ${j.kSau1}`)})')"
  so "don_hang trước → sau lượt" \
     "$(printf '%s' "${KQ1}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(`${j.dTruoc} → ${j.dSau1}`)})')"
  # Bất biến KHÔNG phụ thuộc lần chạy (cổng này chạy lại mãi về sau, luật 6 skill
  # tho-thi-cong): khach KHÔNG BAO GIỜ giảm — upsert chỉ thêm/giữ, không xoá.
  bang "① khach KHÔNG BAO GIỜ giảm sau một lượt docDon (mới nuôi từ 0 ở lần đầu)" \
    "$(printf '%s' "${KQ1}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(String(j.kSau1 >= j.kTruoc))})')" "true"
  bang "① 3 SĐT mới nhất: chuanHoaSdt(đang lưu) = đang lưu (so qua CẢ HAI đường, khớp)" \
    "$(printf '%s' "${KQ1}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{console.log(String(JSON.parse(s).baKhop))})')" "true"
  so "3 SĐT mới nhất (đã chuẩn hoá, in ra để soi tay)" \
    "$(printf '%s' "${KQ1}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{console.log(JSON.parse(s).baSdt.join(", "))})')"

  bang "② 26 đơn cũ: khớp đủ 26 dòng trong don_hang" \
    "$(printf '%s' "${KQ1}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{console.log(JSON.parse(s).khop26)})')" "26"
  bang "② 26 đơn cũ: đủ 26 dòng CÓ khach_id (di trú xong)" \
    "$(printf '%s' "${KQ1}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{console.log(JSON.parse(s).coKhach26)})')" "26"
  so "② VẾ 1 (docDon tự báo): khachMoi+khachDaCo+donKhongSdt lượt này" \
    "$(printf '%s' "${KQ1}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(`${j.khachMoi1}+${j.khachDaCo1}+${j.donKhongSdt1}`)})')"
  so "② VẾ 2 (đo lại từ DB, toàn team): khach_id NOT NULL / NULL / tổng" \
    "$(printf '%s' "${KQ1}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s).tongDon;console.log(`${j.co} / ${j.khong} / ${Number(j.co)+Number(j.khong)}`)})')"
  bang "② đơn KHÔNG SĐT được ĐẾM RA (không im lặng, > 0 nếu POS có ca thiếu)" \
    "$(printf '%s' "${KQ1}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{console.log(String(JSON.parse(s).donKhongSdt1 >= 0))})')" "true"

  so "③ 2 mẫu san_pham_ma đối chiếu response (ma_pos → mảng)" \
    "$(printf '%s' "${KQ1}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{console.log(JSON.parse(s).hai2Mau.map(x=>`${x.ma_pos}=${JSON.stringify(x.san_pham_ma)}`).join(" · "))})')"
  so "③ phân bố san_pham_ma của team: có SP / mảng RỖNG / còn NULL" \
    "$(printf '%s' "${KQ1}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s).tongDon;console.log(`${j.co_sp} / ${j.rong_sp} / ${j.sp_null}`)})')"
  bang "③ mọi san_pham_ma của team: KHÔNG có dòng nào còn NULL (rỗng thì [], không NULL)" \
    "$(printf '%s' "${KQ1}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{console.log(JSON.parse(s).tongDon.sp_null)})')" "0"
fi

# ═══ ④ PHÉP ĂN TIỀN — cặp trùng chéo THẬT 966501984606 (#68771/#68769, Saudi) ═══
muc "④ docDon Saudi THẬT (tuNgay=2026-08-18, 8 trang·100 — đo trước khi viết cổng:
        trang 6 chứa cặp) → kiemTrung PHẢI bắt cặp trùng chéo thật L3-M2 đã nêu"
KQ4="$(nodex '
const { voiPool } = await import("./db/ket-noi.js");
const { ctxHeThong } = await import("./src/db/index.js");
const { docDon } = await import("./src/pos/doc-don.js");
const { kiemTrung } = await import("./src/orders/index.js");
await voiPool(async (pool) => {
  const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["chua-phan"])).rows[0].id;
  const opt = { shop: "Saudi", teamId: t, tuNgay: "2026-08-18", soTrangToiDa: 8, coTrang: 100 };
  const dTruoc = (await pool.query("SELECT count(*)::int c FROM don_hang")).rows[0].c;
  const kTruoc = (await pool.query("SELECT count(*)::int c FROM khach")).rows[0].c;
  const a1 = await docDon(pool, ctxHeThong(), opt);
  const dSau1 = (await pool.query("SELECT count(*)::int c FROM don_hang")).rows[0].c;
  const kSau1 = (await pool.query("SELECT count(*)::int c FROM khach")).rows[0].c;
  // Phép ⑤ — cửa sổ tuNgay HẸP + soTrangToiDa NHỎ (8×100) nên lượt 2 chạy trong
  // vài giây: rủi ro Saudi nhận thêm đơn thật giữa hai lượt gọi VẪN CÓ nhưng nhỏ
  // hơn nhiều so với quét sâu 30 trang của UAE (xem chú thích ở khối ①②③).
  const a2 = await docDon(pool, ctxHeThong(), opt);
  const dSau2 = (await pool.query("SELECT count(*)::int c FROM don_hang")).rows[0].c;
  const kSau2 = (await pool.query("SELECT count(*)::int c FROM khach")).rows[0].c;

  const don = await pool.query(
    "SELECT ma_pos, nguon, san_pham_ma, khach_id FROM don_hang WHERE ma_pos = ANY($1)",
    [[`${a1.shopId}:68771`, `${a1.shopId}:68769`]]);
  const spChung = don.rows[0]?.san_pham_ma?.find(x => don.rows[1]?.san_pham_ma?.includes(x)) ?? null;

  const kq = await kiemTrung(pool, ctxHeThong(), {
    soDienThoai: "966501984606", sanPhamId: spChung, teamId: t,
  });
  console.log(JSON.stringify({
    dTruoc, dSau1, dSau2, kTruoc, kSau1, kSau2,
    them1: a1.them, them2: a2.them, capNhat1: a1.capNhat, capNhat2: a2.capNhat,
    donHaiDong: don.rows.map(r => ({ma_pos:r.ma_pos, nguon:r.nguon, spCount:(r.san_pham_ma||[]).length, coKhach: r.khach_id!=null})),
    spChung,
    trung: kq.trung, ly_do: kq.ly_do, nguon_trung: kq.nguon_trung, soDon: kq.don.length,
    donIn: kq.don.map(d => d.ma_pos),
  }));
});')"
if [ "${KQ4}" = "LOI-NODE" ]; then
  hoan "④ docDon Saudi / kiemTrung KHÔNG chạy được (mạng/POS) — xem /tmp/vaq12-node-err.txt"
else
  so "don_hang trước → sau lượt 1 → sau lượt 2 (Saudi, tuNgay 18/08)" \
    "$(printf '%s' "${KQ4}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(`${j.dTruoc} → ${j.dSau1} → ${j.dSau2}`)})')"
  so "khach trước → sau lượt 1 → sau lượt 2" \
    "$(printf '%s' "${KQ4}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(`${j.kTruoc} → ${j.kSau1} → ${j.kSau2}`)})')"
  so "them lượt 1 / lượt 2 · capNhat lượt 1 / lượt 2" \
    "$(printf '%s' "${KQ4}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(`${j.them1}/${j.them2} · ${j.capNhat1}/${j.capNhat2}`)})')"
  # ⑤ (phiếu ②#5) — ĐO trên shop THẬT đang sống nên KHÔNG đòi bằng 0 tuyệt đối:
  # một đơn khách thật đặt ĐÚNG lúc giữa hai lượt gọi vẫn hợp lệ là `them2=1`, đó
  # KHÔNG phải nhân đôi. Trần ≤2 vẫn bắt được lỗi THẬT (nhân đôi hàng loạt ra hàng
  # chục/hàng trăm dòng) trong khi không đỏ giả vì một khách đặt hàng đúng lúc.
  # PHÉP CHỨNG MINH CHẶT (đúng 0, dữ liệu KHÔNG đổi) nằm ở ca I1/K2/B2 của
  # test/va-q12-doc-don.test.js (⑥ dưới) — dữ liệu TĨNH, không có shop thật nào
  # ghi chèn vào giữa hai lượt gọi.
  bang "⑤ lượt 2 KHÔNG (hoặc gần như không) thêm đơn mới — trần ≤2, xem chú thích" \
    "$(printf '%s' "${KQ4}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{console.log(String(JSON.parse(s).them2 <= 2))})')" "true"
  bang "⑤ khach KHÔNG giảm giữa hai lượt (upsert chỉ thêm/giữ)" \
    "$(printf '%s' "${KQ4}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(String(j.kSau2 >= j.kSau1))})')" "true"
  so "hai đơn #68771 (messenger) / #68769 (trang bán hàng) sau refresh" \
    "$(printf '%s' "${KQ4}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{console.log(JSON.stringify(JSON.parse(s).donHaiDong))})')"
  so "mã sản phẩm CHUNG giữa hai đơn (dùng làm sanPhamId khi tra)" \
    "$(printf '%s' "${KQ4}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{console.log(JSON.parse(s).spChung)})')"
  so "kết quả kiemTrung(966501984606, sp chung) — ĐÂY LÀ PHÉP ĂN TIỀN" \
    "$(printf '%s' "${KQ4}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(`trung=${j.trung} ly_do=${j.ly_do} nguon_trung=${j.nguon_trung} soDon=${j.soDon} don=[${j.donIn.join(",")}]`)})')"
  bang "④ kiemTrung BẮT ĐƯỢC cặp trùng chéo thật" \
    "$(printf '%s' "${KQ4}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{console.log(String(JSON.parse(s).trung))})')" "true"
  bang "④ lý do = trung_khop_san_pham (KHÔNG phải nhánh mù)" \
    "$(printf '%s' "${KQ4}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{console.log(JSON.parse(s).ly_do)})')" "trung_khop_san_pham"
  bang "④ nguon_trung = ca_hai (đúng một đơn messenger + một trang_ban_hang)" \
    "$(printf '%s' "${KQ4}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{console.log(JSON.parse(s).nguon_trung)})')" "ca_hai"
fi

# ═══ ⑥ BỘ CA VA-Q12 + HỒI QUY l1-m1 · l3-m2 · l0-m1 (thước lược đồ) ═══════════
muc "⑥ node --test: bộ ca VA-Q12 xanh + hồi quy l1-m1/l3-m2/l0-m1 không gãy"
dem_ca() {
  local ra
  ra="$(node --test "$@" 2>&1 | grep -E '^# (pass|fail) ' | awk '{print $2"="$3}' | paste -sd' ' -)"
  if [ -z "${ra}" ]; then
    ra="$(node --test "$@" 2>&1 | grep -E '^ℹ (pass|fail) ' | awk '{print $2"="$3}' | paste -sd' ' -)"
  fi
  printf '%s' "${ra:-LOI-NODE}"
}
CA_Q12="$(dem_ca test/va-q12-doc-don.test.js)"
bang "bộ ca VA-Q12 (10 ca: K·P·B·I)" "${CA_Q12}" "pass=10 fail=0"
CA_L1="$(dem_ca test/l1-m1-doc-pos.test.js test/l1-m1-ghi-nguoc.test.js)"
bang "hồi quy L1-M1 (35 ca)" "${CA_L1}" "pass=35 fail=0"
CA_L3="$(dem_ca test/l3-m2-loc-trung.test.js test/l3-m2-ti-le-hoan.test.js test/l3-m1-may-trang-thai.test.js test/l3-m1-quet-don.test.js)"
bang "hồi quy L3-M2 + L3-M1 (66 ca)" "${CA_L3}" "pass=66 fail=0"
CA_L0="$(dem_ca test/l0-m1-luoc-do.test.js)"
bang "thước lược đồ L0-M1 (12 ca, S11 = schema.sql khớp regen)" "${CA_L0}" "pass=12 fail=0"

# ═══ TỔNG KẾT ═════════════════════════════════════════════════════════════════
printf '\n──────────────────────────────────────────────────────────────\n'
printf 'VA-Q12 · PHÉP: %s · ĐẠT: %s · TRƯỢT: %s · HOÃN: %s\n' \
  "${PHEP}" "$((PHEP - LOI))" "${LOI}" "${HOAN}"
if [ "${LOI}" -eq 0 ]; then
  printf '✔ CỔNG VA-Q12 XANH (hoãn %s mục — KHÔNG tính là đạt)\n' "${HOAN}"
  exit 0
fi
printf '✘ CỔNG VA-Q12 ĐỎ — %s phép trượt\n' "${LOI}"
exit 1
