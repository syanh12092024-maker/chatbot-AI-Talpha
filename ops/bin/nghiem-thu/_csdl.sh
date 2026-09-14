# ═══════════════════════════════════════════════════════════════════════════════
# ĐƯỜNG TỚI POSTGRES cho cổng nghiệm thu — KHÔNG phải cổng, đừng chạy thẳng.
# Tệp này được `source`; vòng chạy cổng bỏ qua mọi tệp bắt đầu bằng `_`.
#
# VÌ SAO CÓ NÓ. Mười cổng (l1-m1·l1-m2·l1-m3·l2-m1·l2-m2·l2-m3·l3-m1..l3-m4) dựng sandbox
# bằng `docker exec talpha-pg`. Container ấy KHÔNG CÒN Ở ĐÂU: máy dev không có docker, VPS
# chạy Postgres cài thẳng, CI dùng service container của GitHub. Đo 14/09/2026 (lượt
# 34800176998): cả mười cổng trả rc=2 «không đo được» — tức mọi lượt «chạy lại cổng» từ
# lúc nào đó đến nay đều KHÔNG ĐO GÌ.
#
# Đây đúng ca mà `l0-m1.sh`/`l0-m2.sh` đã gỡ hôm 25/08 (G2-A1/G2-A2, án lệ #28): dựng và
# dọn bằng chính gói `pg` của repo, không phụ thuộc CSDL được cài kiểu gì hay chạy ở đâu —
# có `DATABASE_URL_V3` là chạy. Tệp này gom cách làm đó lại một chỗ cho mười cổng còn lại,
# thay vì chép mười lần.
#
# HAI LUẬT, đừng nới:
#   ① KHÔNG ĐO ĐƯỢC vẫn là rc=2, KHÔNG BAO GIỜ rc=0. Gỡ nút để đo được nhiều hơn — không
#      phải để lặng lẽ đi qua khi không tới được CSDL.
#   ② KHÔNG in chuỗi nối ra màn hình: trong đó có mật khẩu. Chỉ in host + tên CSDL.
#
# Bày ra: `csdl_san_sang <ten_db>` · `pg_qt <SQL>` (CSDL quản trị) · `pg_sb <SQL>` (sandbox)
# ═══════════════════════════════════════════════════════════════════════════════

CSDL_GOC=""     # chuỗi nối gốc, đọc từ DATABASE_URL_V3/.env
CSDL_TEN_SB=""  # tên CSDL sandbox

# Chạy SQL qua gói `pg`, in kết quả THEO KHUÔN `psql -tAc`: mỗi hàng một dòng, các cột nối
# bằng `|`, không tiêu đề. Mười cổng đang đọc đầu ra theo đúng khuôn đó.
_pg_chay() { # $1 = chuỗi nối · $2 = SQL
  node -e '
const pg = (await import("pg")).default;
const p = new pg.Pool({ connectionString: process.argv[1], max: 1 });
try {
  const r = await p.query(process.argv[2]);
  for (const h of r.rows ?? []) console.log(Object.values(h).map((v) => v ?? "").join("|"));
} finally { await p.end(); }
' "$1" "$2"
}

_csdl_url() { # $1 = tên CSDL → in chuỗi nối trỏ vào CSDL đó
  node -e '
const u = new URL(process.argv[1]); u.pathname = "/" + process.argv[2]; console.log(u.toString());
' "${CSDL_GOC}" "$1" 2>/dev/null
}

_csdl_che() { # dạng AN TOÀN để in: host + tên CSDL, KHÔNG tài khoản, KHÔNG mật khẩu
  node -e '
const u = new URL(process.argv[1]); console.log(u.host + u.pathname);
' "$1" 2>/dev/null || printf '?'
}

csdl_san_sang() {
  CSDL_TEN_SB="${1:?csdl_san_sang cần tên CSDL sandbox}"
  CSDL_GOC="$(node -e '
const { chuoiNoi } = await import("./db/ket-noi.js"); console.log(chuoiNoi());
' 2>/dev/null)"
  if [ -z "${CSDL_GOC}" ]; then
    echo "✘ không đọc được DATABASE_URL_V3 (env lẫn .env) — cổng không đo được"
    return 2
  fi
  if ! _pg_chay "$(_csdl_url postgres)" 'SELECT 1' >/dev/null 2>&1; then
    echo "✘ không nối được tới $(_csdl_che "$(_csdl_url postgres)") — cổng không đo được"
    return 2
  fi
  printf '   (CSDL %s)\n' "$(_csdl_che "$(_csdl_url "${CSDL_TEN_SB}")")"
  return 0
}

# SQL trên CSDL QUẢN TRỊ (`postgres`) — dựng/xoá sandbox.
pg_qt() { _pg_chay "$(_csdl_url postgres)" "$1"; }

# SQL trên CSDL SANDBOX.
pg_sb() { _pg_chay "$(_csdl_url "${CSDL_TEN_SB}")" "$1"; }
