import { BookOpen, ExternalLink, FileSpreadsheet, KeyRound, Settings, ShieldAlert, Table2 } from 'lucide-react';
import { useApp } from '../context.tsx';
import { Card } from '../components/ui/Card.tsx';

const sections = [
    {
        icon: FileSpreadsheet,
        title: '1. Kết nối dữ liệu Google Sheet',
        detail: 'Vào Cài đặt → Kết nối Google Sheet, nhập Sheet ID. Nếu sheet public có thể thêm API Key; nếu sheet private nên dùng server/service account.',
        sheetRange: 'JOURNAL!A1:X2000',
    },
    {
        icon: Table2,
        title: '2. Nhập nhật ký giao dịch',
        detail: 'Mỗi lệnh nằm trên một dòng trong tab JOURNAL. Dashboard đọc trạng thái, mã, tài sản, vị thế, ngày giờ, giá, khối lượng, PnL, tâm lý và ghi chú review.',
        sheetRange: 'JOURNAL!A2:X2',
    },
    {
        icon: ShieldAlert,
        title: '3. Thiết lập quản trị rủi ro',
        detail: 'Vào Cài đặt → Cấu hình rủi ro để nhập vốn cổ phiếu/phái sinh, risk tối đa/lệnh, max drawdown, mục tiêu tháng và RR tối thiểu. Các thông số tương ứng block CONFIG.',
        sheetRange: 'CONFIG!E1:G7',
    },
    {
        icon: KeyRound,
        title: '4. Quản lý tài khoản đăng nhập',
        detail: 'Vào Cài đặt → Bảo mật & tài khoản để bật/tắt đăng nhập, đổi tên người dùng, mật khẩu và tên khách hàng hiển thị trên sidebar/topbar.',
        sheetRange: 'CONFIG!I1:K5',
    },
    {
        icon: Settings,
        title: '5. Kiểm tra và làm mới dữ liệu',
        detail: 'Sau khi chỉnh Sheet, bấm Kiểm tra trong Cài đặt hoặc refresh trang. Nếu lỗi, dashboard sẽ hiển thị cảnh báo và fallback dữ liệu mẫu.',
        sheetRange: 'JOURNAL!A1:X2000',
    },
];

function rangeToUrl(sheetId: string, range: string) {
    const [sheetName, a1Range] = range.split('!');
    return `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=0&range=${encodeURIComponent(`${sheetName}!${a1Range}`)}`;
}

export default function Guide() {
    const { settings } = useApp();

    return (
        <div className="mx-auto max-w-[980px] space-y-5">
            <Card title="Hướng dẫn sử dụng Dahodo.Journal" subtitle="Các bước vận hành dashboard và nút mở nhanh đúng vùng dữ liệu trên Google Sheet.">
                <div className="flex items-start gap-3 rounded-lg bg-[var(--accent-soft)] p-4 text-[13px] text-[var(--muted)]">
                    <BookOpen className="mt-0.5 shrink-0 text-[var(--accent)]" size={18} />
                    <div className="space-y-1">
                        <p className="font-bold text-foreground">Quy trình khuyến nghị</p>
                        <p>Nhập/cập nhật dữ liệu ở Sheet → kiểm tra cấu hình tại dashboard → dùng Nhật ký, Phân tích, Lịch PnL và Rủi ro để review hiệu suất.</p>
                    </div>
                </div>
            </Card>

            <div className="space-y-3">
                {sections.map((section) => (
                    <div key={section.title}>
                        <Card>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-[var(--accent)]">
                                        <section.icon size={19} />
                                    </div>
                                    <div>
                                        <h3 className="text-[14px] font-extrabold text-foreground">{section.title}</h3>
                                        <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted)]">{section.detail}</p>
                                        <p className="mt-2 font-mono text-[11px] text-[var(--accent)]">{section.sheetRange}</p>
                                    </div>
                                </div>
                                <a
                                    href={rangeToUrl(settings.sheetId, section.sheetRange)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--card-border)] px-3 py-2 text-[12px] font-bold text-[var(--muted)] transition-colors hover:border-[var(--accent)]/30 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                                >
                                    Mở trên Sheet
                                    <ExternalLink size={14} />
                                </a>
                            </div>
                        </Card>
                    </div>
                ))}
            </div>
        </div>
    );
}