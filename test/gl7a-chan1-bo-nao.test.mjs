// PHIẾU GL7a ④1–5 — phép ⑤ của `ops/bin/nghiem-thu/_chan1.sh` theo luật file phẳng sau CR-02-10
// (sổ §0a luật 4, «SỬA 02/10»): tệp phẳng `src/*.js` DÙNG CHUNG (`pancake` `kb` `config`…) sửa được như code v3;
// chỉ tệp BỘ NÃO phải khai `**Đụng bộ não:** <tệp> — <lý do>` trên mặt phiếu; dòng bắt đầu bằng «không» KHÔNG tính.
//
// CÁCH ĐO: mỗi ca dựng MỘT repo git TẠM trong thư mục tạm (base → phiếu + sửa tệp → commit), chạy `_chan1.sh` THẬT
// với cwd = repo tạm (script tự `cd $(git rev-parse --show-toplevel)` ⇒ đọc phiếu/diff của repo tạm, KHÔNG chạm repo
// thật), rồi đọc ĐÚNG dòng ⑤ (không đọc tên nhãn — đảo-vá về bản cũ đổi nhãn, ca vẫn phải đọc được trạng thái).
// Mỗi ca chạy ở HAI locale (C và en_US.UTF-8): luật đọc chữ «không» có dấu, regex byte vs ký tự phải cho cùng kết quả.
//
// ĐẢO-VÁ: `GL7A_CHAN1=<đường tuyệt đối tới bản đột biến>` ⇒ bộ ca đo bản đó thay cho tệp của cây (gl7a.sh ⑥ dùng).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const CHAN1 = process.env.GL7A_CHAN1 || path.join(root, "ops/bin/nghiem-thu/_chan1.sh");
const LOCALE = ["C", "en_US.UTF-8"];
// Danh sách bộ não GIỮ NGUYÊN từ BH1 16/09 (phiếu ②1) — ca «đủ bảy tên» canh không ai rút bớt.
const NAO = ["src/prompts.js", "src/closer.js", "src/tools.js", "src/fast-lane.js", "src/outbound-guard.js", "src/context.js", "src/lead-score.js"];
const TEP_GOC = [...NAO, "src/pancake.js", "src/kb.js", "src/config.js", "src/queue/viec.js", "src/chat/a.js", "v3/src/b.js"];

