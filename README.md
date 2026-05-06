# 📊 KhangHang1 — Hệ Thống Nhật Ký Giao Dịch VN

> Nhật ký giao dịch thông minh cho **Phái sinh (VN30F)** và **Cổ phiếu Việt Nam**, tích hợp tự động hóa nhập liệu qua n8n.

## Tổng quan hệ thống

```
Khách hàng → [Telegram Bot / Email] → n8n Automation → Google Sheets → Dashboard
```

## Cấu trúc thư mục

```
khanghang1/
├── credentials/                    # 🔐 Service Account keys (KHÔNG COMMIT)
│   └── gen-lang-client-*.json
│
├── docs/                           # 📖 Tài liệu dự án
│   └── implementation_plan.md      #    Kế hoạch triển khai chi tiết
│
├── sheets/                         # 📋 Google Sheets Engine
│   ├── templates/                  #    Cấu trúc sheet mẫu (JSON schema)
│   │   ├── phai_sinh.json          #    Schema cho Phái sinh VN30F
│   │   ├── co_phieu.json           #    Schema cho Cổ phiếu VN
│   │   └── config.json             #    Cấu hình phí, thuế, tham số thị trường
│   └── scripts/                    #    Python scripts thao tác Google Sheets
│       ├── setup_sheet.py          #    Tạo/khởi tạo sheet cho khách mới
│       ├── sync_data.py            #    Đồng bộ dữ liệu Sheet ↔ Dashboard
│       └── utils.py                #    Hàm tiện ích (auth, format, validate)
│
├── n8n/                            # ⚙️ Tự động hóa n8n
│   ├── workflows/                  #    File JSON workflow n8n (import trực tiếp)
│   │   ├── telegram_entry.json     #    Workflow: Telegram Bot → Sheet
│   │   ├── email_parser.json       #    Workflow: Email CTCK → Sheet
│   │   └── daily_report.json       #    Workflow: Báo cáo ngày tự động
│   └── parsers/                    #    Logic parse lệnh (dùng trong n8n Code node)
│       ├── parse_derivative.js     #    Parse lệnh Phái sinh từ text
│       ├── parse_stock.js          #    Parse lệnh Cổ phiếu từ text
│       └── parse_broker_email.js   #    Parse email báo khớp từ CTCK
│
├── dashboard/                      # 🖥️ Web Dashboard (Premium UI)
│   ├── index.html                  #    Trang chính — Dashboard tổng quan
│   ├── assets/
│   │   ├── css/
│   │   │   └── style.css           #    Design system (Dark mode, Glassmorphism)
│   │   ├── js/
│   │   │   ├── app.js              #    Logic chính, routing, state
│   │   │   ├── charts.js           #    Biểu đồ (Equity curve, Win rate, PnL)
│   │   │   └── gsheet-api.js       #    Fetch data từ Google Sheets API
│   │   └── img/                    #    Logo, icons, assets
│   └── components/                 #    HTML components (modular)
│       ├── sidebar.html            #    Sidebar navigation
│       ├── kpi-cards.html          #    KPI metrics cards
│       └── trade-table.html        #    Bảng lịch sử giao dịch
│
└── README.md                       # 📝 File này
```

## Tech Stack

| Layer | Công nghệ | Mô tả |
|-------|-----------|-------|
| **Data** | Google Sheets API | Lưu trữ, tính toán công thức |
| **Auth** | Service Account | `qhp-bot@...iam.gserviceaccount.com` |
| **Automation** | n8n | Webhook, Telegram Bot, Email parsing |
| **Frontend** | HTML/CSS/JS | Dashboard Premium (Dark mode) |
| **Charts** | Chart.js / ApexCharts | Biểu đồ tương tác |
| **AI Parse** | Gemini / OpenAI (via n8n) | Trích xuất lệnh từ text tự nhiên |

## Thị trường hỗ trợ

### 🔴 Phái sinh (VN30F)
- Vị thế: Long / Short
- Đơn vị tính: Điểm (1 điểm = 100.000 VNĐ)
- Phí: ~7.700 VNĐ/HĐ/chiều (tùy CTCK)
- Giao dịch T+0

### 🟢 Cổ phiếu Việt Nam
- Vị thế: Mua / Bán
- Đơn vị tính: VNĐ
- Phí: ~0.15% giá trị GD + Thuế bán 0.1%
- Thanh toán T+2
