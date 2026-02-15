import { NextRequest, NextResponse } from "next/server";
import { SupplierService } from "@/lib/services";

const DEFAULT_ORG_ID = "default-org-id";
const DEFAULT_USER_ID = "default-user-id";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const service = new SupplierService({
      userId: DEFAULT_USER_ID,
      organizationId: DEFAULT_ORG_ID,
    });

    const supplier = await service.findById(params.id);

    return NextResponse.json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    console.error("Error fetching supplier:", error);
    if (error instanceof Error && error.message === "Supplier not found") {
      return NextResponse.json(
        { success: false, error: "Supplier not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to fetch supplier" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const service = new SupplierService({
      userId: DEFAULT_USER_ID,
      organizationId: DEFAULT_ORG_ID,
    });

    if (body.status) {
      const supplier = await service.updateStatus(params.id, body.status);
      return NextResponse.json({
        success: true,
        data: supplier,
        message: "Supplier status updated successfully",
      });
    }

    const supplier = await service.update(params.id, body);

    return NextResponse.json({
      success: true,
      data: supplier,
      message: "Supplier updated successfully",
    });
  } catch (error) {
    console.error("Error updating supplier:", error);
    if (error instanceof Error && error.message === "Supplier not found") {
      return NextResponse.json(
        { success: false, error: "Supplier not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to update supplier" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const service = new SupplierService({
      userId: DEFAULT_USER_ID,
      organizationId: DEFAULT_ORG_ID,
    });

    await service.delete(params.id);

    return NextResponse.json({
      success: true,
      message: "Supplier deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    if (error instanceof Error) {
      if (error.message === "Supplier not found") {
        return NextResponse.json(
          { success: false, error: "Supplier not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to delete supplier" },
      { status: 500 }
    );
  }
}
