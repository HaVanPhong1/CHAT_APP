# PHÂN TÍCH THIẾT KẾ
## Ứng dụng Chat nhóm tích hợp AI — Tính năng Dịch thuật Realtime & AI Bot @mention

---

## 1. Giới thiệu và mục tiêu

### 1.1 Bối cảnh
Ứng dụng mô phỏng một group chat cho nhóm sinh viên làm đồ án (minh họa: nhóm "CineBook — 65KTPM"), có thành viên nói tiếng Anh xen lẫn tiếng Việt. Ngoài các chức năng chat cơ bản, hệ thống tích hợp hai tính năng AI nhằm giải quyết hai vấn đề thực tế:

| Vấn đề | Tính năng giải quyết |
|---|---|
| Rào cản ngôn ngữ khi nhóm có thành viên nước ngoài | Dịch thuật realtime |
| Cần tra cứu/tính toán/brainstorm nhanh mà không muốn rời app | AI Bot qua @mention |

### 1.2 Mục tiêu thiết kế
- Tích hợp AI **không phá vỡ luồng trò chuyện tự nhiên** — dịch và bot đều xuất hiện như một phần của cuộc hội thoại, không phải màn hình riêng biệt.
- Tối ưu **số lượng lệnh gọi API** (cache kết quả dịch, không dịch lại).
- Giao diện phải phân biệt rõ ràng ba loại nội dung: tin nhắn người dùng, bản dịch (AI sinh ra), phản hồi bot (AI sinh ra) — tránh gây nhầm lẫn thật/máy.

---

## 2. Phân tích yêu cầu

### 2.1 Yêu cầu chức năng (Functional Requirements)

**Nhóm chat cơ bản**
- FR1: Hiển thị danh sách thành viên nhóm kèm trạng thái online/offline.
- FR2: Hiển thị luồng tin nhắn theo thời gian, phân biệt tin của mình / người khác / bot.
- FR3: Gửi tin nhắn mới, tự động cuộn xuống tin mới nhất.
- FR4: Mỗi tin nhắn có avatar, tên người gửi, thời gian gửi.

**Dịch thuật realtime**
- FR5: Người dùng bật/tắt chế độ "Tự động dịch" bằng một công tắc (toggle).
- FR6: Khi bật, mọi tin nhắn không phải tiếng Việt được tự động dịch sang tiếng Việt và hiển thị ngay dưới tin nhắn gốc.
- FR7: Khi tắt, người dùng có thể bấm nút "Dịch" trên từng tin nhắn để dịch theo yêu cầu (hai chiều Việt ↔ Anh).
- FR8: Kết quả dịch được cache theo `message.id`, không gọi lại API nếu đã dịch.
- FR9: Hiển thị trạng thái "đang dịch…" trong lúc chờ phản hồi.

**AI Bot qua @mention**
- FR10: Người dùng gõ `@AI <nội dung>` trong ô nhập và gửi như tin nhắn bình thường.
- FR11: Hệ thống phát hiện cú pháp `@AI` (không phân biệt hoa/thường), trích phần câu hỏi phía sau.
- FR12: Tin nhắn của người dùng vẫn hiển thị bình thường trong luồng chat; sau đó bot phản hồi như một thành viên riêng (avatar, tên "AI Bot").
- FR13: Hiển thị hiệu ứng "đang nhập..." (typing indicator) trong lúc chờ bot trả lời.
- FR14: Xử lý lỗi mạng/API — hiển thị thông báo lỗi thân thiện thay vì crash giao diện.

### 2.2 Yêu cầu phi chức năng (Non-functional Requirements)

| Loại | Yêu cầu |
|---|---|
| Hiệu năng | Không chặn (block) giao diện khi chờ API — dùng trạng thái loading cục bộ theo từng tin nhắn |
| Khả năng mở rộng | Cấu trúc state cho phép thêm nhóm chat khác, thêm ngôn ngữ dịch khác mà không đổi kiến trúc |
| Chi phí | Cache bản dịch để tránh gọi API trùng lặp cho cùng một tin nhắn |
| Khả năng dùng (Usability) | Người dùng luôn phân biệt được đâu là nội dung gốc, đâu là nội dung do AI sinh ra |
| Khả năng chịu lỗi | Mọi lệnh gọi API đều có `try/catch`, có thông điệp lỗi dự phòng |

