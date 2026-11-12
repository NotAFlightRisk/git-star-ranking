import { goto } from '$app/navigation';
import { page } from '$app/state';
import { untrack } from 'svelte';

const PAUSE = 400;

/** A builder's image once typing or a colour drag settles, so each pause costs one fetch. The
 * address follows, so the page can be shared or come back to as it was left */
export function settled<T>(image: () => T, address: () => string) {
  let current = $state(untrack(image));
  $effect(() => {
    const [next, here] = [image(), address()];
    const wait = setTimeout(() => {
      current = next;
      const url = here ? `?${here}` : page.url.pathname;
      goto(url, { state: page.state, shallow: true, replace: true });
    }, PAUSE);
    return () => clearTimeout(wait);
  });
  return {
    get current() {
      return current;
    }
  };
}
