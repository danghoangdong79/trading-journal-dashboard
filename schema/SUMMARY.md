# Schema: SUMMARY

Bảng tổng hợp giao dịch (Dashboard) được cấu trúc theo giao diện màn hình rộng ngang (Wide Layout) tham khảo từ thiết kế "Tổng hợp" Ocean Edition.

## Bố cục Giao diện

### 1. BỘ LỌC DỮ LIỆU (Cột B - E)
Bố cục 2 cột dọc rất gọn:
- **B4:** Lọc Tài sản | **C4:** Dropdown `[Tất cả, Cổ phiếu, Phái sinh]` | **D4:** Lọc thời gian | **E4:** Dropdown `[Theo khoảng, Theo tháng]`
- **B5:** Lọc Vị thế | **C5:** Dropdown `[Tất cả, LONG, SHORT]` | **D5:** Chọn Năm | **E5:** Dropdown `[Tất cả, 2024...]`
- **B6:** Lọc Chiến lược | **C6:** Dropdown `[Tất cả, ...]` | **D6:** Chọn Tháng | **E6:** Dropdown `[Tất cả, 1..12]`
- **B7:** Lọc Nhóm ngành | **C7:** Dropdown `[Tất cả, ...]` | **D7:** Từ ngày | **E7:** Date
- **B8:** Lọc Tài khoản | **C8:** Dropdown `[Tất cả, D920568, T271298]` | **D8:** Đến ngày | **E8:** Date

*(Tất cả bộ lọc đều nối chuỗi thành câu lệnh `QUERY` đặt ẩn tại ô `Z1`)*

### 2. THỐNG KÊ NHANH (Cột G - P)
Bố cục 5 cụm thông tin. Được dời nhẹ sang phải (cách bộ lọc một cột F trống) để tạo khoảng thở cân đối:

| Khối | Cột | Chỉ số |
|---|---|---|
| **Group 1** | G - H | Vốn ban đầu, Lãi/Lỗ chốt, % Lãi/Lỗ, Số dư h.tại |
| **Group 2** | I - J | Tổng GD, Winrate, GD Thắng, GD Thua |
| **Group 3** | K - L | Đang mở, GD Hòa, Thắng TB, Thua TB |
| **Group 4** | M - N | Lãi CP, Lãi PS, Phí & Thuế, Hệ số LN |
| **Group 5** | O - P | Max DD, DD Tuyệt đối, Mục tiêu, Rủi ro/lệnh |

### 3. DATA TABLE (Dòng 9+)
Bảng dữ liệu mirror từ `JOURNAL`, xuất phát từ ô `B10` qua hàm `QUERY`. Cột A (ô A10) chứa hàm `ARRAYFORMULA` sinh số thứ tự tự động. Dòng 9 là Header. Đã áp dụng đầy đủ Conditional Formatting (Màu Trạng Thái, Màu Lãi Lỗ) từ dòng 10.

| Col | Tên | Nguồn JOURNAL |
|---|---|---|
| A | # | Tự sinh (`ROW()-14`) |
| B | Trạng thái | A (AUTO) |
| C | Tài sản | C |
| D | Mã GD | D |
| E | Vị thế | E |
| F | Chiến lược | G |
| G | Ngày Mở | H |
| H | Ngày Đóng | J |
| I | Số ngày | L (AUTO) |
| J | Khối lượng | M |
| K | Giá vào | N |
| L | Giá đóng | O |
| M | Biên độ | R (AUTO) |
| N | Lãi/Lỗ Gộp | S (AUTO) |
| O | Phí & Thuế | T (AUTO) |
| P | Lãi/Lỗ Ròng | U (AUTO) |
| Q | Tâm lý | V |
| R | Ghi chú | W |

*(Note: Data output kéo đến cột R, vừa vặn với kích thước màn hình bảng phía dưới)*