---

## 3. Đối tượng người dùng và kịch bản sử dụng (Use Case)

| Actor | Mô tả |
|---|---|
| Thành viên nhóm (VD: Phong, Minh) | Gửi/nhận tin nhắn, đọc bản dịch, gọi bot |
| Thành viên nước ngoài (VD: Anna) | Gửi tin bằng tiếng Anh, được tự động dịch cho các thành viên khác |
| AI Bot | Actor hệ thống, phản hồi khi được @mention |

**Use case chính — "Hỏi nhanh AI trong group":**
1. Người dùng đang thảo luận trong nhóm, cần tra cứu một thông tin.
2. Thay vì mở tab/app khác, họ gõ `@AI <câu hỏi>` ngay trong ô chat.
3. Hệ thống gửi câu hỏi tới AI, hiển thị typing indicator.
4. Bot trả lời ngay trong luồng chat — cả nhóm đều thấy, không chỉ riêng người hỏi.

**Use case phụ — "Đọc tin nhắn tiếng nước ngoài":**
1. Anna gửi tin nhắn tiếng Anh.
2. Vì "Tự động dịch" đang bật, hệ thống dịch ngầm và hiển thị bản dịch tiếng Việt ngay dưới, không cần thao tác gì thêm từ người đọc.

---

## 4. Kiến trúc tổng thể

### 4.1 Sơ đồ kiến trúc

```
┌──────────────────────────────────────────────────────────┐
│                     CLIENT (React SPA)                    │
│                                                            │
│   ┌───────────────┐   ┌──────────────────────────────┐    │
│   │   Sidebar UI   │   │        Main Chat UI          │    │
│   │ (danh sách     │   │  Header | Message List |     │    │
│   │  thành viên)   │   │  Input bar                   │    │
│   └───────────────┘   └───────────────┬──────────────┘    │
│                                        │                   │
│                     ┌──────────────────┴─────────────────┐ │
│                     │        State Management (Hooks)    │ │
│                     │ messages, translations, translating│ │
│                     │ botTyping, autoTranslate, input     │ │
│                     └──────────────────┬─────────────────┘ │
│                                        │                    │
│                     ┌──────────────────┴─────────────────┐ │
│                     │       askClaude(system, prompt)     │ │
│                     └──────────────────┬─────────────────┘ │
└────────────────────────────────────────┼────────────────────┘
                                          │ fetch() POST
                                          ▼
                          ┌───────────────────────────────┐
                          │  Anthropic API /v1/messages    │
                          │  (model: claude-sonnet-4-6)    │
                          └───────────────────────────────┘
```

Ứng dụng hiện tại là **client-only** (single-page component), gọi thẳng API AI từ trình duyệt. Đây là mô hình demo/prototype phù hợp cho đồ án — trong sản phẩm thực tế phần này nên được chuyển qua backend (xem mục 8: Hạn chế & hướng phát triển).

### 4.2 Nguyên tắc tách trách nhiệm (Separation of Concerns)

| Thành phần | Trách nhiệm |
|---|---|
| `MEMBERS`, `SEED_MESSAGES` | Dữ liệu mẫu (đóng vai trò tương đương dữ liệu từ database) |
| `askClaude()` | Lớp giao tiếp API duy nhất — mọi tính năng AI đều đi qua hàm này, dễ thay model hoặc thêm logging/tool sau này |
| `translateMessage()` | Logic nghiệp vụ dịch thuật, độc lập với UI |
| `handleSend()` | Logic phát hiện `@AI`, điều phối giữa gửi tin nhắn thường và gọi bot |
| Component JSX | Thuần hiển thị (presentational), không chứa logic nghiệp vụ |

---

## 5. Thiết kế luồng xử lý (Sequence Flow)

### 5.1 Luồng Dịch thuật tự động

