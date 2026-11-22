import { render, screen, fireEvent, cleanup } from '@testing-library/react-native';
import { Button } from '../src/components/Ui';

afterEach(cleanup);

test('tombol aksi dapat digunakan dan dinonaktifkan saat diperlukan', async () => {
  let count = 0;
  const onPress = () => {
    count += 1;
  };
  await render(<Button title="Lanjut" onPress={onPress} disabled={false} busy={false} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Lanjut' }));
  expect(count).toBe(1);
  await screen.rerender(<Button title="Lanjut" onPress={onPress} disabled={true} busy={false} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Lanjut' }));
  expect(count).toBe(1);
});
