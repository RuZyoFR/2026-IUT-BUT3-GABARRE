// Product domain module — translated from the original C# Models.
//
// NOTE: Product still mixes domain logic and persistence (Prisma calls live
// inside mutators). Price fields (margin, vat) are manipulated in memory and
// then persisted via separate columns (e.g. priceMargin), so the in-memory
// object and the database can diverge if persistence fails. This coupling is
// a known design issue (see smells #22 and #25 in SMELLS-GUIDED-TD-FR.md).

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export type Channel = "email" | "sms" | "push";
export type ProductStatus = "active" | "out_of_stock" | "deprecated";

export class InsufficientStockError extends Error {}
export class InvalidDiscountError extends Error {}
export class SupplierNotFoundError extends Error {}
export class InvalidImageError extends Error {}
export class InvalidSupplierError extends Error {}

export interface Notification {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  channel: Channel;
  sentAt: Date;
  productId?: string;
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

  getDisplayLabel(): string {
    if (this.status === "deprecated") return `[DISCONTINUED] ${this.name}`;
    if (this.stock === 0) return `[OUT OF STOCK] ${this.name}`;
    return this.name;
  }

  // --- Catalog / images / discounts ---

  async addImage(ctx: string, url: string): Promise<void> {
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
    await prisma.product.update({
      where: { id: this.id },
      data: { images: this.images as Prisma.InputJsonValue, updatedAt: this.updatedAt },
    });
  }

  async addDiscount(discountCode: string, validUntil: Date): Promise<void> {
    if (!discountCode) throw new InvalidDiscountError("discountCode is required");
    if (validUntil < new Date()) throw new InvalidDiscountError("validUntil cannot be in the past");
    if (this.discounts.length >= 2) throw new InvalidDiscountError("Cannot have more than 2 discounts at the same time");

    this.discounts.push(discountCode);
    this.validUntil = validUntil;
    this.updatedAt = new Date();
    await prisma.product.update({
      where: { id: this.id },
      data: { discounts: this.discounts, updatedAt: this.updatedAt },
    });
  }

  // --- Suppliers ---

  async addSupplierToRegion(region: string, splrs: Supplier[]): Promise<void> {
    const s = splrs.find((x) => x.region === region);
    if (!s) throw new SupplierNotFoundError(`No supplier found for region ${region}`);

    this.suppliersRegions.set(region, s);
    this.updatedAt = new Date();

    await prisma.productSupplier.upsert({
      where: { productId_region: { productId: this.id, region: region } },
      create: { productId: this.id, region: region, supplierId: s.id },
      update: { supplierId: s.id },
    });
  }

  // --- Pricing ---

  getResellerPrice(): number {
    return this.price.getResellerPrice();
  }

  async setMargin(mgnPct: number): Promise<void> {
    this.price.margin = mgnPct;
    this.updatedAt = new Date();
    await prisma.product.update({
      where: { id: this.id },
      data: { priceMargin: mgnPct, updatedAt: this.updatedAt },
    });
  }

  // --- Stock ---

  async receiveStock(quantity: number): Promise<void> {
    this.stock += quantity;
    this.quantity += quantity;
    this.updatedAt = new Date();
    console.log(`Restocking ${this.name}${this.warehouse ? ` at ${this.warehouse.name}` : ""}`);
    await prisma.product.update({
      where: { id: this.id },
      data: { stock: this.stock, quantity: this.quantity, updatedAt: this.updatedAt },
    });
  }

  async sell(quantity: number): Promise<void> {
    if (this.stock < quantity) throw new InsufficientStockError("Not enough stock");

    this.stock -= quantity;
    this.updatedAt = new Date();

    if (this.stock === 0) {
      this.status = "out_of_stock";
    }

    await prisma.product.update({
      where: { id: this.id },
      data: { stock: this.stock, status: this.status, updatedAt: this.updatedAt },
    });

    // Notify all regional suppliers
    for (const supplier of this.suppliersRegions.values()) {
      this.notifications.push(this.mkNotif(supplier.email, `Product sold: ${this.name}`, `${quantity} unit(s) of ${this.name} were sold. Remaining stock: ${this.stock}.`));
    }
  }

  // --- Lifecycle ---

  async deprecate(): Promise<void> {
    this.status = "deprecated";
    this.stock = 0;
    this.updatedAt = new Date();

    await prisma.product.update({
      where: { id: this.id },
      data: { status: this.status, stock: this.stock, updatedAt: this.updatedAt },
    });

    // Notify all regional suppliers
    for (const [, s] of this.suppliersRegions) {
      this.notifications.push(this.mkNotif(s.email, `Product deprecated: ${this.name}`, `The product ${this.name} has been deprecated and removed from the catalog.`));
    }

    // Notify customers
    this.notifications.push(this.mkNotif("customers@omniproduct.com", `Product no longer available: ${this.name}`, `${this.name} is no longer available.`));
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
