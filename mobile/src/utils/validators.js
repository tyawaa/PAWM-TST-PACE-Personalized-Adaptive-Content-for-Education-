/** @typedef {import('../types').Credentials} Credentials */
/** @typedef {import('../types').Registration} Registration */
/** @typedef {import('../types').FormErrors} FormErrors */

/** @param {Credentials} values @returns {FormErrors} */
export function validateLogin(values) {
  return {
    name: null,
    username: /^[a-z0-9_]{3,40}$/.test(values.username)
      ? null
      : 'Gunakan 3–40 huruf kecil, angka, atau underscore.',
    password:
      values.password.length >= 8 && values.password.length <= 128
        ? null
        : 'Password harus 8–128 karakter.',
  };
}

/** @param {Registration} values @returns {FormErrors} */
export function validateRegistration(values) {
  return {
    ...validateLogin(values),
    name:
      values.name.trim().length >= 1 && values.name.length <= 80
        ? null
        : 'Isi nama sepanjang 1–80 karakter.',
  };
}

/** @param {FormErrors} errors @returns {boolean} */
export function hasErrors(errors) {
  return Object.values(errors).some((value) => value !== null);
}
