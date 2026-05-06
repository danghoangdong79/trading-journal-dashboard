# Schema: FORMULAS

Bảng Logic (Backend Engine) kết nối trung gian giữa `SETUP` và `JOURNAL`.
Tuyệt đối không nhập liệu tay vào bảng này.

## Bố cục Columns

| Col | Tên Cột | Chức năng (Công thức) | Output Target |
|---|---|---|---|
| **A** | **CỔ PHIẾU** | Lọc cột E bên SETUP dựa trên Checkbox = TRUE | Nguồn chờ cho Ma trận M |
| **B** | **PHÁI SINH** | Lọc cột O bên SETUP dựa trên Checkbox = TRUE | Nguồn chờ cho Ma trận M |
| **C** | **CHIẾN LƯỢC** | Lọc cột U bên SETUP dựa trên Checkbox = TRUE | Validation cho `JOURNAL!G` |
| **D** | **TÂM LÝ** | Lọc cột Z bên SETUP dựa trên Checkbox = TRUE | Validation cho `JOURNAL!V` |
| **E** | **LOẠI LỆNH** | Lọc cột AE bên SETUP dựa trên Checkbox = TRUE | Validation cho `JOURNAL!F` |
| **F** | | *(Cột trống Delimiter)* | |
| **G** | **NHÓM CP** | Lọc cột A bên SETUP dựa trên Checkbox = TRUE | Validation cho `SETUP!G` |
| **H** | **NHÓM PS** | Lọc cột K bên SETUP dựa trên Checkbox = TRUE | Validation cho `SETUP!Q` |
| **I** | **TÀI KHOẢN** | Lọc cột AJ bên SETUP dựa trên Checkbox = TRUE | Validation cho `JOURNAL!B` |
| **J** | **TÀI KHOẢN (LỌC)** | Thêm "Tất cả" vào trên cùng của cột I | Validation cho `SUMMARY!C8` |
| **...**| | | |
| **M** | **MATRIX MÃ GD** | Chứa `ARRAYFORMULA(TRANSPOSE(...))` chạy từ M đến Z. | Validation ĐỘNG cho `JOURNAL!D` |

## Cơ chế Helper Matrix (Cột M trở đi)
- Mỗi hàng trong `FORMULAS` (VD: Row 2) tương ứng 1-1 với hàng trong `JOURNAL` (Row 2).
- Hàm `IF(JOURNAL!$C2="Cổ phiếu", $A$2:$A, IF(JOURNAL!$C2="Phái sinh", $B$2:$B, {""}))` sẽ check xem cột `Tài Sản` ở Nhật ký đang chọn gì. 
- Sau đó nó rải toàn bộ danh sách phù hợp theo chiều ngang (Dùng hàm `TRANSPOSE`).
- Nhờ đó, cột D bên `JOURNAL` chỉ việc trỏ Data Validation vào khoảng ngang `FORMULAS!M2:Z2` là có ngay Dependent Dropdown mượt mà.
