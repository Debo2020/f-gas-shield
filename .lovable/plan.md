## Goal

Track F-Gas cylinders by the real-world identifiers suppliers (BOC, Linde, A-Gas, etc.) put on the bottle, so stores can scan/lookup cylinders during receipt, return, and engineer issuance — not just by our internally-generated `CYL-xxx` code.

## New identifier fields on `refrigerant_cylinders`

Add three optional, indexed identifiers alongside the existing `cylinder_code`:

- `manufacturer_serial` (text) — serial stamped/engraved on the collar/shroud
- `supplier_barcode` (text) — barcode/QR sticker value from the supplier
- `rfid_tag` (text) — RFID chip UID

Plus:
- `identifier_source` (enum: `internal | boc | linde | a_gas | other`) to flag where the barcode came from
- Unique index per company on each non-null identifier (a cylinder can't be registered twice in the same company under the same supplier barcode/serial/RFID)

`cylinder_code` remains the internal handle; the new fields are the lookup keys used during check-in/out.

## Cylinder dialog (`CylinderDialog.tsx`)

Add an "Identifiers" section with three inputs (Manufacturer Serial, Supplier Barcode/QR, RFID Tag) plus a "Scan" button next to each that opens the existing camera scanner and writes the decoded value into the field. Supplier dropdown drives `identifier_source`.

## Scanner upgrade (`QRScannerDialog.tsx`)

Currently the "Camera" tab is a placeholder. Replace with real scanning via `html5-qrcode` (already used elsewhere per memory: Systems QR Scanning). The dialog:

1. Decodes QR **and** 1D barcodes (Code128/EAN — what BOC/Linde stickers use).
2. Looks up the scanned value across all four columns: `cylinder_code`, `supplier_barcode`, `manufacturer_serial`, `rfid_tag` — first hit wins.
3. Manual-entry tab gets a "Search by" selector (Any / Internal code / Supplier barcode / Serial / RFID).
4. RFID: no web API for NFC on iOS Safari, so RFID stays manual-entry only with a clear hint. Android Chrome `NDEFReader` is added as a progressive enhancement behind a feature check.

The same dialog is reused by:
- Stores receipt flow (`StockReceiptDialog`) — scan supplier barcode to pre-fill new cylinder
- Stores issuance (`StockIssuanceDialog`) — scan to pick the cylinder instead of using the dropdown
- Engineer check-in/out (`CylinderCheckInOutDialog`)
- Supplier return flow (`CylinderDisposalDialog` for return-to-supplier)

## Movement log

`refrigerant_movements` already stores `cylinder_id` + `cylinder_reference`. Add `identifier_used` (text) + `identifier_type` (text) so the audit trail records *which* identifier the operator scanned (e.g. "BOC barcode 7290..." vs "RFID E2801..."). Useful for chain-of-custody disputes with suppliers.

## Inventory display

- `CylinderInventory` shows supplier barcode as the primary subtitle when present, internal code as secondary.
- Search box on the inventory page matches across all four identifier columns.

## Out of scope (call out to user)

- Physical RFID reader hardware integration (USB/Bluetooth scanners) — covered by manual entry / browser NDEF only.
- Supplier API integration (e.g. pulling cylinder metadata from BOC's database from a scanned barcode) — would need per-supplier credentials.

## Technical details

**Migration** (new columns + indexes + enum):
```sql
CREATE TYPE public.cylinder_identifier_source AS ENUM
  ('internal','boc','linde','a_gas','other');

ALTER TABLE public.refrigerant_cylinders
  ADD COLUMN manufacturer_serial text,
  ADD COLUMN supplier_barcode text,
  ADD COLUMN rfid_tag text,
  ADD COLUMN identifier_source public.cylinder_identifier_source
    NOT NULL DEFAULT 'internal';

CREATE UNIQUE INDEX refrigerant_cylinders_company_serial_uniq
  ON public.refrigerant_cylinders (company_id, manufacturer_serial)
  WHERE manufacturer_serial IS NOT NULL AND is_deleted = false;
-- same pattern for supplier_barcode and rfid_tag

ALTER TABLE public.refrigerant_movements
  ADD COLUMN identifier_used text,
  ADD COLUMN identifier_type text;
```
No RLS changes (existing company-scoped policies cover the new columns).

**Frontend packages**: `html5-qrcode` (already in project per Systems QR Scanning memory) — no new deps.

**Files touched**:
- `supabase/migrations/<new>.sql`
- `src/components/cylinders/CylinderDialog.tsx` — add identifiers section + inline scan
- `src/components/cylinders/QRScannerDialog.tsx` — real html5-qrcode camera + multi-column lookup + identifier-type selector
- `src/components/cylinders/CylinderInventory.tsx` — show supplier barcode, extend search
- `src/components/gas-log/StockReceiptDialog.tsx` — scan-to-receive
- `src/components/gas-log/StockIssuanceDialog.tsx` — scan-to-select
- `src/components/cylinders/CylinderCheckInOutDialog.tsx` — record `identifier_used`/`identifier_type` on movement insert
- `src/components/cylinders/CylinderDisposalDialog.tsx` — same for supplier returns
