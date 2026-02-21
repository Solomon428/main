export default function InvoicePendingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pending Approval</h1>
        <p className="text-gray-600">Invoices awaiting approval</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-500">No invoices pending approval</p>
      </div>
    </div>
  );
}
