# Schema: CONFIG

Bảng điều khiển (Control Panel) khai báo các Hằng số, Mục tiêu Quản trị Rủi ro và Cấu hình Automation. Tất cả tham số tại đây đều được các Siêu hàm (`ARRAYFORMULA`) trong `JOURNAL` tham chiếu tuyệt đối, và là đầu vào cho Bot n8n Telegram.

## Bố cục Block

### 1. THAM SỐ GIAO DỊCH (A1:C8)
Dùng để tính Lãi/Lỗ Gộp và Phí/Thuế chính xác đến từng đồng.

| Tham số | Ô tham chiếu | Ví dụ | Diễn giải |
|---|---|---|---|
| **Hệ số giá Cổ phiếu** | `C3` | 1000 | Nhân 1,000 để quy đổi giá trị thực tế. |
| **Phí giao dịch Cổ phiếu** | `C4` | 0.15% | Tỷ lệ phí của công ty chứng khoán (Tính trên cả mua và bán). |
| **Thuế TNCN Cổ phiếu** | `C5` | 0.10% | Thuế nhà nước (Chỉ tính trên chiều bán). |
| **Hệ số điểm Phái sinh** | `C6` | 100,000 | 1 Điểm VN30F tương đương 100,000 VNĐ. |
| **Phí giao dịch Phái sinh** | `C7` | 4,000 | Phí tính trên 1 Hợp đồng (Thường thu 4k khi Mở và 4k khi Đóng). |
| **Thuế Phái sinh (ước tính)** | `C8` | 1,000 | Ước tính mức Thuế TNCN tính trên mỗi Hợp đồng. Tổng cộng Phí & Thuế = 5,000đ/lượt. |

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
