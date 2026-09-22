// DANH TÍNH NGƯỜI GỬI — thay phép ĐOÁN bằng thứ payload đã NÓI sẵn.
//
// VÌ SAO CÓ BỘ CA NÀY (đo 22/09/2026, page 1220547807799752, 1.146 tin page thật):
// `nhanDienSale` coi mọi tin page "trông như người gõ tay" là sale đã tiếp quản, và khoá
// AI khỏi hội thoại đó vĩnh viễn. Phép "trông như" chỉ nhìn CHỮ ⇒ **42/56 hội thoại hoạt
// động trong 24h bị khoá (75%)** — trong đó thứ bị chấm là "người thật" lại là:
//     52 tin · Botcake  "This product has never let me down! Try it now! 😉"
//     39 tin · chào tự động "Welcome to <page>. How may we assist you today?"
// Bật bot trên page này thì 3 trong 4 hội thoại bot không được nói một chữ.
//
// Hai lớp vá, đo lại bằng chính mã này: 75% → 7%, và cả 4 hội thoại còn khoá đều là sale
// thật đang gõ tay (Quỳnh Trang "What is your address?", Thu Hiền "yess dear").
//   ① danh tính người gửi — `from.app_id`/`bot_id`/`flow_id`/`is_automated`/`admin_name`
//   ② mẫu chào tự động của Facebook — vào sổ `bot-registry`, KHÔNG nhét luật riêng vào M05
import test from "node:test";
import assert from "node:assert/strict";
import { looksHuman, danhTinhNguoiGui } from "../src/conv-owner.js";
import { isAutomationTemplate } from "../src/bot-registry.js";

// `from` NGUYÊN VĂN kéo từ Pancake 22/09 — không gõ lại bằng trí nhớ (án lệ #22).
const FROM = {
  botcake: { admin_id: "1220547807799752", admin_name: "Botcake", app_id: 556376998159104, bot_id: null, flow_id: 1438043455, id: "1220547807799752", name: "Minty Fresh Smile KSA" },
  publicApi: { admin_name: "Public API", id: "1220547807799752", name: "Minty Fresh Smile KSA", uid: "0c7cf221-d058-4458-9f58-d1c82dc7c9d8" },
  aiLeader: { admin_name: "AI LEADER", id: "1220547807799752", name: "Minty Fresh Smile KSA", uid: "359f5a88-17ec-4187-837e-3921b890083c" },
  pos: { admin_id: "1220547807799752", admin_name: "POS", id: "1220547807799752", is_automated: true, name: "Minty Fresh Smile KSA" },
  app: { app_id: 556376998159104, es: false, id: "1220547807799752", name: "Minty Fresh Smile KSA" },
  sale: { admin_name: "Nguyễn Duyên", ai_generated: false, email: "1220547807799752@facebook.com", id: "1220547807799752", name: "Minty Fresh Smile KSA", uid: "e3d6411e-433d-4147-89f2-b4e8d884c262" },
  tron: { id: "1220547807799752", name: "Minty Fresh Smile KSA" },      // chào tự động đi lối này
  esTron: { es: false, id: "1220547807799752", name: "Minty Fresh Smile KSA" },
};

test("① danh tính đọc đúng bốn nguồn máy và một nguồn người", () => {
  assert.equal(danhTinhNguoiGui(FROM.botcake), "may", "có app_id + flow_id");
  assert.equal(danhTinhNguoiGui(FROM.publicApi), "may", "nhãn Public API nằm trong danh sách máy");
  assert.equal(danhTinhNguoiGui(FROM.aiLeader), "may", "nhãn AI LEADER — một bot AI khác của Pancake");
  assert.equal(danhTinhNguoiGui(FROM.pos), "may", "is_automated=true");
  assert.equal(danhTinhNguoiGui(FROM.app), "may", "chỉ app_id cũng đủ");
  assert.equal(danhTinhNguoiGui(FROM.sale), "nguoi", "nhãn nhân viên Pancake, không phải tên máy");
  assert.equal(danhTinhNguoiGui(FROM.tron), "khong_ro", "payload không kèm định danh nào");
  assert.equal(danhTinhNguoiGui(undefined), "khong_ro", "thiếu `from` phải rơi về đoán chữ, không được ném");
});

test("② tin Botcake lọt mọi ngưỡng chữ — danh tính chặn đứng", () => {
  const cau = "This product has never let me down! Try it now! 😉";
  assert.equal(looksHuman(cau, [], FROM.botcake), false, "có danh tính thì KHÔNG được coi là người");
});

test("③ 'người' vẫn phải qua phép đoán chữ — sale DÁN template không khoá được AI", () => {
  // Đo 22/09: 67 tin do sale thật gửi nhưng nội dung là mẫu marketing. Tin nhãn nhân viên
  // vô điều kiện ⇒ mỗi lần sale dán mẫu là AI tự khoá mình. Đo mức hội thoại: 70% vs 59%.
  const mau = "🌟 A WHITER SMILE – CONFIDENCE THAT SHINES EVERY DAY! 🌟 Free shipping, cash on delivery!";
  assert.equal(looksHuman(mau, [], FROM.sale), false, "sale dán mẫu marketing KHÔNG phải là tiếp quản");
  assert.equal(looksHuman("What is your address?", [], FROM.sale), true, "còn câu gõ tay thì đúng là tiếp quản");
});

test("④ chào tự động của Facebook vào SỔ MẪU, không phải luật riêng của M05", () => {
  const chao = "Welcome to Minty Fresh Smile KSA. How may we assist you today?";
  assert.equal(isAutomationTemplate(chao), true, "phải bắt được ở tầng bot-registry");
  // Payload của nó KHÔNG có định danh nào — đây chính là lý do phải thêm mẫu chứ danh
  // tính không cứu nổi: một mình mẫu này khoá 29/56 hội thoại.
  assert.equal(danhTinhNguoiGui(FROM.tron), "khong_ro");
  assert.equal(looksHuman(chao, [], FROM.tron), false);
  assert.equal(looksHuman(chao, [], FROM.esTron), false);
  // Mẫu do Facebook sinh nên giống nhau ở mọi page — chỉ khác tên ở giữa.
  assert.equal(isAutomationTemplate("Welcome to Golden Soap House. How may we assist you today?"), true);
});

test("⑤ KHÔNG đổi hành vi cũ khi thiếu `from` — mọi lời gọi hai tham số chạy y như trước", () => {
  assert.equal(looksHuman("ok dear", []), true);
  assert.equal(looksHuman("yess dear", []), true);
  assert.equal(looksHuman("🎉 SPECIAL PROMOTION – UP TO 70% OFF! Free shipping 🚚", []), false);
  assert.equal(looksHuman("", []), false);
});

test("⑥ sale THẬT vẫn khoá được AI — đây là việc của cửa này, đừng vá hỏng nó", () => {
  // Bốn câu này là 4/56 hội thoại CÒN bị khoá sau khi vá, đo 22/09. Chúng PHẢI còn khoá.
  const that = [
    ["What is your address?", FROM.sale],
    ["Please provide the specific house number.", FROM.sale],
    ["yess dear", FROM.sale],
    ["I will inform the delivery person. Please wait.", FROM.sale],
  ];
  for (const [t, f] of that) assert.equal(looksHuman(t, [], f), true, `sale gõ tay phải khoá được: ${t}`);
});
