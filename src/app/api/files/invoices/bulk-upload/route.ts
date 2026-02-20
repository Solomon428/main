import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const formData = await req.formData();

  const files = formData.getAll("invoices");
  const supplierId = formData.get("supplierId")?.toString() ?? null;
  const autoProcess =
    (formData.get("autoProcess")?.toString() ?? "true") !== "false";
  const extractionMethod =
    formData.get("extractionMethod")?.toString() ?? "ocr";

  const uploaded = files
    .filter((f): f is File => f instanceof File)
    .map((f) => ({ name: f.name, type: f.type, size: f.size }));

  return NextResponse.json({
    ok: true,
    supplierId,
    autoProcess,
    extractionMethod,
    count: uploaded.length,
    files: uploaded,
  });
}
