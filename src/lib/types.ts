export const CATEGORIES = [
  "Ring",
  "Necklace",
  "Bracelet",
  "Earrings",
  "Pendant",
  "Chain",
  "Anklet",
  "Other",
] as const;
export const KARATS = [
  "10K",
  "14K",
  "18K",
  "21K",
  "22K",
  "24K",
  "Other",
] as const;
export type InventoryStatus = "available" | "sold";
export interface InventoryItem {
  id: string;
  barcode: string;
  item_name: string;
  category: string;
  karat: string;
  grams: number;
  description: string | null;
  supplier: string | null;
  design_code: string | null;
  notes: string | null;
  status: InventoryStatus;
  created_at: string;
  updated_at: string;
  sold_at: string | null;
  deleted_at: string | null;
}
export interface InventoryHistory {
  id: string;
  inventory_item_id: string;
  action: string;
  old_data: Partial<InventoryItem> | null;
  new_data: Partial<InventoryItem> | null;
  created_at: string;
}
export interface Stats {
  total_items: number;
  available_items: number;
  sold_items: number;
  available_grams: number;
  sold_grams: number;
  total_grams: number;
}
export interface BreakdownEntry {
  label: string;
  items: number;
  grams: number;
}
export interface Breakdowns {
  categories: BreakdownEntry[];
  karats: BreakdownEntry[];
}
