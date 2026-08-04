// Fixture cố ý BẨN cho eval 2 (diagnose-ugly-ui) — chứa đúng các vi phạm mà 06 §2 phải bắt:
// spacing ngoài thang, màu hard-code, 2 primary button, title lệch casing/ngữ pháp,
// font trendy bị cấm, subtitle thuyết minh kiểu AI, table không có tabular-nums.
export default function Dashboard() {
  return (
    <div className="p-[13px]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <h1 className="text-[22px] mb-[7px]">Quản Lý Đơn Hàng</h1>
      <p className="text-sm text-gray-500">
        Đây là trang tổng quan giúp bạn theo dõi toàn bộ hoạt động kinh doanh của mình một cách dễ dàng.
      </p>
      <div className="flex gap-[11px]">
        <button className="bg-[#7c3aed] text-white px-4 py-2 rounded">Tạo đơn mới</button>
        <button className="bg-[#7c3aed] text-white px-4 py-2 rounded">Xuất báo cáo</button>
        <button className="border px-4 py-2 rounded">xem thêm</button>
        <button className="border px-4 py-2 rounded">Cài đặt hệ thống nâng cao</button>
      </div>
      <div className="grid grid-cols-4 gap-[18px] mt-[27px]">
        <div className="border rounded p-3">
          <div>Doanh thu hôm nay</div>
          <div className="text-lg">12345678</div>
        </div>
        <div className="border rounded p-3">
          <div>ĐƠN CHỜ DUYỆT</div>
          <div className="text-lg">7</div>
        </div>
      </div>
      <table className="mt-[19px] w-full">
        <thead><tr><th>Mã đơn</th><th>Khách</th><th>Tổng tiền</th></tr></thead>
        <tbody>
          <tr><td>DH-001</td><td>Nguyễn Văn A</td><td>1200000</td></tr>
          <tr><td>DH-002</td><td>Trần B</td><td>350000</td></tr>
        </tbody>
      </table>
    </div>
  );
}
