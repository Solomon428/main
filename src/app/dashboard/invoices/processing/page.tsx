export default function InvoiceProcessingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Processing Queue</h1>
        <p className="text-gray-600">Invoices currently being processed</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-500">No invoices in processing queue</p>
      </div>
    </div>
  );
}
