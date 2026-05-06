# Schema: DASHBOARD

Bảng tổng hợp giao dịch (Dashboard) tự động tính toán từ `JOURNAL`. Thuần công thức, không nhập tay.

## Bố cục

### 1. KPI COUNTERS (Row 1-9)

**Bộ lọc (Row 1):**
- `G1`: Dropdown `Tất cả | Cổ phiếu | Phái sinh`
- `J1`: Dropdown lọc theo Tháng

**3 Khối KPI (Row 3-8):**

| Khối | Cột | Chỉ số |
|---|---|---|
| **TỔNG QUAN GIAO DỊCH** | A:F | Tổng GD, GD Thắng, GD Thua |
| **HIỆU SUẤT** | G:L | Winrate, Thắng TB, Thua TB, Lãi Ròng, Lãi CP, Lãi PS |
| **RỦI RO & CHI PHÍ** | M | Max DD, Hệ số Lợi nhuận, Phí & Thuế, Đang mở |

**Tham chiếu CONFIG (Row 8):**
- Vốn CK, Vốn PS, Mục tiêu/Tháng, R:R min, Rủi ro/Lệnh

### 2. DATA TABLE (Row 12+)

Bảng dữ liệu mirror từ `JOURNAL`, freeze tại Row 12.

| Col | Tên | Nguồn JOURNAL |
|---|---|---|
| A | # | Auto-increment |
| B | Trạng Thái | A (AUTO) |
| C | Tài Sản | C |
| D | Mã GD | D |
| E | Vị Thế | E |
| F | Chiến Lược | G |
| G | Ngày Mở | H |
| H | Ngày Đóng | J |
| I | Số Ngày | L (AUTO) |
| J | KL | M |
| K | Giá Vào | N |
| L | Giá Đóng | O |
| M | Biên Độ | R (AUTO) |
| N | Lãi/Lỗ Gộp | S (AUTO) |
| O | Phí & Thuế | T (AUTO) |
| P | Lãi/Lỗ Ròng | U (AUTO) |
| Q | Tâm Lý | V |
| R | Ghi Chú | W |

### Conditional Formatting
- Cột **Trạng Thái**: Xanh lá (Thắng), Đỏ (Thua), Vàng (Đang mở)
- Cột **Lãi/Lỗ Ròng**: Xanh (>0), Đỏ (<0)
