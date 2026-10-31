// Run-time configuration. The runner (scripts/k6.sh) passes values from shop-sut's contract file;
// nothing is hard-coded except defaults for the shop's Docker network.

function required(name: string): string {
  const value = __ENV[name];
  if (!value) {
    throw new Error(`${name} is not set. Run through scripts/k6.sh, which reads ../shop-sut/.generated/sut.env`);
  }
  return value;
}

export const BASE_URL = __ENV.BASE_URL ?? 'http://medusa:9000';
export const PUBLISHABLE_KEY = required('PUBLISHABLE_KEY');
export const REGION_ID = required('REGION_ID');
export const COUNTRY = __ENV.COUNTRY ?? 'dk';

/** Think time between steps of a journey, seconds (min, max). Set THINK=0 to remove it. */
export const THINK: [number, number] = __ENV.THINK === '0' ? [0, 0] : [1, 3];
