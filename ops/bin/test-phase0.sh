#!/bin/sh
# PostgreSQL tạm; không đọc DATABASE_URL_V3 thật, không migrate dữ liệu vận hành.
set -eu
cd "$(dirname "$0")/../.."
PG_BIN=${PG_BIN:-/Applications/Postgres.app/Contents/Versions/latest/bin}
test -x "$PG_BIN/initdb"
TEST_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/chatbot-phase0.XXXXXX")
TEST_PORT=${TEST_PORT:-55439}
cleanup() {
  "$PG_BIN/pg_ctl" -D "$TEST_ROOT/db" -m fast stop >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM
"$PG_BIN/initdb" -D "$TEST_ROOT/db" -A trust -U chatbot_audit >"$TEST_ROOT/init.log"
"$PG_BIN/pg_ctl" -D "$TEST_ROOT/db" -l "$TEST_ROOT/postgres.log" -o "-p $TEST_PORT -h 127.0.0.1 -k $TEST_ROOT" start
export DATABASE_URL_V3="postgresql://chatbot_audit@127.0.0.1:$TEST_PORT/postgres"
export PANCAKE_READONLY=1
node --import ./test/_an-toan.mjs --experimental-test-module-mocks --test --test-concurrency=4 \
  v3/test/b/page-bot.test.mjs v3/test/b/page-bot-thuoc-tinh.test.mjs \
  v3/test/b/san-sang.test.mjs v3/test/b/dieu-huong.test.mjs v3/test/b/vai-b-noi-day.test.mjs \
  v3/test/b/phan-quyen-nam-vai.test.mjs test/l1-m1-doc-pos.test.js \
  test/deploy-v3.test.mjs test/frontend-v3-e2e.test.js \
  v3/test/b/model-nha.test.mjs v3/test/b/model-goi-mot-lan.test.mjs \
  test/l4-prompt.test.mjs test/phase1-chat-flow.test.js test/l2-m2-lop-tu-khoa.test.js test/guard-fastlane.test.mjs \
  test/context.test.mjs test/phase0-chat-safety.test.js test/phase0-webhook-delivery.test.js \
  test/l2-m1-nhac-truong.test.js test/va-r2-tien-tao-don.test.js \
  test/bh1-gia-va-cua-chot.test.js test/l2-m3-rap-prompt.test.js \
  test/l3-m4-duyet.test.js test/l3-m4-hang-cho.test.js \
  test/l2-m1-hang-doi.test.js test/va-p7-chay-worker.test.js