function git(dir, env, ...args) {
  const r = spawnSync("git", ["-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", ...args], { cwd: dir, env, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} hỏng: ${r.stderr}`);
  return r.stdout.trim();
}

/**
 * Dựng repo tạm, chạy `_chan1.sh`, trả dòng ⑤.
 * @param {object} o
 * @param {string|null} o.khai  dòng khai đặt ở cột 0 của phiếu (null = phiếu không có dòng khai)
 * @param {string[]} o.sua      tệp sửa sau base
 * @param {[string,string][]} [o.doiTen] cặp [cũ, mới] dời tệp sau base
 * @param {string} [o.than]     chữ thêm vào thân phiếu
 * @param {string} o.locale
 */
function chay({ khai, sua = [], doiTen = [], than = "", locale }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gl7a-ca-"));
  try {
    const env = {
      PATH: process.env.PATH, HOME: dir, LC_ALL: locale, LANG: locale,
      GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_AUTHOR_NAME: "gl7a", GIT_AUTHOR_EMAIL: "gl7a@ca.invalid", GIT_COMMITTER_NAME: "gl7a", GIT_COMMITTER_EMAIL: "gl7a@ca.invalid",
    };
    git(dir, env, "init", "-q");
    for (const f of TEP_GOC) {
      fs.mkdirSync(path.join(dir, path.dirname(f)), { recursive: true });
      fs.writeFileSync(path.join(dir, f), `// ${f} — base\n`);
    }
    fs.mkdirSync(path.join(dir, "docs/thi-cong/phieu"), { recursive: true });
    fs.writeFileSync(path.join(dir, "docs/thi-cong/SO-DIEU-HANH-THI-CONG.md"), "# sổ tạm\n\n## §10\n- CA\n");
    git(dir, env, "add", "-A");
    git(dir, env, "commit", "-q", "-m", "base");
    const base = git(dir, env, "rev-parse", "--short=12", "HEAD");
    const pham = [...sua, ...doiTen.map(([, moi]) => moi)];
    const phieu = [
      "# PHIẾU CA — ca tạm GL7a", "",
      `**Base:** \`${base}\` · **Làn:** 🟩`,
      ...(khai === null ? [] : [khai]),
      "", than, "",
      "## ③ File được đụng", "", "```", ...pham, "```", "", "## ④ Nghiệm thu", "",
    ].join("\n");
    fs.writeFileSync(path.join(dir, "docs/thi-cong/phieu/PHIEU-CA.md"), phieu);
    for (const f of sua) fs.appendFileSync(path.join(dir, f), "// sửa sau base\n");
    for (const [cu, moi] of doiTen) {
      fs.mkdirSync(path.join(dir, path.dirname(moi)), { recursive: true });
      git(dir, env, "mv", cu, moi);
    }
    git(dir, env, "add", "-A");
    git(dir, env, "commit", "-q", "-m", "phiếu + sửa");
    const r = spawnSync("bash", [CHAN1, "ca"], { cwd: dir, env, encoding: "utf8", timeout: 60000 });
    const out = (r.stdout || "") + (r.stderr || "");
    const m = out.match(/^(✅|🔴) ⑤\S*\s?(.*)$/m);
    assert.ok(m, `[${locale}] không thấy dòng ⑤ trong output _chan1 (${CHAN1}):\n${out}`);
    return { trangThai: m[1], chiTiet: m[2], dong: m[0], out };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

for (const locale of LOCALE) {
  test(`GL7a ④1 [${locale}] · chạm src/pancake.js, phiếu khai «không.» ⇒ ⑤ XANH (tệp phẳng dùng chung, CR-02-10)`, () => {
    const r = chay({ khai: "**Đụng bộ não:** không.", sua: ["src/pancake.js"], locale });
    assert.equal(r.trangThai, "✅", r.dong);
    assert.doesNotMatch(r.dong, /src\/pancake\.js/, "tệp phẳng dùng chung không được nêu như vi phạm");
  });

  test(`GL7a ④1b [${locale}] · chạm src/pancake.js + src/kb.js + src/config.js, phiếu KHÔNG có dòng khai ⇒ ⑤ XANH`, () => {
    const r = chay({ khai: null, sua: ["src/pancake.js", "src/kb.js", "src/config.js"], locale });
    assert.equal(r.trangThai, "✅", r.dong);
  });

  test(`GL7a ④2 [${locale}] · chạm src/prompts.js, phiếu khai «không.» ⇒ ⑤ ĐỎ, nêu đúng tên tệp`, () => {
    const r = chay({ khai: "**Đụng bộ não:** không.", sua: ["src/prompts.js"], locale });
    assert.equal(r.trangThai, "🔴", r.dong);
    assert.match(r.chiTiet, /src\/prompts\.js/);
    assert.match(r.chiTiet, /«không»/, "câu đỏ phải nói dòng «không» không tính là khai");
  });

  test(`GL7a ④2b [${locale}] · biến thể «không» có thật trong kho phiếu (kèm ngoặc / gạch / có dấu hoa / in đậm / rỗng) ⇒ ⑤ ĐỎ`, () => {
    const bienThe = [
      "**Đụng bộ não:** không",
      "**Đụng bộ não:** Không.",
      "**Đụng bộ não:** KHÔNG.",
      "**Đụng bộ não:** khong.",
      "**Đụng bộ não:** **không**",
      "**Đụng bộ não:** không (KHÔNG sửa `src/fast-lane.js`, `src/kb.js` — mặc định ở đó là của luồng cũ).",
      "**Đụng bộ não:** không — `git status` năm file `prompts.js` `closer.js` `tools.js` = 0 dòng.",
      "**Đụng bộ não:** không. (`src/pancake.js` là file phẳng DÙNG CHUNG — sổ §0a sau CR-02-10)",
      "**Đụng bộ não:**",
      "**Đụng bộ não:**   ",
    ];
    for (const khai of bienThe) {
      const r = chay({ khai, sua: ["src/tools.js"], locale });
      assert.equal(r.trangThai, "🔴", `dòng «${khai}» bị tính là đã khai: ${r.dong}`);
      assert.match(r.chiTiet, /src\/tools\.js/);
    }
  });

  test(`GL7a ④2c [${locale}] · chạm đủ 7 tệp NAO + src/pancake.js, khai «không.» ⇒ ĐỎ nêu ĐỦ 7 tên NAO, KHÔNG nêu pancake`, () => {
    const r = chay({ khai: "**Đụng bộ não:** không.", sua: [...NAO, "src/pancake.js"], locale });
    assert.equal(r.trangThai, "🔴", r.dong);
    for (const f of NAO) assert.ok(r.chiTiet.includes(f), `thiếu ${f} trong câu đỏ: ${r.dong}`);
    assert.doesNotMatch(r.chiTiet, /src\/pancake\.js/, "câu đỏ nêu cả tệp phẳng dùng chung = cổng nói dối");
  });

  test(`GL7a ④2d [${locale}] · DỜI src/prompts.js vào thư mục con, khai «không.» ⇒ ĐỎ (dời bộ não cũng là đụng)`, () => {
    const r = chay({ khai: "**Đụng bộ não:** không.", doiTen: [["src/prompts.js", "src/chat/prompts.js"]], locale });
    assert.equal(r.trangThai, "🔴", r.dong);
    assert.match(r.chiTiet, /src\/prompts\.js/);
  });

  test(`GL7a ④3 [${locale}] · chạm src/prompts.js, phiếu khai «CÓ — src/prompts.js …» ⇒ ⑤ XANH`, () => {
    const r = chay({ khai: "**Đụng bộ não:** CÓ — src/prompts.js — đổi câu chào cho ngắn.", sua: ["src/prompts.js"], locale });
    assert.equal(r.trangThai, "✅", r.dong);
    const r2 = chay({ khai: "**Đụng bộ não:** `src/prompts.js` `src/tools.js` — điểm neo cache nằm ở đây.", sua: ["src/prompts.js", "src/tools.js", "src/pancake.js"], locale });
    assert.equal(r2.trangThai, "✅", r2.dong);
  });

  test(`GL7a ④4 [${locale}] · chạm src/prompts.js, phiếu KHÔNG có dòng khai (chỉ nhắc «Đụng bộ não» giữa câu) ⇒ ⑤ ĐỎ`, () => {
    const r = chay({
      khai: null,
      than: "Ghi chú: phiếu khác khai `**Đụng bộ não:** src/prompts.js` — câu này nằm GIỮA dòng, không phải dòng khai.",
      sua: ["src/prompts.js"], locale,
    });
    assert.equal(r.trangThai, "🔴", r.dong);
    assert.match(r.chiTiet, /src\/prompts\.js/);
  });

  test(`GL7a ④5 [${locale}] · chỉ chạm src/queue/*.js · src/chat/*.js · v3/… ⇒ ⑤ XANH (khai «không.» hay không khai đều qua)`, () => {
    const sua = ["src/queue/viec.js", "src/chat/a.js", "v3/src/b.js"];
    assert.equal(chay({ khai: null, sua, locale }).trangThai, "✅");
    assert.equal(chay({ khai: "**Đụng bộ não:** không.", sua, locale }).trangThai, "✅");
  });
}
