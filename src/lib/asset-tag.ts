/**
 * Generates an alphanumeric asset tag in format: {BRAND}-{YYMM}-{SEQ}
 * Example: DA-2601-005 for 5th Daikin unit in January 2026
 */
export function generateAssetTag(manufacturer: string, sequenceNumber: number): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  
  // Get brand initials (first 2 letters, uppercase)
  const cleanManufacturer = manufacturer.trim();
  const brandInitials = cleanManufacturer.length >= 2 
    ? cleanManufacturer.substring(0, 2).toUpperCase()
    : cleanManufacturer.length === 1 
      ? cleanManufacturer.toUpperCase() + 'X'
      : 'XX';
  
  const sequence = sequenceNumber.toString().padStart(3, '0');
  
  return `${brandInitials}-${year}${month}-${sequence}`;
}
