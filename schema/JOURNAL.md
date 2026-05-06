# Schema: JOURNAL

Bảng giao dịch chính (Main Data Table) dùng để nạp liệu thủ công hoặc qua bot n8n.
Các cột `[AUTO]` tuyệt đối không được ghi đè bằng n8n.

## Bố cục Columns

| Col | Field | Khóa Cột | Type | Description |
|---|---|---|---|---|
| **A** | **Trạng Thái** | `[AUTO]` | Formula | `Thắng`, `Thua`, `Hòa`, `Đang mở`. Tính từ Lãi Ròng. |
| **B** | **Tài Khoản** | | String | ID Tài khoản (VD: `T271298`). |
| **C** | **Tài Sản** | | Dropdown | `Cổ phiếu` hoặc `Phái sinh` (Hardcoded list). |
| **D** | **Mã GD** | | Dropdown | Mã Chứng khoán / Hợp đồng. Dependent Dropdown từ `FORMULAS`. |
| **E** | **Vị Thế** | | Dropdown | `LONG`, `SHORT` (Hardcoded list - gộp chung cho cả CP và PS). |
| **F** | **Loại Lệnh** | | Dropdown | `ATO`, `ATC`, `MOK`... |
| **G** | **Chiến Lược** | | Dropdown | Theo Setup (VD: `Lướt sóng T0`). |
| **H** | **Ngày Mở** | | Date | Định dạng `YYYY-MM-DD`. Bắt buộc. |
| **I** | **Giờ Mở** | | Time | Định dạng `HH:MM:SS`. Bắt buộc. |
| **J** | **Ngày Đóng** | | Date | Bỏ trống nếu lệnh `Đang mở`. |
| **K** | **Giờ Đóng** | | Time | Bỏ trống nếu lệnh `Đang mở`. |
| **L** | **Số Ngày** | `[AUTO]` | Formula | Bằng 0 nếu đánh T0, tự động bỏ trống nếu `Đang mở`. |
| **M** | **Khối Lượng** | | Number | Số lượng HĐ / Cổ phiếu. |
| **N** | **Giá Vào** | | Number | Giá mở vị thế. |
| **O** | **Giá Đóng** | | Number | Giá đóng vị thế (Trống nếu Đang mở). |
| **P** | **Cắt Lỗ SL** | | Number | Mức dừng lỗ. |
| **Q** | **Chốt Lời TP**| | Number | Mức chốt lời. |
| **R** | **Biên Độ** | `[AUTO]` | Formula | Mức chênh lệch giá (Dương = Đi đúng vị thế). |
| **S** | **Lãi/Lỗ Gộp** | `[AUTO]` | Formula | Lãi chưa tính phí thuế, dựa theo Hệ số nhân `CONFIG`. |
| **T** | **Phí & Thuế** | `[AUTO]` | Formula | Tính theo mức phí thuế của `CONFIG`. |
| **U** | **Lãi/Lỗ Ròng** | `[AUTO]` | Formula | `Lãi Gộp` trừ `Phí & Thuế`. |
| **V** | **Tâm Lý** | | Dropdown | Note tâm lý giao dịch (FOMO, Kỷ luật...). |
| **W** | **Ghi Chú** | | String | Ghi chú văn bản tự do. |
| **X** | **Nhóm Ngành** | `[AUTO]` | Formula | Helper column dùng `VLOOKUP` map từ SETUP để làm mốc lọc trên SUMMARY. |
| **Y** | **Link Ảnh** | | URL | Link ảnh Screenshot của trade. |

## Quy tắc Giao diện (UX Gamification)
- **Vùng AUTO (A, L, R, S, T, U):** Header xanh rêu, nền xám nhạt (Block không nhập tay).
- **Vùng MANUAL:** Header xanh navy, nền trắng.
- **Dynamic Highlight:** Khi nhập `Mã GD` -> Các ô bắt buộc nhập MỞ LỆNH sáng màu Xanh nhạt. Khi nhập `Giá Đóng` -> Các ô bắt buộc ĐÓNG LỆNH (Ngày, Giờ) sáng màu Tím nhạt.
