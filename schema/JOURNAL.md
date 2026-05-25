# Schema: JOURNAL

Tab `JOURNAL` la bang du lieu giao dich chinh. Repo hien chuan hoa theo layout Ocean 24 cot dang ton tai tren Google Sheet that.

## Bo Cuc Columns

| Col | Field | Khoa Cot | Type | Description |
|---|---|---|---|---|
| **A** | **Trang Thai** | `[AUTO]` | Formula | Gia tri thuc te: `Thang`, `Thua`, `Hoa`, `Dang mo` (live values have Vietnamese accents). Tinh tu Lai/Lo Rong va Gia Dong. |
| **B** | **Tai Khoan** | | Dropdown | ID tai khoan, nguon tu `FORMULAS!I:I`. |
| **C** | **So Hieu Lenh**| | Text | So hieu/ID lenh giao dich tren san. Dùng de mapping lenh dong/mo hoac chot/huy. |
| **D** | **Tai San** | | Dropdown | `Co phieu` or `Phai sinh` (live values have Vietnamese accents). |
| **E** | **Ma GD** | | Dependent Dropdown | Ma chung khoan/hop dong, nguon theo tung dong tu matrix `FORMULAS!M:ZZ`. |
| **F** | **Vi The** | | Dropdown | `LONG` hoac `SHORT`; sheet that dung chung cho co phieu va phai sinh. |
| **G** | **Loai Lenh** | | Dropdown | Nguon tu `FORMULAS!E:E`, vi du `L?nh th??ng`, `ATO`, `ATC`, `MAK`, `MTL`. |
| **H** | **Chien Luoc** | | Dropdown | Nguon tu `FORMULAS!C:C`. |
| **I** | **Ngay Mo** | | Date | Ngay mo vi tense. |
| **J** | **Gio Mo** | | Time | Gio mo vi the. |
| **K** | **Ngay Dong** | | Date | Bo trong neu lenh dang mo. |
| **L** | **Gio Dong** | | Time | Bo trong neu lenh dang mo. |
| **M** | **So Ngay** | `[AUTO]` | Formula | Ngay Dong - Ngay Mo. |
| **N** | **Khoi Luong** | | Number | So luong hop dong hoac co phieu. |
| **O** | **Gia Vao** | | Number | Gia mo vi the. |
| **P** | **Gia Dong** | | Number | Gia dong vi the. |
| **Q** | **Cat Lo (SL)** | | Number | Muc dung lo. |
| **R** | **Chot Loi (TP)** | | Number | Muc chot loi. |
| **S** | **Bien Do** | `[AUTO]` | Formula | Chenh lech gia theo chieu vi the. |
| **T** | **Lai/Lo Gop** | `[AUTO]` | Formula | Lai/lo truoc phi thue. |
| **U** | **Phi & Thue** | `[AUTO]` | Formula | Phi va thue theo `FEE_PROFILE`, fallback ve `CONFIG` neu chua co profile. |
| **V** | **Lai/Lo Rong** | `[AUTO]` | Formula | Lai/Lo Gop - Phi & Thue. |
| **W** | **Tam Ly** | | Dropdown | Nguon tu `FORMULAS!D:D`. |
| **X** | **Ghi Chu Review** | | Text | Ghi chu review lenh. |
| **Y** | **Nhom Nganh** | `[AUTO]` | Formula | Map tu `SETUP` theo Ma GD. |

## Cong Thuc Chinh

- `A1`: array formula tinh trang thai.
- `M1`: array formula tinh so ngay nam giu.
- `S1`: array formula tinh bien do theo `LONG/SHORT`.
- `T1`: `MAP/LET` formula tinh lai/lo gop theo he so trong `FEE_PROFILE` tai ngay dong lenh; tài khoản trống/`Tất cả` sẽ fallback về profile mặc định.
- `U1`: `MAP/LET` formula tinh phi & thue theo tai khoan + tai san + ngay hieu luc trong `FEE_PROFILE`; ưu tiên tài khoản cụ thể, sau đó tới dòng mặc định trống/`*`/`Tất cả`.
- `V1`: array formula tinh lai/lo rong.
- `Y2`: array formula map nhom nganh tu `SETUP`.

## Data Validation

- `B`: tai khoan tu `FORMULAS!I:I`.
- `D`: `Co phieu`, `Phai sinh` (live values have Vietnamese accents).
- `E`: ma giao dich theo matrix `FORMULAS!M:ZZ`.
- `F`: `LONG`, `SHORT`.
- `G`: loai lenh tu `FORMULAS!E:E`.
- `H`: chien luoc tu `FORMULAS!C:C`.
- `I`, `K`: ngay hop le.
- `W`: tam ly tu `FORMULAS!D:D`.

## Luu Y Dashboard

- Dashboard doc `JOURNAL!A1:Y2000`, khong can cot `Z:AH`.
- Neu muon hien thi co phieu bang `Mua/Ban`, hay mapping UI tu `LONG/SHORT`; khong doi du lieu goc neu chua thong nhat validation.
