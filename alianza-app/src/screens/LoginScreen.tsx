import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../utils/alert';
import { colors } from '../theme';
import { Button, Input, styles } from '../components/ui';
import { useApp } from '../context/AppContext';
import { demoAccounts } from '../data/accounts';
import { useEsEscritorio } from '../utils/layout';
import { ErrorApi, ErrorRed, getServidor, iniciarSesion, setServidor } from '../api/client';

export default function LoginScreen() {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [editandoServidor, setEditandoServidor] = useState(false);
  const [servidor, setServidorTexto] = useState(getServidor());
  const insets = useSafeAreaInsets();
  const escritorio = useEsEscritorio();

  const onLogin = async () => {
    const correo = email.trim().toLowerCase();
    if (!correo || !password) {
      showAlert('Datos incompletos', 'Ingresa tu correo y tu contraseña.');
      return;
    }
    if (editandoServidor) setServidor(servidor);
    setCargando(true);
    try {
      const u = await iniciarSesion(correo, password);
      login({ personId: u.personaId, role: u.rol }, 'servidor');
    } catch (e) {
      if (e instanceof ErrorApi) {
        // El servidor respondió: las credenciales o el permiso no son válidos
        showAlert('No pudimos iniciar sesión', e.message);
      } else if (e instanceof ErrorRed) {
        // Sin servidor: las cuentas de demostración siguen funcionando, con datos solo en este teléfono
        const demo = demoAccounts.find((a) => a.email === correo && a.password === password);
        if (demo) {
          showAlert(
            'Sin conexión con el servidor',
            'Entraste en modo demostración: lo que hagas se guarda solo en este teléfono y no lo verán otros usuarios.',
          );
          login({ personId: demo.personId, role: demo.role }, 'demo');
        } else {
          showAlert('No hay conexión con el servidor', e.message);
          setEditandoServidor(true);
        }
      } else {
        showAlert('No pudimos iniciar sesión', 'Ocurrió un error inesperado. Inténtalo de nuevo.');
      }
    } finally {
      setCargando(false);
    }
  };

  const hero = (
    <>
        <View style={{ width: 84, height: 84, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Ionicons name="people" size={46} color={colors.primary} />
        </View>
        <Text style={{ color: '#fff', fontSize: escritorio ? 44 : 30, fontWeight: '800' }}>Alianza</Text>
        <Text style={{ color: '#E0E7FF', fontSize: escritorio ? 18 : 15, marginTop: 6, textAlign: 'center' }}>
          Tu comunidad digital. Conecta, colabora y crece con tu equipo.
        </Text>
    </>
  );
  const formulario = (
    <>
        <Text style={[styles.h1, { marginBottom: 18 }]}>Iniciar sesión</Text>
        <Input label="Correo corporativo" placeholder="tu@empresa.co" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <Input label="Contraseña" placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} />
        {cargando ? (
          <View style={{ height: 48, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <Button title="Entrar" onPress={onLogin} />
        )}

        <Pressable onPress={() => setEditandoServidor((v) => !v)} style={{ marginTop: 16, alignItems: 'center' }} hitSlop={8}>
          <Text style={[styles.muted, { fontSize: 12 }]}>
            <Ionicons name="server-outline" size={12} color={colors.textMuted} /> Servidor: {editandoServidor ? 'toca para ocultar' : getServidor().replace(/^https?:\/\//, '')}
          </Text>
        </Pressable>
        {editandoServidor && (
          <View style={{ marginTop: 8 }}>
            <Input
              label="Dirección del servidor"
              placeholder="alianza.vercel.app"
              autoCapitalize="none"
              keyboardType="url"
              value={servidor}
              onChangeText={setServidorTexto}
            />
            <Text style={[styles.muted, { fontSize: 11, marginTop: -8 }]}>
              Normalmente ya viene escrita. Si cambió, pide la nueva a quien administra el servidor. (Emulador de Android: 10.0.2.2.)
            </Text>
          </View>
        )}
    </>
  );

  if (escritorio) {
    return (
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={{ flex: 1, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', padding: 48 }}>
          <View style={{ alignItems: 'center', maxWidth: 520 }}>{hero}</View>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 48 }}>
          <View style={{ width: '100%', maxWidth: 420 }}>{formulario}</View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.primary }}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>{hero}</View>
        <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 24 + insets.bottom }}>
          {formulario}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
