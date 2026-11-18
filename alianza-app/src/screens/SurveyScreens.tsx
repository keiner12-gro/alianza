import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { Button, Card, ProgressBar, styles } from '../components/ui';
import { useApp } from '../context/AppContext';
import { climateQuestions } from '../data/mock';

export function SurveysScreen() {
  const { surveys, vote } = useApp();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {surveys.map((s) => {
        const total = s.options.reduce((a, o) => a + o.votes, 0);
        return (
          <Card key={s.id}>
            <Text style={[styles.body, { fontWeight: '700', fontSize: 16 }]}>{s.question}</Text>
            <Text style={[styles.muted, { marginBottom: 12, marginTop: 4 }]}>{s.closes} · {total} votos</Text>
            {s.options.map((o) => {
              const pct = total ? o.votes / total : 0;
              const chosen = s.votedOption === o.id;
              return s.votedOption ? (
                <View key={o.id} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={[styles.body, chosen && { fontWeight: '700', color: colors.primary }]}>{chosen ? '✓ ' : ''}{o.label}</Text>
                    <Text style={styles.muted}>{Math.round(pct * 100)} %</Text>
                  </View>
                  <ProgressBar value={pct} />
                </View>
              ) : (
                <Pressable key={o.id} onPress={() => vote(s.id, o.id)} style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: 8 }}>
                  <Text style={styles.body}>{o.label}</Text>
                </Pressable>
              );
            })}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const faces = ['😞', '😕', '😐', '🙂', '😄'];

export function ClimateScreen() {
  const { climateAnswers, submitClimate } = useApp();
  const [answers, setAnswers] = useState<number[]>(Array(climateQuestions.length).fill(-1));

  if (climateAnswers) {
    const avg = climateAnswers.reduce((a, b) => a + b, 0) / climateAnswers.length;
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        <Ionicons name="checkmark-circle" size={72} color={colors.success} />
        <Text style={[styles.h1, { marginTop: 12 }]}>¡Gracias por responder!</Text>
        <Text style={[styles.muted, { textAlign: 'center', marginTop: 8 }]}>Tus respuestas son anónimas y nos ayudan a mejorar.</Text>
        <Card style={{ marginTop: 24, alignSelf: 'stretch', alignItems: 'center' }}>
          <Text style={styles.muted}>Tu índice de bienestar</Text>
          <Text style={{ fontSize: 48 }}>{faces[Math.round(avg)]}</Text>
          <Text style={[styles.h1, { color: colors.primary }]}>{Math.round(((avg + 1) / 5) * 100)} / 100</Text>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={[styles.muted, { marginBottom: 14 }]}>Diagnóstico rápido y anónimo. Toma menos de 1 minuto.</Text>
      {climateQuestions.map((q, qi) => (
        <Card key={qi}>
          <Text style={[styles.body, { fontWeight: '700', marginBottom: 12 }]}>{q}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {faces.map((f, fi) => (
              <Pressable
                key={fi}
                onPress={() => setAnswers((a) => a.map((v, i) => (i === qi ? fi : v)))}
                style={{ padding: 8, borderRadius: radius.md, backgroundColor: answers[qi] === fi ? colors.primarySoft : 'transparent', borderWidth: 2, borderColor: answers[qi] === fi ? colors.primary : 'transparent' }}
              >
                <Text style={{ fontSize: 30 }}>{f}</Text>
              </Pressable>
            ))}
          </View>
        </Card>
      ))}
      <Button title="Enviar respuestas" disabled={answers.includes(-1)} onPress={() => submitClimate(answers)} />
    </ScrollView>
  );
}
