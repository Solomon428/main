export default function InvoicePaidPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paid Invoices</h1>
        <p className="text-gray-600">Successfully paid invoices</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-500">No paid invoices to display</p>
      </div>
    </div>
  );
}
