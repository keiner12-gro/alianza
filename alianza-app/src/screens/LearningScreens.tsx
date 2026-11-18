import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Button, Card, ProgressBar, styles } from '../components/ui';
import { useApp } from '../context/AppContext';
import { onboardingSteps } from '../data/mock';
import { ScreenProps, useNav } from '../navigation/types';

export function TrainingsScreen() {
  const { trainings } = useApp();
  const nav = useNav();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {trainings.map((t) => {
        const pct = t.completed / t.lessons.length;
        return (
          <Pressable key={t.id} onPress={() => nav.navigate('TrainingDetail', { trainingId: t.id })}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#FCE7F3', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={pct === 1 ? 'trophy' : 'school'} size={24} color="#DB2777" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.body, { fontWeight: '700' }]}>{t.title}</Text>
                  <Text style={styles.muted}>{t.lessons.length} lecciones · {t.duration}</Text>
                </View>
              </View>
              <ProgressBar value={pct} />
              <Text style={[styles.muted, { fontSize: 12, marginTop: 6 }]}>
                {pct === 1 ? '¡Completado! 🎉' : `${t.completed} de ${t.lessons.length} lecciones`}
              </Text>
            </Card>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function TrainingDetailScreen({ route, navigation }: ScreenProps<'TrainingDetail'>) {
  const { trainings, completeLesson } = useApp();
  const t = trainings.find((x) => x.id === route.params.trainingId)!;
  const done = t.completed === t.lessons.length;
  React.useEffect(() => {
    navigation.setOptions({ title: t.title });
  }, [navigation, t.title]);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <ProgressBar value={t.completed / t.lessons.length} />
        <Text style={[styles.muted, { marginTop: 8 }]}>{Math.round((t.completed / t.lessons.length) * 100)} % completado</Text>
      </Card>
      {t.lessons.map((l, i) => {
        const status = i < t.completed ? 'done' : i === t.completed ? 'current' : 'locked';
        return (
          <Card key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: status === 'locked' ? 0.5 : 1 }}>
            <Ionicons
              name={status === 'done' ? 'checkmark-circle' : status === 'current' ? 'play-circle' : 'lock-closed'}
              size={28}
              color={status === 'done' ? colors.success : status === 'current' ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.body, { flex: 1 }]}>Lección {i + 1}: {l}</Text>
          </Card>
        );
      })}
      {!done ? (
        <Button title={`Completar lección ${t.completed + 1}`} icon="play" onPress={() => completeLesson(t.id)} />
      ) : (
        <Text style={[styles.h1, { textAlign: 'center', color: colors.success, marginTop: 10 }]}>🏆 ¡Curso completado!</Text>
      )}
    </ScrollView>
  );
}

export function OnboardingScreen() {
  const { onboardingDone, toggleOnboarding } = useApp();
  const pct = onboardingDone.length / onboardingSteps.length;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={{ backgroundColor: colors.primary }}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>¡Bienvenido al equipo! 🎉</Text>
        <Text style={{ color: '#E0E7FF', marginTop: 4, marginBottom: 12 }}>Completa estos pasos para tu incorporación.</Text>
        <ProgressBar value={pct} />
        <Text style={{ color: '#fff', marginTop: 6, fontSize: 12 }}>{onboardingDone.length} de {onboardingSteps.length} completados</Text>
      </Card>
      {onboardingSteps.map((s) => {
        const done = onboardingDone.includes(s.id);
        return (
          <Pressable key={s.id} onPress={() => toggleOnboarding(s.id)}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={done ? colors.success : colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.body, { fontWeight: '700', textDecorationLine: done ? 'line-through' : 'none' }]}>{s.title}</Text>
                <Text style={styles.muted}>{s.detail}</Text>
              </View>
            </Card>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
