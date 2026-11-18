import { Alert, Platform } from 'react-native';

type Btn = { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void };

/**
 * Alert.alert no hace nada en la vista previa web, así que allí se usan
 * los diálogos del navegador. En el celular se usa el diálogo nativo.
 */
export function showAlert(title: string, message?: string, buttons?: Btn[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  const text = message ? `${title}\n\n${message}` : title;
  const action = buttons?.find((b) => b.style !== 'cancel');
  if (buttons && buttons.length > 1 && action) {
    if (window.confirm(text)) action.onPress?.();
  } else {
    window.alert(text);
    buttons?.[0]?.onPress?.();
  }
}
