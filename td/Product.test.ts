// Naming-discovery tests for Product.ts.
//
// These tests are written against the PROPER, non-abbreviated names for
// every constructor parameter and property (the names this file *should*
// use once the abbreviation smell is fixed). They compile today only
// because every access goes through an `as any` cast — that's deliberate:
// the goal is a red assertion with a clear message ("expected product to
// have a property named `name`"), not a red compiler.
//
// If you're a student trying to fix the abbreviation smell: run these
// tests, read the failure messages, and use them as your checklist of
// what each field/param should actually be called.

import { describe, it, expect } from "vitest";

// Product is now a pure domain entity — no Prisma mock needed (#25).

import {
  Product,
  Price,
  Supplier,
  Warehouse,
  InsufficientStockError,
  InvalidDiscountError,
  SupplierNotFoundError,
  InvalidImageError,
  InvalidSupplierError,
  InvalidTransitionError,
  DEFAULT_MARGIN_PERCENT,
  DEFAULT_VAT_PERCENT,
} from "./Product";

function hasProp(obj: unknown, propName: string): boolean {
  return typeof obj === "object" && obj !== null && propName in (obj as object);
}

describe("Price", () => {
  it("exposes proper names: amount, currency, margin, vat", () => {
    const price: any = new Price(100, "EUR");

    expect(hasProp(price, "amount"), "Price should have a property named `amount` (not an abbreviation)").toBe(true);
    expect(price.amount).toBe(100);

    expect(hasProp(price, "currency"), "Price should have a property named `currency` (not an abbreviation)").toBe(true);
    expect(price.currency).toBe("EUR");

    expect(hasProp(price, "margin"), "Price should have a property named `margin` (not an abbreviation)").toBe(true);
    expect(price.margin).toBe(DEFAULT_MARGIN_PERCENT);

    expect(hasProp(price, "vat"), "Price should have a property named `vat`").toBe(true);
    expect(price.vat).toBe(DEFAULT_VAT_PERCENT);
  });
});

describe("Supplier", () => {
  it("maps constructor params to proper names: id, name, email, region", () => {
    const supplier: any = new Supplier("s1", "Acme Corp", "acme@example.com", "EU");

    expect(hasProp(supplier, "id"), "Supplier should have a property named `id`").toBe(true);

    expect(hasProp(supplier, "name"), "Supplier's 2nd constructor param should be exposed as `name` (not an abbreviation)").toBe(true);
    expect(supplier.name).toBe("Acme Corp");

    expect(hasProp(supplier, "email"), "Supplier's 3rd constructor param should be exposed as `email` (not an abbreviation)").toBe(true);
    expect(supplier.email).toBe("acme@example.com");

    expect(hasProp(supplier, "region"), "Supplier's 4th constructor param should be exposed as `region` (not an abbreviation)").toBe(true);
    expect(supplier.region).toBe("EU");
  });
});

describe("Warehouse", () => {
  it("maps constructor params to proper names: id, name, address, region", () => {
    const warehouse: any = new Warehouse("w1", "Main Depot", "1 Dock Rd", "EU");

    expect(hasProp(warehouse, "id"), "Warehouse should have a property named `id`").toBe(true);

    expect(hasProp(warehouse, "name"), "Warehouse's 2nd constructor param should be exposed as `name` (not an abbreviation)").toBe(true);
    expect(warehouse.name).toBe("Main Depot");

    expect(hasProp(warehouse, "address"), "Warehouse's 3rd constructor param should be exposed as `address` (not an abbreviation)").toBe(true);
    expect(warehouse.address).toBe("1 Dock Rd");

    expect(hasProp(warehouse, "region"), "Warehouse's 4th constructor param should be exposed as `region` (not an abbreviation)").toBe(true);
    expect(warehouse.region).toBe("EU");
  });
});

function makeProduct(): any {
  const price = new Price(50, "EUR");
  return new Product(
    "p1",
    "Wireless Mouse",
    "wireless-mouse",
    price,
    ["WELCOME10"],
    { thumbnail: "http://img/thumb.png" },
    new Map(),
    0.2,
    "10x5x3cm",
    100,
    100,
    null,
  );
}

