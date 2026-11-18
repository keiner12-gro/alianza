import React from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, TextInputProps, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow } from '../theme';
import { people, Person } from '../data/mock';

export const getPerson = (id: string): Person =>
  people.find((p) => p.id === id) ?? { id, name: 'Alianza', role: 'Equipo', area: '', interests: [], color: colors.primary, email: '', birthday: '' };

export function Avatar({ personId, size = 40 }: { personId: string; size?: number }) {
  const p = getPerson(personId);
  const initials = p.name.split(' ').map((w) => w[0]).slice(0, 2).join('');
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: p.color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title, onPress, variant = 'primary', icon, disabled,
}: { title: string; onPress: () => void; variant?: 'primary' | 'outline' | 'danger'; icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean }) {
  const bg = variant === 'primary' ? colors.primary : variant === 'danger' ? colors.danger : 'transparent';
  const fg = variant === 'outline' ? colors.primary : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: variant === 'outline' ? colors.primary : bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      {icon && <Ionicons name={icon} size={18} color={fg} style={{ marginRight: 6 }} />}
      <Text style={{ color: fg, fontWeight: '700', fontSize: 15 }}>{title}</Text>
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {props.label && <Text style={styles.label}>{props.label}</Text>}
      <TextInput
        placeholderTextColor={colors.textMuted}
        {...props}
        style={[styles.input, props.multiline && { height: 100, textAlignVertical: 'top' }, props.style]}
      />
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function Badge({ text, color = colors.primary }: { text: string; color?: string }) {
  return (
    <View style={{ backgroundColor: color + '1A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, alignSelf: 'flex-start' }}>
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' }}>
      <View style={{ width: `${Math.round(value * 100)}%`, height: '100%', backgroundColor: colors.success }} />
    </View>
  );
}

export function ListRow({
  icon, title, subtitle, onPress, right, color = colors.primary,
}: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string; onPress?: () => void; right?: React.ReactNode; color?: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={[styles.rowIcon, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress && <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />)}
    </Pressable>
  );
}

export function EmptyState({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ alignItems: 'center', padding: 40 }}>
      <Ionicons name={icon} size={48} color={colors.border} />
      <Text style={[styles.muted, { marginTop: 10, textAlign: 'center' }]}>{text}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginBottom: 12, ...shadow },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, paddingHorizontal: 18, borderRadius: radius.md, borderWidth: 1.5 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text },
  section: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 14, borderRadius: radius.md, marginBottom: 8, gap: 12 },
  rowIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  muted: { color: colors.textMuted, fontSize: 13 },
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 64, width: '100%', maxWidth: 960, alignSelf: 'center' },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text },
  body: { fontSize: 15, color: colors.text, lineHeight: 22 },
});
