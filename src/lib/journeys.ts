// User journeys and the workload mix (docs/workload-model.md).
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

import { COUNTRY, THINK } from './config.ts';
import { json, store } from './store.ts';

/** Data discovered in setup() through the API — no IDs are hard-coded. */
export interface TestData {
  products: { handle: string; variantId: string }[];
  catalogSize: number;
}

interface ProductList {
  products: { handle: string; variants?: { id: string }[] }[];
  count: number;
}

export const checkoutDuration = new Trend('checkout_duration', true);
export const ordersPlaced = new Counter('orders_placed');
export const cartErrors = new Rate('cart_errors');

const SEARCH_TERMS = ['qa', 'tee', 'mug', 'shirt', 'sweat', 'pants'];

function think(): void {
  const [min, max] = THINK;
  if (max > 0) sleep(min + Math.random() * (max - min));
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

/** Called once by setup(): finds in-stock QA products and the catalog size. */
export function discover(): TestData {
  const products: TestData['products'] = [];
  for (const handle of ['qa-tee', 'qa-mug']) {
    const res = store.productByHandle(handle);
    const body = json<ProductList>(res);
    const variantId = body.products[0]?.variants?.[0]?.id;
    if (res.status !== 200 || !variantId) throw new Error(`setup: product ${handle} not found (${res.status})`);
    products.push({ handle, variantId });
  }
  const catalogSize = json<ProductList>(store.listProducts(0)).count;
  return { products, catalogSize };
}

export function browse(data: TestData): void {
  group('browse', () => {
    const page = store.listProducts(Math.floor(Math.random() * Math.max(1, data.catalogSize - 12)));
    check(page, { 'catalog 200': (r) => r.status === 200 });
    think();
    const product = store.productByHandle(pick(data.products).handle);
    check(product, { 'product 200': (r) => r.status === 200 });
    think();
  });
}

export function search(): void {
  group('search', () => {
    const res = store.search(pick(SEARCH_TERMS));
    check(res, { 'search 200': (r) => r.status === 200 });
    think();
  });
}

/** Creates a cart with one or two items; returns the cart ID or undefined on failure. */
export function cart(data: TestData): string | undefined {
  let cartId: string | undefined;
  group('cart', () => {
    const created = store.createCart();
    const ok = check(created, { 'cart created': (r) => r.status === 200 });
    cartErrors.add(!ok);
    if (!ok) return;
    cartId = json<{ cart: { id: string } }>(created).cart.id;
    think();
    const added = store.addItem(cartId, pick(data.products).variantId, 1 + Math.floor(Math.random() * 2));
    const addOk = check(added, { 'item added': (r) => r.status === 200 });
    cartErrors.add(!addOk);
    think();
  });
  return cartId;
}

export function checkout(data: TestData): void {
  const cartId = cart(data);
  if (!cartId) return;
  group('checkout', () => {
    const started = Date.now();
    const address = store.setAddress(cartId, `k6-${__VU}-${__ITER}@example.com`, COUNTRY);
    const optionsRes = store.shippingOptions(cartId);
    const option = json<{ shipping_options: { id: string }[] }>(optionsRes).shipping_options[0];
    if (!check(optionsRes, { 'shipping options 200': (r) => r.status === 200 }) || !option) return;
    const shipping = store.addShipping(cartId, option.id);
    const collection = store.paymentCollection(cartId);
    const session = store.paymentSession(
      json<{ payment_collection: { id: string } }>(collection).payment_collection.id,
    );
    const done = store.complete(cartId);
    const placed = check(done, {
      'order placed': (r) => r.status === 200 && json<{ type: string }>(r).type === 'order',
    });
    check([address, shipping, collection, session], {
      'checkout steps 200': (all) => all.every((r) => r.status === 200),
    });
    if (placed) {
      ordersPlaced.add(1);
      checkoutDuration.add(Date.now() - started);
    }
    think();
  });
}

/** Workload mix: browse 60 %, search 15 %, cart 15 %, checkout 10 % (docs/workload-model.md). */
export function shopper(data: TestData): void {
  const r = Math.random();
  if (r < 0.6) browse(data);
  else if (r < 0.75) search();
  else if (r < 0.9) cart(data);
  else checkout(data);
}