describe("Product", () => {
  it("maps constructor params to proper names", () => {
    const product = makeProduct();

    expect(hasProp(product, "id"), "Product should have a property named `id`").toBe(true);

    expect(hasProp(product, "name"), "2nd constructor param should be exposed as `name` (not an abbreviation)").toBe(true);
    expect(product.name).toBe("Wireless Mouse");

    expect(hasProp(product, "slug"), "3rd constructor param should be exposed as `slug` (not an abbreviation)").toBe(true);
    expect(product.slug).toBe("wireless-mouse");

    expect(hasProp(product, "price"), "Product should have a property named `price`").toBe(true);

    expect(hasProp(product, "discounts"), "5th constructor param should be exposed as `discounts` (not an abbreviation)").toBe(true);
    expect(product.discounts).toEqual(["WELCOME10"]);

    expect(hasProp(product, "images"), "6th constructor param should be exposed as `images` (not an abbreviation)").toBe(true);

    expect(hasProp(product, "suppliersRegions"), "7th constructor param should be exposed as `suppliersRegions` (not an abbreviation)").toBe(true);

    expect(hasProp(product, "weight"), "8th constructor param should be exposed as `weight` (not an abbreviation)").toBe(true);
    expect(product.weight).toBe(0.2);

    expect(hasProp(product, "dimensions"), "9th constructor param should be exposed as `dimensions` (not an abbreviation)").toBe(true);
    expect(product.dimensions).toBe("10x5x3cm");

    expect(hasProp(product, "quantity"), "10th constructor param should be exposed as `quantity` (not an abbreviation)").toBe(true);
    expect(product.quantity).toBe(100);

    expect(hasProp(product, "stock"), "11th constructor param should be exposed as `stock` (not an abbreviation)").toBe(true);
    expect(product.stock).toBe(100);

    expect(hasProp(product, "warehouse"), "12th constructor param should be exposed as `warehouse` (not an abbreviation)").toBe(true);
    expect(product.warehouse).toBe(null);

    expect(hasProp(product, "status"), "Product should have a property named `status` (not an abbreviation)").toBe(true);
    expect(product.status).toBe("active");

    expect(hasProp(product, "notifications"), "Product should have a property named `notifications` (not an abbreviation)").toBe(true);
    expect(product.notifications).toEqual([]);
  });

  it("sell() pushes a notification with proper field names: recipient, subject, body, channel, productId", () => {
    const product = makeProduct();
    product.suppliersRegions.set("EU", new Supplier("s1", "Acme Corp", "acme@example.com", "EU"));

    product.sell(1);

    expect(product.notifications.length, "sell() should push exactly one notification per regional supplier").toBe(1);
    const notification = product.notifications[0];

    expect(hasProp(notification, "recipient"), "Notification should have a property named `recipient` (not an abbreviation)").toBe(true);
    expect(notification.recipient).toBe("acme@example.com");

    expect(hasProp(notification, "subject"), "Notification should have a property named `subject` (not an abbreviation)").toBe(true);
    expect(hasProp(notification, "body"), "Notification should have a property named `body` (not an abbreviation)").toBe(true);

    expect(hasProp(notification, "channel"), "Notification should have a property named `channel` (not an abbreviation)").toBe(true);
    expect(notification.channel).toBe("email");

    expect(hasProp(notification, "productId"), "Notification should have a property named `productId` (not an abbreviation)").toBe(true);
    expect(notification.productId).toBe("p1");
  });
});

// --- Domain behavior ---
//
// The tests above only check naming; these check that the methods actually
// do what they claim, using today's real (abbreviated) typed API rather
// than `as any` casts.

function makeTypedProduct() {
  const price = new Price(50, "EUR");
  return new Product(
    "p1",
    "Wireless Mouse",
    "wireless-mouse",
    price,
    ["WELCOME10"],
    { thumbnail: "http://img/thumb.png" },
    new Map<string, Supplier>(),
    0.2,
    "10x5x3cm",
    100,
    100,
    null,
  );
}

describe("Price.getResellerPrice()", () => {
  it("adds margin then VAT on top of the margin only", () => {
    const price = new Price(100, "EUR");
    price.margin = 10;
    price.vat = 20;

    // margin = 10, vat on margin = 2 -> 100 + 10 + 2
    expect(price.getResellerPrice()).toBe(112);
  });
});