```
Anna gửi tin (lang="en")
        │
        ▼
useEffect [autoTranslate, messages] kích hoạt
        │
        ▼
Lọc messages: lang !== 'vi' && không phải bot
        │
        ▼
translateMessage(msg) cho từng tin chưa có trong cache
        │
        ├── Nếu đã có translations[msg.id] hoặc đang dịch → bỏ qua (tránh gọi trùng)
        │
        ▼
setTranslating[msg.id] = true  →  UI hiển thị "đang dịch…"
        │
        ▼
askClaude(system: "chỉ dịch, không thêm gì khác", prompt: msg.text)
        │
        ▼
setTranslations[msg.id] = kết quả  →  UI hiển thị "Dịch: ..."
        │
        ▼
setTranslating[msg.id] = false
```

**Điểm thiết kế quan trọng:** việc dùng `translations` (cache) và `translating` (khóa chống gọi trùng) làm hai state riêng biệt giúp:
- Không dịch lại một tin nhắn đã dịch khi `useEffect` chạy lại.
- Cho phép hiển thị trạng thái loading **theo từng tin nhắn** thay vì loading toàn màn hình.

### 5.2 Luồng AI Bot @mention

```
Người dùng nhập: "@AI tóm tắt HTA là gì"
        │
        ▼
handleSend() được gọi (khi bấm Gửi hoặc Enter)
        │
        ▼
Regex /@ai\b/i.test(raw) → true
        │
        ▼
1) Đẩy tin nhắn gốc của người dùng vào messages (hiển thị ngay, không chờ AI)
2) Trích câu hỏi: raw.replace(/@ai/i, '').trim()
        │
        ▼
setBotTyping(true)  →  UI hiển thị bubble "..." với animation
        │
        ▼
askClaude(system: persona của bot, prompt: câu hỏi)
        │
        ├── Thành công → push tin nhắn senderId="bot" vào messages
        └── Lỗi (catch) → push tin nhắn lỗi thân thiện, không throw ra UI
        │
        ▼
setBotTyping(false)
```

**Điểm thiết kế quan trọng:**
- Tin nhắn của người dùng được hiển thị **ngay lập tức**, tách biệt với việc chờ bot — người dùng không cảm thấy app bị "đứng" trong lúc chờ AI phản hồi.
- Regex dùng `\b` (word boundary) để tránh khớp nhầm các từ chứa "ai" khác (VD: "air", "main").
- System prompt của bot được cấu hình cố định là "trợ lý AI trong group chat sinh viên IT" để phản hồi luôn đúng ngữ cảnh, không cần người dùng nhắc lại mỗi lần.

---

## 6. Thiết kế dữ liệu (Data Model)

### 6.1 Message

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | number | Định danh duy nhất, tăng dần |
| `senderId` | string | `"me"` \| id thành viên \| `"bot"` |
| `text` | string | Nội dung tin nhắn gốc |
| `lang` | `"vi"` \| `"en"` | Ngôn ngữ gốc — quyết định chiều dịch |
| `time` | string | Giờ:phút hiển thị |

### 6.2 Member

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | string | Định danh thành viên |
| `name` | string | Tên hiển thị |
| `color` | string (hex) | Màu avatar riêng, dùng để nhận diện nhanh bằng thị giác |
| `online` | boolean | Trạng thái hoạt động |

### 6.3 Translation cache

Được lưu dưới dạng **dictionary theo `message.id`** thay vì gắn trực tiếp vào object Message:

```
translations = { [messageId]: string }
translating  = { [messageId]: boolean }
```

**Lý do tách riêng thay vì thêm field `translatedText` vào Message:** giữ Message là dữ liệu "bất biến" (immutable, giống dữ liệu từ server), còn bản dịch là dữ liệu dẫn xuất (derived state) sinh ra phía client — tách biệt giúp dễ reset, dễ thêm đa ngôn ngữ dịch (VD dịch sang tiếng Nhật) mà không đổi cấu trúc Message gốc.

---

## 7. Thiết kế giao diện (UI/UX)

### 7.1 Bố cục
- **Sidebar trái (220px):** nhóm đang chọn + danh sách thành viên kèm chấm trạng thái online — giúp người dùng biết ai đang có mặt trước khi @mention hoặc chờ phản hồi.
- **Khu vực chat chính:** header (tên nhóm, gợi ý cú pháp `@AI`, công tắc dịch) → danh sách tin nhắn cuộn được → thanh nhập liệu cố định phía dưới.

### 7.2 Ngôn ngữ hình ảnh phân biệt 3 loại nội dung

