function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadClientTemplate() {
  const content = `name,contact_name,contact_email,contact_phone,address,notes
ABC Retail Ltd,John Smith,john@abcretail.com,+44 7700 900000,"123 High Street, London, SW1A 1AA",Key account
XYZ Properties,Jane Doe,jane@xyzproperties.com,+44 7700 900001,"45 Park Lane, Manchester, M1 2AB",`;
  downloadCSV("clients-template.csv", content);
}

export function downloadSupplierTemplate() {
  const content = `name,contact_name,contact_email,contact_phone,address,account_number,notes
Refrigerant Supplies Ltd,Bob Wilson,bob@refsupplies.com,+44 1234 567890,"Unit 5 Industrial Estate, Birmingham, B1 1AA",ACC-001,Primary supplier
Gas Parts Direct,Sarah Jones,sarah@gasparts.com,+44 1234 567891,"10 Commerce Road, Leeds, LS1 1AB",ACC-002,`;
  downloadCSV("suppliers-template.csv", content);
}

export const CLIENT_HEADERS = ["name", "contact_name", "contact_email", "contact_phone", "address", "notes"] as const;
export const SUPPLIER_HEADERS = ["name", "contact_name", "contact_email", "contact_phone", "address", "account_number", "notes"] as const;