describe("Product.getResellerPrice()", () => {
  it("matches the same margin/VAT formula as Price", () => {
    const product = makeTypedProduct();
    product.price.margin = 10;
    product.price.vat = 20;

    expect(product.getResellerPrice()).toBe(product.price.getResellerPrice());
  });
});

describe("getDisplayLabel()", () => {
  it("prefixes discontinued products", () => {
    const product = makeTypedProduct();
    product.deprecate();

    expect(product.getDisplayLabel()).toBe("[DISCONTINUED] Wireless Mouse");
  });

  it("prefixes out-of-stock products", () => {
    const product = makeTypedProduct();
    product.stock = 0;

    expect(product.getDisplayLabel()).toBe("[OUT OF STOCK] Wireless Mouse");
  });

  it("returns the plain name for an active, in-stock product", () => {
    const product = makeTypedProduct();

    expect(product.getDisplayLabel()).toBe("Wireless Mouse");
  });
});

describe("receiveStock()", () => {
  it("increases both stock and quantity by the received amount", () => {
    const product = makeTypedProduct();
    product.warehouse = new Warehouse("w1", "Main Depot", "1 Dock Rd", "EU");

    product.receiveStock(20);

    expect(product.stock).toBe(120);
    expect(product.quantity).toBe(120);
  });

  it("emits a stock_received domain event", () => {
    const product = makeTypedProduct();

    product.receiveStock(20);

    expect(product.domainEvents.length).toBe(1);
    expect(product.domainEvents[0].type).toBe("stock_received");
    expect(product.domainEvents[0].payload).toEqual({ quantity: 20, newStock: 120 });
  });
});

describe("sell()", () => {
  it("decreases stock by the sold quantity", () => {
    const product = makeTypedProduct();

    product.sell(30);

    expect(product.stock).toBe(70);
  });

  it("flips status to out_of_stock when the last unit is sold", () => {
    const product = makeTypedProduct();

    product.sell(100);

    expect(product.stock).toBe(0);
    expect(product.status).toBe("out_of_stock");
  });

  it("throws when selling more than the available stock", () => {
    const product = makeTypedProduct();

    expect(() => product.sell(101)).toThrow("Not enough stock");
    expect(product.stock).toBe(100);
  });

  it("pushes one notification per regional supplier", () => {
    const product = makeTypedProduct();
    product.suppliersRegions.set("EU", new Supplier("s1", "Acme Corp", "acme@example.com", "EU"));
    product.suppliersRegions.set("US", new Supplier("s2", "Widget Inc", "widget@example.com", "US"));

    product.sell(1);

    expect(product.notifications.length).toBe(2);
  });

  it("throws InvalidTransitionError when selling a deprecated product (#21)", () => {
    const product = makeTypedProduct();
    product.deprecate();

    expect(() => product.sell(1)).toThrow("Cannot sell a deprecated product");
  });
});

describe("deprecate()", () => {
  it("sets status to deprecated and zeroes out stock", () => {
    const product = makeTypedProduct();

    product.deprecate();

    expect(product.status).toBe("deprecated");
    expect(product.stock).toBe(0);
  });

  it("notifies every regional supplier plus a customer-facing notification", () => {
    const product = makeTypedProduct();
    product.suppliersRegions.set("EU", new Supplier("s1", "Acme Corp", "acme@example.com", "EU"));

    product.deprecate();

    // 1 supplier notification + 1 customer notification
    expect(product.notifications.length).toBe(2);
  });

  it("cannot be called twice (deprecated is a terminal state, #21)", () => {
    const product = makeTypedProduct();
    product.deprecate();

    expect(() => product.deprecate()).toThrow(InvalidTransitionError);
  });
});

