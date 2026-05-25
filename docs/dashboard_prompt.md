# Prompt goi y nang cap Dashboard

Dung prompt nay cho lan thiet ke/nang cap dashboard tiep theo:

```text
Ban la senior product designer + frontend engineer. Hay nang cap dashboard KhangHang1 Trading Journal theo chuan du lieu Google Sheets tab `JOURNAL`.

Boi canh:
- San pham phuc vu trader Viet Nam giao dich Phai sinh VN30F va Co phieu.
- Dashboard hien la HTML/CSS/JS tinh trong `dashboard/`.
- Du lieu doc tu Google Sheets API range `JOURNAL!A1:Y2000`.
- Cac cot quan trong: Trang Thai, Tai San, Ma GD, Chien Luoc, Vi The, Ngay Mo, Gio Mo, Ngay Dong, Gia Vao, Gia Dong, Lai/Lo Rong, Tam Ly, Ghi Chu Review.

Muc tieu UX/UI:
1. Premium dark dashboard, ro KPI trong 5 giay dau.
2. Uu tien KPI: Net PnL, Equity, Win rate, Profit factor, Max drawdown, Expectancy.
3. Bo loc nhanh theo thoi gian, loai tai san, chien luoc, trang thai, ma GD.
4. Bieu do can co: equity curve, daily PnL, win/loss breakdown, PnL theo chien luoc, PnL theo ma, calendar heatmap.
5. Trang thai loi API phai than thien, co huong dan nhap Sheet ID/API Key.
6. Khong dung framework nang; giu vanilla JS hoac tach module nhe.

Yeu cau ky thuat:
- Khong hardcode Sheet ID/API key trong source.
- Luu settings bang localStorage.
- Parse du lieu robust voi o trong, so co dau `.`/`,`/`VND`, ngay tu Google Sheets.
- Khong render du lieu nguoi dung bang innerHTML neu chua escape/sanitize.
- Thiet ke responsive cho laptop 1366px va mobile.
```
