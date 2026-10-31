// Thin Store API client. Every request carries a low-cardinality `name` tag (the route template, not the
// URL with IDs) and a `group` tag, so thresholds and Grafana panels aggregate per endpoint group.
import http, { type RefinedResponse, type ResponseType } from 'k6/http';

import { BASE_URL, PUBLISHABLE_KEY, REGION_ID } from './config.ts';

export type Group = 'catalog' | 'search' | 'cart' | 'checkout';

const headers = { 'x-publishable-api-key': PUBLISHABLE_KEY, 'content-type': 'application/json' };

type Res = RefinedResponse<ResponseType | undefined>;

function get(path: string, name: string, group: Group): Res {
  return http.get(`${BASE_URL}${path}`, { headers, tags: { name, group } });
}

function post(path: string, body: unknown, name: string, group: Group): Res {
  return http.post(`${BASE_URL}${path}`, body === undefined ? null : JSON.stringify(body), {
    headers,
    tags: { name, group },
  });
}

export const store = {
  listProducts: (offset: number) =>
    get(`/store/products?limit=12&offset=${offset}&region_id=${REGION_ID}`, 'GET /store/products', 'catalog'),
  productByHandle: (handle: string) =>
    get(
      `/store/products?handle=${handle}&region_id=${REGION_ID}&fields=*variants.calculated_price`,
      'GET /store/products?handle',
      'catalog',
    ),
  search: (q: string) => get(`/store/products?q=${encodeURIComponent(q)}&limit=12`, 'GET /store/products?q', 'search'),
  createCart: () => post('/store/carts', { region_id: REGION_ID }, 'POST /store/carts', 'cart'),
  addItem: (cartId: string, variantId: string, quantity: number) =>
    post(
      `/store/carts/${cartId}/line-items`,
      { variant_id: variantId, quantity },
      'POST /store/carts/{id}/line-items',
      'cart',
    ),
  getCart: (cartId: string) => get(`/store/carts/${cartId}`, 'GET /store/carts/{id}', 'cart'),
  setAddress: (cartId: string, email: string, country: string) =>
    post(
      `/store/carts/${cartId}`,
      {
        email,
        shipping_address: {
          first_name: 'Load',
          last_name: 'Test',
          address_1: 'Perf Street 1',
          city: 'Copenhagen',
          postal_code: '1000',
          country_code: country,
        },
      },
      'POST /store/carts/{id}',
      'checkout',
    ),
  shippingOptions: (cartId: string) =>
    get(`/store/shipping-options?cart_id=${cartId}`, 'GET /store/shipping-options', 'checkout'),
  addShipping: (cartId: string, optionId: string) =>
    post(
      `/store/carts/${cartId}/shipping-methods`,
      { option_id: optionId },
      'POST /store/carts/{id}/shipping-methods',
      'checkout',
    ),
  paymentCollection: (cartId: string) =>
    post('/store/payment-collections', { cart_id: cartId }, 'POST /store/payment-collections', 'checkout'),
  paymentSession: (collectionId: string) =>
    post(
      `/store/payment-collections/${collectionId}/payment-sessions`,
      { provider_id: 'pp_system_default' },
      'POST /store/payment-collections/{id}/payment-sessions',
      'checkout',
    ),
  complete: (cartId: string) =>
    post(`/store/carts/${cartId}/complete`, undefined, 'POST /store/carts/{id}/complete', 'checkout'),
};

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- deliberate typed view of a JSON body
export function json<T>(res: Res): T {
  return res.json() as unknown as T;
}