describe("addDiscount()", () => {
  it("appends the discount code to the discounts list", () => {
    const product = makeTypedProduct();
    const validUntil = new Date(Date.now() + 1000 * 60 * 60 * 24); // +1 day

    product.addDiscount("SUMMER20", validUntil);

    expect(product.discounts).toEqual(["WELCOME10", "SUMMER20"]);
  });

  it("throws when adding a 3rd discount", () => {
    const product = makeTypedProduct();
    const validUntil = new Date(Date.now() + 1000 * 60 * 60 * 24); // +1 day
    product.addDiscount("SUMMER20", validUntil);

    expect(() => product.addDiscount("FALL30", validUntil)).toThrow(
      "Cannot have more than 2 discounts at the same time",
    );
    expect(product.discounts).toEqual(["WELCOME10", "SUMMER20"]);
  });

  it("throws when validUntil is in the past", () => {
    const product = makeTypedProduct();
    const pastDate = new Date(Date.now() - 1000);

    expect(() => product.addDiscount("SUMMER20", pastDate)).toThrow(
      "validUntil cannot be in the past",
    );
  });

  it("accepts a validUntil that is barely in the future", () => {
    const product = makeTypedProduct();
    const barelyFuture = new Date(Date.now() + 1);

    product.addDiscount("SUMMER20", barelyFuture);

    expect(product.validUntil).toBe(barelyFuture);
  });
});

describe("addImage()", () => {
  it("stores the image url under the given context key", () => {
    const product = makeTypedProduct();

    product.addImage("hero", "http://img/hero.png");

    expect(product.images.hero).toBe("http://img/hero.png");
  });

  it("rejects a url that doesn't start with http", () => {
    const product = makeTypedProduct();

    expect(() => product.addImage("hero", "ftp://img/hero.png")).toThrow(
      "url must start with http",
    );
  });

  it("appends the supplier name to the context key when overwriting an existing image", () => {
    const product = makeTypedProduct();
    product.suppliersRegions.set("EU", new Supplier("s1", "Acme Corp", "acme@example.com", "EU"));
    product.addImage("hero", "http://img/hero-v1.png");

    product.addImage("hero", "http://img/hero-v2.png");

    expect(product.images["hero-Acme Corp"]).toBe("http://img/hero-v2.png");
    expect(product.images["hero"]).toBe("http://img/hero-v1.png");
  });

  it("falls back to a generic '-supplier' suffix when the supplier has no email", () => {
    const product = makeTypedProduct();
    product.suppliersRegions.set("EU", new Supplier("s1", "Acme Corp", "", "EU"));
    product.addImage("hero", "http://img/hero-v1.png");

    product.addImage("hero", "http://img/hero-v2.png");

    expect(product.images["hero-supplier"]).toBe("http://img/hero-v2.png");
  });

  it("falls back to the warehouse name when the supplier has an empty region and a warehouse is set", () => {
    const product = makeTypedProduct();
    product.warehouse = new Warehouse("w1", "Main Depot", "1 Dock Rd", "EU");
    product.suppliersRegions.set("EU", new Supplier("s1", "Acme Corp", "acme@example.com", ""));
    product.addImage("hero", "http://img/hero-v1.png");

    product.addImage("hero", "http://img/hero-v2.png");

    expect(product.images["hero-Main Depot"]).toBe("http://img/hero-v2.png");
  });

  it("falls back to the plain context key when the supplier has an empty region and no warehouse is set", () => {
    const product = makeTypedProduct();
    product.suppliersRegions.set("EU", new Supplier("s1", "Acme Corp", "acme@example.com", ""));
    product.addImage("hero", "http://img/hero-v1.png");

    product.addImage("hero", "http://img/hero-v2.png");

    expect(product.images["hero"]).toBe("http://img/hero-v2.png");
  });

  it("falls back to the plain context key when the supplier has no region at all", () => {
    const product = makeTypedProduct();
    product.suppliersRegions.set("key1", new Supplier("s1", "NoRegion Corp", "noregion@example.com", ""));
    product.addImage("hero", "http://img/hero-v1.png");

    product.addImage("hero", "http://img/hero-v2.png");

    expect(product.images["hero"]).toBe("http://img/hero-v2.png");
  });

  it("falls back to warehouse name when supplier has no region and warehouse is set", () => {
    const product = makeTypedProduct();
    product.warehouse = new Warehouse("w1", "Central Hub", "1 Hub St", "UK");
    product.suppliersRegions.set("key1", new Supplier("s1", "NoRegion Corp", "noregion@example.com", ""));
    product.addImage("hero", "http://img/hero-v1.png");

    product.addImage("hero", "http://img/hero-v2.png");

    expect(product.images["hero-Central Hub"]).toBe("http://img/hero-v2.png");
  });

  it("throws when a regional supplier has a malformed email", () => {
    const product = makeTypedProduct();
    product.suppliersRegions.set("EU", new Supplier("s1", "Acme Corp", "not-an-email", "EU"));
    product.addImage("hero", "http://img/hero-v1.png");

    expect(() => product.addImage("hero", "http://img/hero-v2.png")).toThrow(
      "Supplier Acme Corp has a malformed email: not-an-email",
    );
  });
});

