import { BookOpen, CircleHelp, ExternalLink, FileSpreadsheet, KeyRound, Palette, ReceiptText, Settings, ShieldAlert, Table2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../context.tsx';
import { Card } from '../components/ui/Card.tsx';
import { buildSheetUrl } from '../lib/utils.ts';

type GuideTab = 'setup' | 'journal' | 'fee' | 'risk' | 'support';

const GUIDE_TABS: { key: GuideTab; label: string }[] = [
    { key: 'setup', label: 'Kết nối' },
    { key: 'journal', label: 'Nhật ký' },
    { key: 'fee', label: 'Fee' },
    { key: 'risk', label: 'Rủi ro' },
    { key: 'support', label: 'Hỗ trợ' },
];

const GUIDE_CONTENT: Record<GuideTab, { title: string; desc: string; items: { icon: typeof FileSpreadsheet; title: string; detail: string; sheetRange: string; bullets?: string[] }[] }> = {
    setup: {
        title: 'Kết nối dữ liệu',
        desc: 'Bước đầu để dashboard đọc đúng Sheet.',
        items: [
            { icon: FileSpreadsheet, title: '1. Nhập Sheet ID', detail: 'Vào Cài đặt rồi dán Sheet ID. Có API Key thì app đọc trực tiếp, không có thì dùng proxy server.', sheetRange: 'CONFIG!A1:K10' },
            {
                icon: Settings,
                title: '2. Chọn chế độ dữ liệu',
                detail: 'Demo mode dùng dữ liệu mẫu. Tắt demo để đọc dữ liệu thật từ Google Sheet.',
                sheetRange: 'CONFIG!A1:K10',
                bullets: [
                    'Sheet ID là chuỗi nằm giữa /d/ và /edit trong link Google Sheet.',
                    'API Key dùng khi sheet public hoặc đã cấu hình quyền đọc qua Google Sheets API.',
                    'Demo mode chỉ để xem giao diện, không phản ánh dữ liệu thật.',
                ],
            },
        ],
    },
    journal: {
        title: 'Nhật ký giao dịch',
        desc: 'Mỗi lệnh một dòng. Đây là nguồn chính cho toàn bộ KPI và báo cáo.',
        items: [
            {
                icon: Table2,
                title: '1. Điền đúng cột JOURNAL',
                detail: 'Sheet chính dùng 24 cột từ A đến X. Webapp đọc trực tiếp các cột này.',
                sheetRange: 'JOURNAL!A1:X2000',
                bullets: [
                    'Các cột quan trọng nhất: Status, Account, Asset, Symbol, Side, Strategy, ngày giờ vào/ra, PnL, Mood, Review Note.',
                    'Account là tài khoản giao dịch thực tế như D920568, T271298, T271299.',
                    'Asset là loại tài sản như Cổ phiếu hoặc Phái sinh.',
                    'Position/Side dùng LONG hoặc SHORT để giữ dữ liệu nhất quán.',
                    'Net PnL là lãi/lỗ ròng sau phí và thuế.',
                ],
            },
            {
                icon: BookOpen,
                title: '2. Ô tối thiểu phải điền khi nhập lệnh mới',
                detail: 'Khi đã nhập mã giao dịch, nên hoàn tất các ô tối thiểu để dashboard đọc đúng và sheet tự báo thiếu dữ liệu.',
                sheetRange: 'JOURNAL!A1:X2000',
                bullets: [
                    'Tối thiểu để mở lệnh: Tài khoản, Tài sản, Mã giao dịch, Vị thế, Ngày mở, Giờ mở, Khối lượng, Giá vào.',
                    'Nếu chốt lệnh thì bổ sung thêm: Ngày đóng, Giờ đóng và Giá đóng.',
                    'Mỗi lệnh chỉ nên nằm trên 1 dòng.',
                    'Ngày nên nhập nhất quán kiểu dd/mm/yyyy.',
                    'Nếu lệnh chưa đóng thì để trạng thái Đang mở, chưa cần chốt PnL cuối.',
                ],
            },
            {
                icon: Palette,
                title: '3. Quy ước màu để nhìn nhanh',
                detail: 'Sheet đã có màu để nhận biết trạng thái và nhắc ô còn thiếu, nên chỉ cần nhìn là biết cần điền gì tiếp.',
                sheetRange: 'JOURNAL!A1:X2000',
                bullets: [
                    'Xanh lá: lệnh thắng, LONG hoặc Net PnL dương.',
                    'Đỏ: lệnh thua, SHORT hoặc Net PnL âm.',
                    'Vàng: lệnh đang mở.',
                    'Xám: lệnh hòa.',
                    'Xanh dương nhạt: ô mở lệnh còn thiếu thông tin bắt buộc sau khi đã nhập mã giao dịch.',
                    'Tím nhạt: đang đóng lệnh nhưng còn thiếu ngày đóng, giờ đóng hoặc giá đóng.',
                ],
            },
            {
                icon: CircleHelp,
                title: '4. Các thuật ngữ hay gặp',
                detail: 'Một số từ dễ nhầm khi mới dùng nhật ký.',
                sheetRange: 'JOURNAL!A1:X2000',
                bullets: [
                    'Gross PnL: lãi/lỗ gộp trước phí.',
                    'Fees & Taxes: phí giao dịch và thuế.',
                    'Net PnL: lãi/lỗ ròng sau khi trừ phí.',
                    'Holding Days: số ngày nắm giữ vị thế.',
                    'Review Note: ghi lại lý do vào lệnh, lỗi sai và bài học rút ra.',
                ],
            },
        ],
    },
    fee: {
        title: 'Fee / chi phí ngoài lệnh',
        desc: 'Phần này nên tách riêng để không bị cộng trùng với phí từng lệnh.',
        items: [
            {
                icon: ReceiptText,
                title: '1. Fee là gì',
                detail: 'Là phí định kỳ, phí dịch vụ, lãi vay, chi phí tài khoản... không nằm trong từng lệnh.',
                sheetRange: 'FEE_CHARGES!A1:L2000',
                bullets: [
                    'Ví dụ: phí nền tảng, phí dữ liệu, phí margin, phí SMS, phí quản lý tài khoản.',
                    'Nếu chi phí đã nằm trực tiếp trong từng lệnh thì không nhập lại ở đây để tránh cộng trùng.',
                ],
            },
            {
                icon: ReceiptText,
                title: '2. Cách nhập fee',
                detail: 'Mỗi khoản phí là 1 dòng riêng để dễ dò soát và lọc theo thời gian hoặc tài khoản.',
                sheetRange: 'FEE_CHARGES!A1:L2000',
                bullets: [
                    'Date: ngày phát sinh phí.',
                    'Account: tài khoản chịu phí.',
                    'Category: nhóm phí như Phí nền tảng, Lãi vay, Phí duy trì.',
                    'Amount: nhập số dương, dashboard sẽ hiểu đây là chi phí.',
                    'Note: ghi chú ngắn để nhớ nguồn gốc khoản phí.',
                ],
            },
            {
                icon: ReceiptText,
                title: '3. Dashboard đọc fee thế nào',
                detail: 'Dashboard cộng toàn bộ amount trong FEE_CHARGES thành tổng phí định kỳ.',
                sheetRange: 'FEE_CHARGES!A1:L2000',
                bullets: [
                    'Overview: nhìn nhanh tổng chi phí vận hành.',
                    'Analytics: so PnL nhóm với chi phí ngoài lệnh.',
                    'Risk: nhắc rằng tài khoản có thể giảm không chỉ vì trade thua mà còn vì phí phát sinh.',
                ],
            },
        ],
    },
    risk: {
        title: 'Rủi ro và kỷ luật',
        desc: 'Dùng để kiểm soát size, mức lỗ và drawdown.',
        items: [
            {
                icon: ShieldAlert,
                title: '1. Max risk/lệnh',
                detail: 'Giới hạn lỗ mỗi lệnh theo tổng vốn cấu hình.',
                sheetRange: 'CONFIG!E1:G7',
                bullets: [
                    'Ví dụ max risk 2% nghĩa là mỗi lệnh chỉ nên chấp nhận rủi ro tối đa 2% tổng vốn.',
                    'Chỉ số này giúp kiểm tra kỷ luật cắt lỗ.',
                ],
            },
            {
                icon: ShieldAlert,
                title: '2. Max drawdown',
                detail: 'Ngưỡng sụt giảm tối đa để biết khi nào nên giảm size hoặc tạm dừng.',
                sheetRange: 'CONFIG!E1:G7',
                bullets: [
                    'Drawdown là mức giảm từ đỉnh vốn xuống đáy gần nhất.',
                    'Nếu vượt ngưỡng, nên giảm size hoặc tạm nghỉ để review hệ thống.',
                ],
            },
        ],
    },
    support: {
        title: 'Hỗ trợ nhanh',
        desc: 'Dùng khi dữ liệu chưa ra đúng hoặc chưa cập nhật.',
        items: [
            {
                icon: KeyRound,
                title: '1. Kiểm tra tài khoản',
                detail: 'Đảm bảo login còn hiệu lực nếu dashboard đang bật auth.',
                sheetRange: 'CONFIG!I1:K5',
                bullets: [
                    'Nếu đăng nhập sai, dashboard có thể không tải dữ liệu thật.',
                    'Khi đổi username hoặc password trong settings, cần đăng nhập lại.',
                ],
            },
            {
                icon: Settings,
                title: '2. Làm mới dữ liệu',
                detail: 'Nếu thấy số cũ, bấm refresh hoặc reload page.',
                sheetRange: 'JOURNAL!A1:X2000',
                bullets: [
                    'Sau khi sửa Sheet, đôi lúc cần refresh để dashboard đọc lại.',
                    'Nếu vẫn không thấy dữ liệu mới, kiểm tra lại Sheet ID, API Key hoặc server proxy.',
                ],
            },
        ],
    },
};

export default function Guide() {
    const { settings } = useApp();
    const [activeTab, setActiveTab] = useState<GuideTab>('setup');
    const content = GUIDE_CONTENT[activeTab];
    const entries = useMemo(() => content.items, [content]);

    return (
        <div className="mx-auto max-w-[980px] space-y-5">
            <Card title="Hướng dẫn sử dụng Dahodo.Journal" subtitle="Chia theo tab con để đọc nhanh đúng việc cần làm.">
                <div className="flex items-start gap-3 rounded-lg bg-[var(--accent-soft)] p-4 text-[13px] text-[var(--muted)]">
                    <BookOpen className="mt-0.5 shrink-0 text-[var(--accent)]" size={18} />
                    <div className="space-y-1">
                        <p className="font-bold text-foreground">Luồng dùng gọn</p>
                        <p>1) Kết nối Sheet → 2) Nhập JOURNAL → 3) Ghi Fee riêng → 4) Xem dashboard → 5) Soi Risk.</p>
                    </div>
                </div>
            </Card>

            <Card>
                <div className="flex flex-wrap gap-2 border-b border-[var(--card-border)] pb-4">
                    {GUIDE_TABS.map((tab) => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`rounded-lg px-4 py-2 text-[12px] font-bold ${activeTab === tab.key ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-soft)] text-[var(--muted)]'}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="mt-4 space-y-3">
                    <h3 className="text-[16px] font-extrabold text-foreground">{content.title}</h3>
                    <p className="type-caption text-[12px]">{content.desc}</p>
                    <div className="space-y-3">
                        {entries.map((item) => (
                            <div key={item.title} className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-soft)] p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex min-w-0 gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--card-elevated)] text-[var(--accent)]"><item.icon size={18} /></div>
                                        <div>
                                            <h4 className="text-[14px] font-extrabold text-foreground">{item.title}</h4>
                                            <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted)]">{item.detail}</p>
                                            {item.bullets && item.bullets.length > 0 ? (
                                                <ul className="mt-2 list-disc space-y-1 pl-4 text-[12px] leading-relaxed text-[var(--muted)]">
                                                    {item.bullets.map((bullet) => (
                                                        <li key={bullet}>{bullet}</li>
                                                    ))}
                                                </ul>
                                            ) : null}
                                            <p className="mt-2 font-mono text-[11px] text-[var(--accent)]">{item.sheetRange}</p>
                                        </div>
                                    </div>
                                    <a href={buildSheetUrl(settings.sheetId, item.sheetRange, settings.journalGid, settings.configGid)} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--card-border)] px-3 py-2 text-[12px] font-bold text-[var(--muted)] hover:border-[var(--accent)]/30 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]">
                                        Mở trên Sheet <ExternalLink size={14} />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>
        </div>
    );
}
