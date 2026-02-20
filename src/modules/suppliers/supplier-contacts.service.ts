// ============================================================================
// Supplier Contacts Service
// ============================================================================

import { prisma } from "../../db/prisma";
import { generateId } from "../../utils/ids";
import { info, error } from "../../observability/logger";

interface AddContactInput {
  supplierId: string;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  department?: string;
  isPrimary: boolean;
}

interface UpdateContactInput {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  department?: string;
  isPrimary?: boolean;
  isActive?: boolean;
}

/**
 * Add a new contact to a supplier
 */
export async function addContact(
  input: AddContactInput,
): Promise<{ id: string }> {
  try {
    // If this is the primary contact, unset any existing primary
    if (input.isPrimary) {
      await prisma.supplierContact.updateMany({
        where: {
          supplierId: input.supplierId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    const contact = await prisma.supplierContact.create({
      data: {
        id: generateId(),
        supplierId: input.supplierId,
        name: input.name,
        title: input.title,
        email: input.email,
        phone: input.phone,
        mobile: input.mobile,
        department: input.department,
        isPrimary: input.isPrimary,
        isActive: true,
      },
    });

    info("Supplier contact added", {
      contactId: contact.id,
      supplierId: input.supplierId,
      name: input.name,
    });

    return { id: contact.id };
  } catch (err) {
    error("Failed to add supplier contact", {
      error: err instanceof Error ? err.message : "Unknown error",
      supplierId: input.supplierId,
      name: input.name,
    });
    throw err;
  }
}

/**
 * Update an existing contact
 */
export async function updateContact(
  contactId: string,
  input: UpdateContactInput,
): Promise<boolean> {
  try {
    const existingContact = await prisma.supplierContact.findUnique({
      where: { id: contactId },
    });

    if (!existingContact) {
      throw new Error("Contact not found");
    }

    // If setting as primary, unset existing primary
    if (input.isPrimary) {
      await prisma.supplierContact.updateMany({
        where: {
          supplierId: existingContact.supplierId,
          isPrimary: true,
          id: { not: contactId },
        },
        data: {
          isPrimary: false,
        },
      });
    }

    await prisma.supplierContact.update({
      where: { id: contactId },
      data: {
        name: input.name,
        title: input.title,
        email: input.email,
        phone: input.phone,
        mobile: input.mobile,
        department: input.department,
        isPrimary: input.isPrimary,
        isActive: input.isActive,
      },
    });

    info("Supplier contact updated", { contactId });

    return true;
  } catch (err) {
    error("Failed to update supplier contact", {
      error: err instanceof Error ? err.message : "Unknown error",
      contactId,
    });
    throw err;
  }
}

/**
 * Remove a contact (soft delete)
 */
export async function removeContact(contactId: string): Promise<boolean> {
  try {
    await prisma.supplierContact.update({
      where: { id: contactId },
      data: {
        isActive: false,
      },
    });

    info("Supplier contact removed", { contactId });

    return true;
  } catch (err) {
    error("Failed to remove supplier contact", {
      error: err instanceof Error ? err.message : "Unknown error",
      contactId,
    });
    throw err;
  }
}

/**
 * List all contacts for a supplier
 */
export async function listContacts(
  supplierId: string,
  includeInactive: boolean = false,
) {
  try {
    const contacts = await prisma.supplierContact.findMany({
      where: {
        supplierId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
    });

    return contacts;
  } catch (err) {
    error("Failed to list supplier contacts", {
      error: err instanceof Error ? err.message : "Unknown error",
      supplierId,
    });
    throw err;
  }
}

/**
 * Get primary contact for a supplier
 */
export async function getPrimaryContact(supplierId: string) {
  try {
    const contact = await prisma.supplierContact.findFirst({
      where: {
        supplierId,
        isPrimary: true,
        isActive: true,
      },
    });

    return contact;
  } catch (err) {
    error("Failed to get primary contact", {
      error: err instanceof Error ? err.message : "Unknown error",
      supplierId,
    });
    throw err;
  }
}

/**
 * Set a contact as primary
 */
export async function setPrimaryContact(contactId: string): Promise<boolean> {
  try {
    const contact = await prisma.supplierContact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      throw new Error("Contact not found");
    }

    // Unset existing primary
    await prisma.supplierContact.updateMany({
      where: {
        supplierId: contact.supplierId,
        isPrimary: true,
      },
      data: {
        isPrimary: false,
      },
    });

    // Set new primary
    await prisma.supplierContact.update({
      where: { id: contactId },
      data: {
        isPrimary: true,
      },
    });

    info("Primary contact set", { contactId, supplierId: contact.supplierId });

    return true;
  } catch (err) {
    error("Failed to set primary contact", {
      error: err instanceof Error ? err.message : "Unknown error",
      contactId,
    });
    throw err;
  }
}

export default {
  addContact,
  updateContact,
  removeContact,
  listContacts,
  getPrimaryContact,
  setPrimaryContact,
};
