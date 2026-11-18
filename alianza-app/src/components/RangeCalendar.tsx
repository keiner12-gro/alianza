import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { MONTHS, WEEKDAYS_SHORT, fromISO, isBusinessDay, isHoliday, monthMatrix, todayISO } from '../utils/dates';

type Props = {
  start: string | null;
  end: string | null;
  onChange: (start: string | null, end: string | null) => void;
  singleDay?: boolean;
  /** Días que ya tienen una solicitud pendiente o aprobada */
  blocked?: string[];
};

export default function RangeCalendar({ start, end, onChange, singleDay, blocked = [] }: Props) {
  const today = todayISO();
  const initial = fromISO(start ?? today);
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());

  const move = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const press = (iso: string) => {
    if (singleDay) return onChange(iso, iso);
    // Primer toque: inicio. Segundo toque: fin (si es posterior); si no, reinicia.
    if (!start || (start && end && start !== end) || iso < start) return onChange(iso, iso);
    if (start === end && iso === start) return onChange(iso, iso);
    onChange(start, iso);
  };

  const canGoBack = year > fromISO(today).getFullYear() || month > fromISO(today).getMonth();

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Pressable onPress={() => canGoBack && move(-1)} hitSlop={12} style={{ opacity: canGoBack ? 1 : 0.3 }}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={{ fontWeight: '700', fontSize: 16, color: colors.text, textTransform: 'capitalize' }}>
          {MONTHS[month]} {year}
        </Text>
        <Pressable onPress={() => move(1)} hitSlop={12}>
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS_SHORT.map((d, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>{d}</Text>
        ))}
      </View>

      {monthMatrix(year, month).map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row' }}>
          {week.map((iso, di) => {
            if (!iso) return <View key={di} style={{ flex: 1, height: 42 }} />;
            const past = iso < today;
            const business = isBusinessDay(iso);
            const isBlocked = blocked.includes(iso);
            const disabled = past || isBlocked;
            const inRange = start && end && iso >= start && iso <= end;
            const edge = iso === start || iso === end;
            return (
              <Pressable
                key={di}
                disabled={disabled}
                onPress={() => press(iso)}
                style={{
                  flex: 1, height: 42, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: inRange && !edge ? colors.primarySoft : 'transparent',
                  borderTopLeftRadius: iso === start ? 21 : 0, borderBottomLeftRadius: iso === start ? 21 : 0,
                  borderTopRightRadius: iso === end ? 21 : 0, borderBottomRightRadius: iso === end ? 21 : 0,
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: edge ? colors.primary : 'transparent' }}>
                  <Text
                    style={{
                      color: edge ? '#fff' : disabled ? colors.border : !business ? colors.textMuted : colors.text,
                      fontWeight: edge || iso === today ? '800' : '500',
                      textDecorationLine: isBlocked ? 'line-through' : 'none',
                    }}
                  >
                    {fromISO(iso).getDate()}
                  </Text>
                  {isHoliday(iso) && !edge && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.danger, position: 'absolute', bottom: 3 }} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      <View style={{ flexDirection: 'row', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
        <Legend dot={colors.danger} text="Festivo" />
        <Legend dot={colors.textMuted} text="Fin de semana (no cuenta)" />
        {blocked.length > 0 && <Legend dot={colors.border} text="Ya solicitado" />}
      </View>
    </View>
  );
}

function Legend({ dot, text }: { dot: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
      <Text style={{ fontSize: 11, color: colors.textMuted }}>{text}</Text>
    </View>
  );
}