| Loại nội dung | Cách phân biệt |
|---|---|
| Tin nhắn người dùng khác | Bong bóng nền tối trung tính (`--panel-alt`), avatar màu riêng theo người |
| Tin nhắn của chính mình | Bong bóng màu xanh accent (`--accent-me`), căn phải |
| Phản hồi AI Bot | Bong bóng viền tím (`--accent-bot`), avatar "AI" cố định |
| Bản dịch (AI sinh ra) | Không phải bong bóng riêng — hiển thị như **chú thích phụ** dưới tin gốc, có gạch dọc màu ngọc (`--accent-translate`) bên trái, tiền tố rõ ràng "Dịch:" |

Việc **không** biến bản dịch thành một bong bóng chat riêng là chủ đích: bản dịch phải luôn gắn liền và phụ thuộc vào tin nhắn gốc, tránh gây cảm giác đó là một tin nhắn mới/độc lập.

### 7.3 Trạng thái chờ (Loading states)
- Dịch: text "đang dịch…" thay cho nút, tại đúng vị trí bản dịch sẽ xuất hiện — không dùng spinner toàn cục.
- Bot: 3 chấm nhấp nháy (typing indicator) trong bong bóng riêng, giống trải nghiệm chat quen thuộc (Messenger, Zalo), giúp người dùng không cần học thao tác mới.

### 7.4 Bảng màu và kiểu chữ
- Nền tối (`#10121A`) giúp các accent màu (xanh dương cho "tôi", tím cho bot, ngọc cho dịch) nổi bật và có ý nghĩa phân loại rõ ràng thay vì trang trí.
- Font Inter cho toàn bộ nội dung (đảm bảo hiển thị đúng dấu tiếng Việt); font monospace (JetBrains Mono) chỉ dùng cho timestamp — vùng nội dung an toàn không chứa ký tự có dấu.

---

## 8. Hạn chế hiện tại và hướng phát triển

### 8.1 Hạn chế (do đây là bản prototype phía client)
1. **Gọi API trực tiếp từ client:** phù hợp để demo, nhưng thực tế cần đưa qua backend để giấu API key, kiểm soát rate limit, và log chi phí sử dụng.
2. **Không có persistence:** tin nhắn mất khi tải lại trang — cần tích hợp WebSocket + database (khớp với kiến trúc "Node.js/Spring Boot + WebSocket" đã đề xuất ở ý tưởng ban đầu).
3. **Phát hiện ngôn ngữ tin nhắn (`lang`) đang gán thủ công theo dữ liệu mẫu**, chưa tự động nhận diện ngôn ngữ của tin nhắn mới do người dùng gõ — cần bổ bản language detection (có thể dùng chính AI để phân loại) trước khi quyết định có cần dịch hay không.
4. **Một bot dùng chung cho cả nhóm**, chưa hỗ trợ nhiều "persona" bot khác nhau trong cùng group.

### 8.2 Hướng phát triển đề xuất
- Chuyển `askClaude()` thành lệnh gọi tới backend (`/api/translate`, `/api/bot`) thay vì gọi thẳng Anthropic API từ trình duyệt.
- Thêm nhận diện ngôn ngữ tự động cho tin nhắn gửi đi, để không phải gán cứng `lang`.
- Lưu lịch sử hội thoại với bot theo ngữ cảnh (hiện tại mỗi câu hỏi `@AI` độc lập, chưa nhớ hội thoại trước đó).
- Thêm chỉ số theo dõi chi phí gọi API (số lượt dịch, số lượt hỏi bot) để phục vụ phân tích non-functional requirement về chi phí.

---

## 9. Tổng kết

Thiết kế tập trung vào nguyên tắc: **AI phải hòa vào luồng chat tự nhiên, không phải một tính năng tách biệt**. Hai cơ chế chính — cache dịch theo `message.id` và tách trạng thái loading theo từng tin nhắn — vừa tối ưu số lệnh gọi API, vừa giữ trải nghiệm mượt mà. Kiến trúc tách lớp gọi API (`askClaude`) riêng khỏi logic nghiệp vụ và UI giúp dễ dàng thay đổi model, thêm tính năng AI mới, hoặc chuyển sang backend thật trong giai đoạn phát triển tiếp theo.
