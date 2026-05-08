# Schema: JOURNAL

Tab `JOURNAL` la bang du lieu giao dich chinh. Repo hien chuan hoa theo layout Ocean 24 cot dang ton tai tren Google Sheet that.

## Bo Cuc Columns

| Col | Field | Khoa Cot | Type | Description |
|---|---|---|---|---|
| **A** | **Trang Thai** | `[AUTO]` | Formula | Gia tri thuc te: `Thang`, `Thua`, `Hoa`, `Dang mo` (live values have Vietnamese accents). Tinh tu Lai/Lo Rong va Gia Dong. |
| **B** | **Tai Khoan** | | Dropdown | ID tai khoan, nguon tu `FORMULAS!I:I`. |
| **C** | **Tai San** | | Dropdown | `Co phieu` or `Phai sinh` (live values have Vietnamese accents). |
| **D** | **Ma GD** | | Dependent Dropdown | Ma chung khoan/hop dong, nguon theo tung dong tu matrix `FORMULAS!M:ZZ`. |
| **E** | **Vi The** | | Dropdown | `LONG` hoac `SHORT`; sheet that dung chung cho co phieu va phai sinh. |
| **F** | **Loai Lenh** | | Dropdown | Nguon tu `FORMULAS!E:E`, vi du `L?nh th??ng`, `ATO`, `ATC`, `MAK`, `MTL`. |
| **G** | **Chien Luoc** | | Dropdown | Nguon tu `FORMULAS!C:C`. |
| **H** | **Ngay Mo** | | Date | Ngay mo vi the. |
| **I** | **Gio Mo** | | Time | Gio mo vi the. |
| **J** | **Ngay Dong** | | Date | Bo trong neu lenh dang mo. |
| **K** | **Gio Dong** | | Time | Bo trong neu lenh dang mo. |
| **L** | **So Ngay** | `[AUTO]` | Formula | Ngay Dong - Ngay Mo. |
| **M** | **Khoi Luong** | | Number | So luong hop dong hoac co phieu. |
| **N** | **Gia Vao** | | Number | Gia mo vi the. |
| **O** | **Gia Dong** | | Number | Gia dong vi the. |
| **P** | **Cat Lo (SL)** | | Number | Muc dung lo. |
| **Q** | **Chot Loi (TP)** | | Number | Muc chot loi. |
| **R** | **Bien Do** | `[AUTO]` | Formula | Chenh lech gia theo chieu vi the. |
| **S** | **Lai/Lo Gop** | `[AUTO]` | Formula | Lai/lo truoc phi thue. |
| **T** | **Phi & Thue** | `[AUTO]` | Formula | Phi va thue theo `FEE_PROFILE`, fallback ve `CONFIG` neu chua co profile. |
| **U** | **Lai/Lo Rong** | `[AUTO]` | Formula | Lai/Lo Gop - Phi & Thue. |
| **V** | **Tam Ly** | | Dropdown | Nguon tu `FORMULAS!D:D`. |
| **W** | **Ghi Chu Review** | | Text | Ghi chu review lenh. |
| **X** | **Nhom Nganh** | `[AUTO]` | Formula | Map tu `SETUP` theo Ma GD. |

## Cong Thuc Chinh

- `A1`: array formula tinh trang thai.
- `L1`: array formula tinh so ngay nam giu.
- `R1`: array formula tinh bien do theo `LONG/SHORT`.
- `S1`: `MAP/LET` formula tinh lai/lo gop theo he so trong `FEE_PROFILE` tai ngay dong lenh; tài khoản trống/`Tất cả` sẽ fallback về profile mặc định.
- `T1`: `MAP/LET` formula tinh phi & thue theo tai khoan + tai san + ngay hieu luc trong `FEE_PROFILE`; ưu tiên tài khoản cụ thể, sau đó tới dòng mặc định trống/`*`/`Tất cả`.
- `U1`: array formula tinh lai/lo rong.
- `X2`: array formula map nhom nganh tu `SETUP`.

## Data Validation

- `B`: tai khoan tu `FORMULAS!I:I`.
- `C`: `Co phieu`, `Phai sinh` (live values have Vietnamese accents).
- `D`: ma giao dich theo matrix `FORMULAS!M:ZZ`.
- `E`: `LONG`, `SHORT`.
- `F`: loai lenh tu `FORMULAS!E:E`.
- `G`: chien luoc tu `FORMULAS!C:C`.
- `H`, `J`: ngay hop le.
- `V`: tam ly tu `FORMULAS!D:D`.

## Luu Y Dashboard

- Dashboard doc `JOURNAL!A1:X2000`, khong can cot `Y:AH`.
- Neu muon hien thi co phieu bang `Mua/Ban`, hay mapping UI tu `LONG/SHORT`; khong doi du lieu goc neu chua thong nhat validation.
