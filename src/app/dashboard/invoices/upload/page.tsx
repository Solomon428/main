export default function InvoiceUploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Invoices</h1>
        <p className="text-gray-600">Upload invoice files for processing</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <div className="space-y-4">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg
                className="h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div className="text-gray-600">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500"
              >
                <span>Upload files</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg"
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">PDF, PNG, JPG up to 10MB</p>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Upload History
          </h3>
          <p className="text-sm text-gray-500">No uploads yet</p>
        </div>
      </div>
    </div>
  );
}
