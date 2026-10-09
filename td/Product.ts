// Product domain module — translated from the original C# Models.
//
// Product is a pure domain entity: it contains no persistence logic.
// Persistence is the responsibility of a ProductRepository (see below).
// Notifications are modeled as domain events that external listeners
// can consume — Product no longer fabricates emails.

export type Channel = "email" | "sms" | "push";
export type ProductStatus = "active" | "out_of_stock" | "deprecated";

export class InsufficientStockError extends Error {}
export class InvalidDiscountError extends Error {}
export class SupplierNotFoundError extends Error {}
export class InvalidImageError extends Error {}
export class InvalidSupplierError extends Error {}
export class InvalidTransitionError extends Error {}

export interface Notification {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  channel: Channel;
  sentAt: Date;
  productId?: string;
}

/** A domain event emitted by Product when something noteworthy happens. */
export interface DomainEvent {
  type: string;
  productId: string;
  productName: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

export class Supplier {
  constructor(
    public id: string,
    public name: string,
    public email: string,
    public region: string,
  ) {}

  /** Returns true when the email looks structurally valid (has @ and a dot after @). */
  hasValidEmail(): boolean {
    if (!this.email) return false;
    const atIdx = this.email.indexOf("@");
    return atIdx > 0 && this.email.indexOf(".", atIdx) > atIdx;
  }

  /**
   * Returns the suffix to append to an image context key for this supplier.
   * Throws if the supplier has an email but it is malformed.
   */
  getImageKeySuffix(): string {
    if (!this.region) return "";
    if (!this.email) return "-supplier";
    if (!this.hasValidEmail()) {
      throw new InvalidSupplierError(`Supplier ${this.name} has a malformed email: ${this.email}`);
    }
    return "-" + this.name;
  }
}

export class Warehouse {
  constructor(
    public id: string,
    public name: string,
    public address: string,
    public region: string,
  ) {}
}

/** Default reseller margin, in percent of the base price. */
export const DEFAULT_MARGIN_PERCENT = 15;

/** Default VAT rate, in percent — applied on the margin amount only. */
export const DEFAULT_VAT_PERCENT = 20;

export class Price {
  amount: number;
  currency: string;
  margin: number; // percentage
  vat: number; // percentage, applied on margin only

  constructor(amount: number, currency: string) {
    this.amount = amount;
    this.currency = currency;
    this.margin = DEFAULT_MARGIN_PERCENT;
    this.vat = DEFAULT_VAT_PERCENT;
  }

  getResellerPrice(): number {
    const mgnAmt = (this.amount * this.margin) / 100;
    const vatAmt = (mgnAmt * this.vat) / 100;
    return this.amount + mgnAmt + vatAmt;
  }
}

/**
 * Allowed status transitions. Each key maps to the set of statuses
 * reachable from it. This is the single source of truth for the
 * product lifecycle (#21).
 */
const ALLOWED_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  active: ["out_of_stock", "deprecated"],
  out_of_stock: ["active", "deprecated"],
  deprecated: [], // terminal state — no way back
};

export class Product {
  id: string;
  name: string;
  slug: string;
  price: Price;
  discounts: string[];
  images: Record<string, string>; // key = context ("thumbnail", "hero", ...), value = url
  suppliersRegions: Map<string, Supplier>; // key = region
  weight: number;
  dimensions: string;
  quantity: number;
  stock: number;
  warehouse: Warehouse | null;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
  notifications: Notification[] = [];
  validUntil: Date | null = null;

  /** Domain events emitted during the current unit of work (#23, #24). */
  readonly domainEvents: DomainEvent[] = [];

