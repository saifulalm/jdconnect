// Common contract every upstream pulsa/PPOB supplier must implement.
// Lets transaction flow stay supplier-agnostic (Digiflazz, IAK, VIP, Mock...).

export type SupplierTopupStatus = 'pending' | 'success' | 'failed';

export interface SupplierPrice {
  sku: string; // supplier SKU code
  name: string;
  category: string; // pulsa | data | pln | game | ewallet
  provider: string; // Telkomsel, XL, ...
  price: number; // modal price from supplier (IDR)
  status: boolean; // seller status (active)
  raw?: Record<string, any>;
}

export interface SupplierTopupResult {
  refId: string; // our reference id sent to supplier
  status: SupplierTopupStatus;
  serial?: string; // SN / token (PLN), receipt
  message?: string;
  supplierTrxId?: string;
  price?: number;
  raw?: Record<string, any>;
}

export interface SupplierAdapter {
  /** Stable identifier persisted on transactions (e.g. "digiflazz", "mock"). */
  readonly name: string;

  /** True when credentials are present and the adapter can hit the real API. */
  isConfigured(): boolean;

  /** Current deposit balance at the supplier (IDR). */
  getBalance(): Promise<number>;

  /** Full price list to sync into local products. */
  getPriceList(): Promise<SupplierPrice[]>;

  /** Execute a top-up. refId must be unique & idempotent per order. */
  topUp(params: { sku: string; customerNo: string; refId: string }): Promise<SupplierTopupResult>;

  /** Poll status of a previously submitted top-up. */
  checkStatus(params: { sku: string; customerNo: string; refId: string }): Promise<SupplierTopupResult>;

  /** Parse + verify an async callback payload from the supplier (optional). */
  parseCallback?(payload: any, signature?: string, rawBody?: Buffer): SupplierTopupResult | null;
}
