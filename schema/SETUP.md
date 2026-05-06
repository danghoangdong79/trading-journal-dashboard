# Schema: SETUP

Chứa Master Data tĩnh (Danh mục gốc) định hình tất cả Dropdown trên bảng Nhật Ký. Được chia thành 7 Block độc lập.

## Bố cục Block

| Block | Cột | DB Fields (Từ R2) | Mô tả |
|---|---|---|---|
| **NHÓM NGÀNH** (Cổ phiếu)| A:C | `tên_nhóm`, `mô_tả`, `bật` ☑ | Danh mục nhóm ngành (VD: Thép, Ngân hàng). |
| ║ | D | | *Cột ngăn cách (Delimiter)* |
| **MÃ CỔ PHIẾU** | E:I | `mã_cp`, `tên_cty`, `nhóm_ngành`, `sàn`, `bật` ☑ | Danh sách Mã Cổ phiếu (Rổ VN30, Midcap...). Cột `nhóm_ngành` link tới Cột A. |
| ║ | J | | *Cột ngăn cách (Delimiter)* |
| **NHÓM PHÁI SINH** | K:M | `tên_nhóm`, `mô_tả`, `bật` ☑ | Phân loại Phái sinh (HĐTL Chỉ số, CW...). |
| ║ | N | | *Cột ngăn cách (Delimiter)* |
| **MÃ PHÁI SINH** | O:S | `mã_ps`, `tên_hđ`, `nhóm_ps`, `sàn`, `bật` ☑ | Danh sách HĐTL/CW. Cột `nhóm_ps` link tới Cột K. |
| ║ | T | | *Cột ngăn cách (Delimiter)* |
| **CHIẾN LƯỢC** | U:X | `mã_cl`, `tên_cl`, `mô_tả`, `bật` ☑ | 8 Chiến lược (Lướt T0, Phá nền, Hồi kỹ thuật, Bắt dao rơi, Đầu tư giá trị, Theo dòng tiền, Ăn cổ tức, Theo tin tức). |
| ║ | Y | | *Cột ngăn cách (Delimiter)* |
| **TÂM LÝ** | Z:AC | `mã_tl`, `tên_tl`, `mô_tả`, `bật` ☑ | 8 Tâm lý (Bình tĩnh, Kỷ luật, FOMO, Sợ hãi, Trả thù, Thiếu kiên nhẫn, Quá tự tin, Do dự, Tự tin...). |
| ║ | AD | | *Cột ngăn cách (Delimiter)* |
| **LOẠI LỆNH** | AE:AH | `mã_lệnh`, `tên_lệnh`, `mô_tả`, `bật` ☑ | 7 Loại lệnh (Lệnh thường, ATO, ATC, MTL, MOK, MAK, PLO). |
| ║ | AI | | *Cột ngăn cách (Delimiter)* |
| **TÀI KHOẢN** | AJ:AL | `mã_tk`, `tên_tk`, `bật` ☑ | Danh sách Tài khoản giao dịch (VD: D920568, T271298). |

## Quy tắc Hoạt động
- **Checkbox (Boolean):** Mọi Block kết thúc bằng 1 cột `Bật`. Chỉ khi Checkbox = TRUE, dữ liệu dòng đó mới được truyền sang bảng `FORMULAS`.
- **Dependent Dropdown Nội bộ:** Các cột `nhóm_ngành` (Cột G) và `nhóm_ps` (Cột Q) được validation kéo danh sách realtime trực tiếp từ bảng Nhóm tương ứng thông qua trung gian `FORMULAS`.
