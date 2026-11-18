import { Platform, useWindowDimensions } from 'react-native';

/** Ancho a partir del cual el navegador usa la versión de computador (menú lateral, columnas). */
export const ANCHO_ESCRITORIO = 900;

/** true en un navegador de pantalla ancha; en el teléfono (app o navegador) siempre es false. */
export function useEsEscritorio() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= ANCHO_ESCRITORIO;
}
