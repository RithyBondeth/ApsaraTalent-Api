export const DATA_IMAGE_PATTERN =
  /^data:image\/(?:png|jpe?g|webp);base64,([a-z0-9+/]+={0,2})$/i;
export const MAX_DECODED_AVATAR_BYTES = 1_100_000;
export const ALLOWED_IMAGE_FORMATS = new Set(['jpeg', 'png', 'webp']);
