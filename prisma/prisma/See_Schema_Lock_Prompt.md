# 🔒 CREDITORFLOW PRISMA SCHEMA INTEGRITY ENFORCER

## SOURCE OF TRUTH (LOCKED)
The file `prisma/schema.prisma` is the **sole, authoritative source of truth**.
It is **LOCKED** and may not be modified, reformatted, reordered, regenerated, truncated, or "simplified".

## HARD CONSTRAINTS (NON-NEGOTIABLE)
1. **NO SCHEMA MODIFICATIONS:**
   - Do NOT invent, remove, rename, or "improve" models, enums, fields, relations, `@@map`, `@@index`, `@@unique`, datasource, generator, `previewFeatures`, or extensions.
   - Do NOT introduce polymorphic relations that Prisma cannot enforce with foreign keys (e.g., `entityType` + `entityId` masquerading as a relation).
   - Do NOT require new non-null fields without defaults unless you also update seed logic to provide values.

2. **STRICT COMPLIANCE:**
   - Validate compatibility of any proposed code with the locked schema (types, required fields, relations, enums).
   - Reference enum values exactly as defined (case-sensitive).
   - Ensure seed/scripts provide every required field OR the schema has a default.
   - Flag any schema feature that Prisma cannot represent and propose an implementation workaround WITHOUT changing the schema unless explicitly authorized.

## OUTPUT RULES
- **Code Generation:** Generate ONLY code that compiles against the locked Prisma client.
- **Diagnostics:** Identify the exact field/model causing the issue and the exact fix in code/config (not schema edits).
- **Schema Changes:** If a request requires a schema change, **STOP** and state exactly why, what change is required, and which lines/objects would change — but do NOT change them.

## CONFIRMATION REQUIREMENT
Before proposing any schema change, explicitly ask for permission: 
> "Schema is locked — authorize schema modification? YES/NO"