describe("addSupplierToRegion()", () => {
  it("assigns the supplier to its region", () => {
    const product = makeTypedProduct();
    const supplier = new Supplier("s1", "Acme Corp", "acme@example.com", "EU");

    product.addSupplierToRegion("EU", supplier);

    expect(product.suppliersRegions.get("EU")).toBe(supplier);
  });

  it("throws when the supplier's region doesn't match", () => {
    const product = makeTypedProduct();
    const supplier = new Supplier("s1", "Acme Corp", "acme@example.com", "EU");

    expect(() => product.addSupplierToRegion("APAC", supplier)).toThrow(
      "No supplier found for region APAC",
    );
  });
});

describe("business errors are typed", () => {
  it("sell() throws InsufficientStockError", () => {
    expect(() => makeTypedProduct().sell(101)).toThrow(InsufficientStockError);
  });

  it("addDiscount() throws InvalidDiscountError for a past date, a missing code and a 3rd discount", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24);

    expect(() => makeTypedProduct().addDiscount("X", new Date(Date.now() - 1000))).toThrow(InvalidDiscountError);
    expect(() => makeTypedProduct().addDiscount("", future)).toThrow(InvalidDiscountError);

    const product = makeTypedProduct();
    product.addDiscount("SUMMER20", future);
    expect(() => product.addDiscount("FALL30", future)).toThrow(InvalidDiscountError);
  });

  it("addSupplierToRegion() throws SupplierNotFoundError", () => {
    const supplier = new Supplier("s1", "Acme Corp", "acme@example.com", "EU");
    expect(() => makeTypedProduct().addSupplierToRegion("APAC", supplier)).toThrow(SupplierNotFoundError);
  });

  it("addImage() throws InvalidImageError for a bad url", () => {
    expect(() => makeTypedProduct().addImage("hero", "ftp://x")).toThrow(InvalidImageError);
    expect(() => makeTypedProduct().addImage("hero", "")).toThrow(InvalidImageError);
  });

  it("addImage() throws InvalidSupplierError for a malformed supplier email", () => {
    const product = makeTypedProduct();
    product.suppliersRegions.set("EU", new Supplier("s1", "Acme Corp", "not-an-email", "EU"));

    expect(() => product.addImage("thumbnail", "http://img/x.png")).toThrow(InvalidSupplierError);
  });
});

describe("setMargin()", () => {
  it("updates the price margin", () => {
    const product = makeTypedProduct();

    product.setMargin(20);

    expect(product.price.margin).toBe(20);
  });
});

describe("status transitions (#21)", () => {
  it("cannot transition from deprecated to active", () => {
    const product = makeTypedProduct();
    product.deprecate();

    expect(() => { (product as any).transitionTo("active"); }).toThrow(InvalidTransitionError);
  });

  it("selling a deprecated product throws InvalidTransitionError", () => {
    const product = makeTypedProduct();
    product.deprecate();

    expect(() => product.sell(1)).toThrow(InvalidTransitionError);
  });
});

describe("domain events (#23, #24)", () => {
  it("sell() emits a product_sold event", () => {
    const product = makeTypedProduct();
    product.sell(5);

    expect(product.domainEvents).toHaveLength(1);
    expect(product.domainEvents[0].type).toBe("product_sold");
    expect(product.domainEvents[0].payload).toMatchObject({ quantitySold: 5, remainingStock: 95 });
  });

  it("deprecate() emits a product_deprecated event", () => {
    const product = makeTypedProduct();
    product.deprecate();

    expect(product.domainEvents).toHaveLength(1);
    expect(product.domainEvents[0].type).toBe("product_deprecated");
  });

  it("clearDomainEvents() empties the event list", () => {
    const product = makeTypedProduct();
    product.sell(1);
    expect(product.domainEvents.length).toBeGreaterThan(0);

    product.clearDomainEvents();

    expect(product.domainEvents).toHaveLength(0);
  });
});
