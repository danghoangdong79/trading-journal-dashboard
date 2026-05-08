# Schema: CONFIG

Bảng điều khiển (Control Panel) khai báo các Hằng số, Mục tiêu Quản trị Rủi ro và Cấu hình Automation. Tất cả tham số tại đây đều được các Siêu hàm (`ARRAYFORMULA`) trong `JOURNAL` tham chiếu tuyệt đối, và là đầu vào cho Bot n8n Telegram.

## Bố cục Block

### 1. THAM SỐ GIAO DỊCH (A1:C8)
Dùng làm fallback cho công thức. Từ giai đoạn 2, phí thực tế ưu tiên đọc từ tab `FEE_PROFILE` theo tài khoản + tài sản + ngày hiệu lực.

| Tham số | Ô tham chiếu | Ví dụ | Diễn giải |
|---|---|---|---|
| **Hệ số giá Cổ phiếu** | `C3` | 1000 | Nhân 1,000 để quy đổi giá trị thực tế. |
| **Phí giao dịch Cổ phiếu** | `C4` | 0.15% | Tỷ lệ phí của công ty chứng khoán (Tính trên cả mua và bán). |
| **Thuế TNCN Cổ phiếu** | `C5` | 0.10% | Thuế nhà nước (Chỉ tính trên chiều bán). |
| **Hệ số điểm Phái sinh** | `C6` | 100,000 | 1 Điểm VN30F tương đương 100,000 VNĐ. |
| **Phí giao dịch Phái sinh** | `C7` | 4,000 | Phí tính trên 1 Hợp đồng (Thường thu 4k khi Mở và 4k khi Đóng). |
| **Thuế Phái sinh (ước tính)** | `C8` | 1,000 | Ước tính mức Thuế TNCN tính trên mỗi Hợp đồng. Tổng cộng Phí & Thuế = 5,000đ/lượt. |

### 1B. FEE_PROFILE — cấu hình phí theo ngày hiệu lực

Tab `FEE_PROFILE` là nguồn chuẩn mới cho phí/thuế. Mỗi dòng là một profile phí, có thể áp dụng cho toàn bộ tài khoản bằng **để trống**, `*` hoặc `Tất cả`; hoặc áp dụng riêng cho một tài khoản cụ thể lấy từ `SETUP!AJ:AL`.

| Cột | Trường | Diễn giải |
|---|---|---|
| A | Tài khoản | Dropdown từ `FORMULAS!K:K`: `Tất cả`, `*`, hoặc ID tài khoản trong `SETUP!AJ:AJ`. Để trống/`*`/`Tất cả` = áp dụng mọi tài khoản. |
| B | Tài sản | `Cổ phiếu` hoặc `Phái sinh`. |
| C | Từ ngày | Ngày bắt đầu hiệu lực. |
| D | Đến ngày | Để trống nếu còn hiệu lực. |
| E:G | Phí/thuế cổ phiếu | Phí mua, phí bán, thuế bán. |
| H:J | Phí phái sinh | CTCK, Sở, VSD theo HĐ/chiều. |
| K:M | Phí QLTS ký quỹ PS | Tỷ lệ 0,0024%/tháng, tối thiểu 100.000đ/tháng, tối đa 1.600.000đ/tháng. |
| N:O | Hệ số | Giá trị 1 điểm PS và hệ số giá CP. |

Quy tắc chọn profile: công thức trong `JOURNAL` lấy dòng có `Từ ngày` mới nhất, còn hiệu lực tại ngày đóng lệnh, ưu tiên tài khoản cụ thể hơn dòng mặc định `trống/*/Tất cả`.

### 1C. FEE_CHARGES — phí định kỳ/ngoài từng lệnh

Các phí không thể quy chính xác cho từng dòng lệnh, đặc biệt **Dịch vụ quản lý tài sản ký quỹ phái sinh**, được ghi ở tab `FEE_CHARGES` để audit riêng.

- Phí giao dịch PS theo lệnh trong `JOURNAL`: `Phí CTCK + Phí Sở 2.700 + Phí VSD bù trừ 2.550`, nhân số HĐ và 2 chiều khi lệnh đã đóng.
- Phí QLTS ký quỹ PS: `MIN(MAX(Cơ sở tính phí * 0,0024%, 100.000), 1.600.000)` theo tháng/tài khoản, cần nhập cơ sở tính phí là số dư tài sản ký quỹ lũy kế/tháng từ sao kê VPS.
- Không gộp phí QLTS vào từng trade nếu chưa có dữ liệu số dư ký quỹ, để tránh làm sai PnL từng lệnh.
- Công thức `FEE_CHARGES!J:J` tự tính phí theo cơ sở/tỷ lệ/min/max; `K:K` dùng để nhập **phí thực thu** từ sao kê nếu có; `L:L` là **phí hạch toán** ưu tiên phí thực thu, nếu trống thì dùng phí tính.
- `FEE_CHARGES` có dropdown tài khoản/tài sản/loại phí/trạng thái. Nếu tài khoản để trống/`*`/`Tất cả` thì hiểu là áp dụng chung; nếu chọn mã tài khoản cụ thể thì ưu tiên theo profile riêng trong `FEE_PROFILE`.

### 2. QUẢN TRỊ RỦI RO & MỤC TIÊU (E1:G7)
Tham số cho hệ thống Dashboard cảnh báo & gamification.

| Tiêu chí | Tham số | Ô tham chiếu | Ví dụ | Diễn giải |
|---|---|---|---|---|
| **Quản trị Vốn** | Vốn Cổ Phiếu | `G3` | 500,000,000 ₫ | Tổng vốn phân bổ cho mảng Cơ sở. |
| **Quản trị Vốn** | Vốn Phái Sinh | `G4` | 100,000,000 ₫ | Tổng vốn phân bổ cho mảng Phái sinh. |
| **Rủi ro** | Rủi ro Tối đa / Lệnh | `G5` | 2.0% | Max Risk per Trade. Nếu Lỗ Ròng > (Vốn * 2%), Dashboard sẽ báo động đỏ. |
| **Mục tiêu** | Lợi nhuận kỳ vọng / Tháng | `G6` | 5.0% | Dùng vẽ Progress Bar đo lường KPI tháng. |
| **Mục tiêu** | Tỷ lệ Reward/Risk tối thiểu | `G7` | 2 | Kỳ vọng RR Ratio = 1:2. |

### 3. TÍCH HỢP HỆ THỐNG N8N (I1:K5)
Cấu hình giao tiếp với bên thứ ba (Webhooks, Bots).

| Phân hệ | Cấu hình | Ô tham chiếu | Trạng thái/Giá trị |
|---|---|---|---|
| **Hệ thống** | Múi giờ | `K3` | GMT+7 | Đảm bảo timestamp Bot đánh chính xác. |
| **Telegram** | Gửi thông báo | `K4` | ☑ (TRUE) | Checkbox Bật/Tắt Bot Alert khi khớp lệnh. |
| **N8N** | Webhook URL | `K5` | `https://n8n...` | Điểm End-point của Workflow n8n để Sheet bắn data. |