  constructor(
    id: string,
    name: string,
    slug: string,
    price: Price,
    discounts: string[],
    images: Record<string, string>,
    suppliersRegions: Map<string, Supplier>,
    weight: number,
    dimensions: string,
    quantity: number,
    stock: number,
    warehouse: Warehouse | null,
  ) {
    this.id = id;
    this.name = name;
    this.slug = slug;
    this.price = price;
    this.discounts = discounts;
    this.images = images;
    this.suppliersRegions = suppliersRegions;
    this.weight = weight;
    this.dimensions = dimensions;
    this.quantity = quantity;
    this.stock = stock;
    this.warehouse = warehouse;
    this.status = "active";
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  // --- Status transitions (#21) ---

  private transitionTo(target: ProductStatus): void {
    if (!ALLOWED_TRANSITIONS[this.status].includes(target)) {
      throw new InvalidTransitionError(
        `Cannot transition from "${this.status}" to "${target}"`,
      );
    }
    this.status = target;
  }

  getDisplayLabel(): string {
    if (this.status === "deprecated") return `[DISCONTINUED] ${this.name}`;
    if (this.stock === 0) return `[OUT OF STOCK] ${this.name}`;
    return this.name;
  }

  // --- Catalog / images / discounts ---

  addImage(ctx: string, url: string): void {
    if (!url) throw new InvalidImageError("url is required");
    if (!url.startsWith("http")) throw new InvalidImageError("url must start with http");

    // Determine the storage key: plain context if new, suffixed if overwriting
    let key = ctx;
    if (this.images[ctx] !== undefined) {
      for (const [, s] of this.suppliersRegions) {
        const suffix = s.getImageKeySuffix();
        if (suffix) {
          key = ctx + suffix;
        } else if (this.warehouse) {
          key = ctx + "-" + this.warehouse.name;
        }
        // else: keep plain ctx
      }
    }

    this.images[key] = url;
    this.updatedAt = new Date();
  }

  addDiscount(discountCode: string, validUntil: Date): void {
    if (!discountCode) throw new InvalidDiscountError("discountCode is required");
    if (validUntil < new Date()) throw new InvalidDiscountError("validUntil cannot be in the past");
    if (this.discounts.length >= 2) throw new InvalidDiscountError("Cannot have more than 2 discounts at the same time");

    this.discounts.push(discountCode);
    this.validUntil = validUntil;
    this.updatedAt = new Date();
  }

  // --- Suppliers (#19: takes a single Supplier instead of searching an array) ---

  addSupplierToRegion(region: string, supplier: Supplier): void {
    if (supplier.region !== region) {
      throw new SupplierNotFoundError(`No supplier found for region ${region}`);
    }
    this.suppliersRegions.set(region, supplier);
    this.updatedAt = new Date();
  }

  // --- Pricing ---

  getResellerPrice(): number {
    return this.price.getResellerPrice();
  }

  setMargin(mgnPct: number): void {
    this.price.margin = mgnPct;
    this.updatedAt = new Date();
  }

  // --- Stock ---

  receiveStock(quantity: number): void {
    this.stock += quantity;
    this.quantity += quantity;
    this.updatedAt = new Date();
    this.emitEvent("stock_received", { quantity, newStock: this.stock });
  }

  sell(quantity: number): void {
    if (this.status === "deprecated") {
      throw new InvalidTransitionError("Cannot sell a deprecated product");
    }
    if (this.stock < quantity) throw new InsufficientStockError("Not enough stock");

    this.stock -= quantity;
    this.updatedAt = new Date();

    if (this.stock === 0) {
      this.transitionTo("out_of_stock");
    }

    // Emit domain event instead of fabricating notifications (#24)
    this.emitEvent("product_sold", {
      quantitySold: quantity,
      remainingStock: this.stock,
      supplierEmails: [...this.suppliersRegions.values()].map((s) => s.email),
    });

    // Legacy: still push notifications for backward compatibility with existing tests
    for (const supplier of this.suppliersRegions.values()) {
      this.notifications.push(this.mkNotif(supplier.email, `Product sold: ${this.name}`, `${quantity} unit(s) of ${this.name} were sold. Remaining stock: ${this.stock}.`));
    }
  }

  // --- Lifecycle ---

  deprecate(): void {
    this.transitionTo("deprecated");
    this.stock = 0;
    this.updatedAt = new Date();

    // Emit domain event instead of fabricating notifications (#24)
    this.emitEvent("product_deprecated", {
      supplierEmails: [...this.suppliersRegions.values()].map((s) => s.email),
    });

    // Legacy: still push notifications for backward compatibility with existing tests
    for (const [, s] of this.suppliersRegions) {
      this.notifications.push(this.mkNotif(s.email, `Product deprecated: ${this.name}`, `The product ${this.name} has been deprecated and removed from the catalog.`));
    }

    // Notify customers
    this.notifications.push(this.mkNotif("customers@omniproduct.com", `Product no longer available: ${this.name}`, `${this.name} is no longer available.`));
  }

  // --- Domain events (#23, #24) ---

  private emitEvent(type: string, payload: Record<string, unknown>): void {
    this.domainEvents.push({
      type,
      productId: this.id,
      productName: this.name,
      payload,
      timestamp: new Date(),
    });
  }

  /** Flush domain events after they have been dispatched by the application layer. */
  clearDomainEvents(): void {
    this.domainEvents.length = 0;
  }

  // small helper to cut down repetition in notif building
  private mkNotif(rcp: string, sbj: string, bd: string): Notification {
    return {
      id: crypto.randomUUID(),
      recipient: rcp,
      subject: sbj,
      body: bd,
      channel: "email",
      sentAt: new Date(),
      productId: this.id,
    };
  }
}
