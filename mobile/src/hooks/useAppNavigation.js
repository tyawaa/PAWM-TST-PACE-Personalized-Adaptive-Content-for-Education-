import { useNavigation } from '@react-navigation/native';

/** @returns {import('../types').AppNavigation} */
export function useAppNavigation() {
  return /** @type {import('../types').AppNavigation} */ (useNavigation());
}
