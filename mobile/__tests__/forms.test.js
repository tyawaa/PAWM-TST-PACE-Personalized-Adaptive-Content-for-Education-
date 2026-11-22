import { validateLogin, validateRegistration, hasErrors } from '../src/utils/validators';

test('username dan password diperiksa sesuai kontrak PACE', () => {
  expect(hasErrors(validateLogin({ username: 'Nama Salah', password: '123' }))).toBe(true);
  expect(hasErrors(validateLogin({ username: 'siswa_demo', password: 'Belajar-123' }))).toBe(false);
});

test('pendaftaran memerlukan nama yang tidak kosong', () => {
  const credentials = { username: 'siswa_demo', password: 'Belajar-123' };
  expect(validateRegistration({ ...credentials, name: '   ' }).name).not.toBeNull();
  expect(hasErrors(validateRegistration({ ...credentials, name: 'Siswa Demo' }))).toBe(false);
});
