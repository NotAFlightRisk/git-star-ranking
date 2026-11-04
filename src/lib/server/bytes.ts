const encoder = new TextEncoder();

export const utf8 = (text: string) => encoder.encode(text);

export const base64url = (data: ArrayBuffer | Uint8Array | string) =>
  btoa(typeof data === 'string' ? data : String.fromCharCode(...new Uint8Array(data)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');

export const unbase64url = (text: string) =>
  Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), (char) =>
    char.charCodeAt(0)
  );
