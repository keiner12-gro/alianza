// Cuentas del MODO DEMOSTRACIÓN: solo funcionan cuando la app no logra conectarse al servidor y
// trabajan con datos de ejemplo guardados en el teléfono. No existen en el servidor real, así que
// esta contraseña no abre nada (es pública a propósito: está en el repositorio).

/** Perfil de acceso: define qué herramientas adicionales ve cada cuenta. */
export type UserRole = 'colaborador' | 'sst' | 'administracion' | 'ti';

export type DemoAccount = { email: string; password: string; personId: string; role: UserRole };

export const demoAccounts: DemoAccount[] = [
  { email: 'demo.colaborador@alianza.demo', password: 'demo1234', personId: 'u1', role: 'colaborador' },
  { email: 'demo.sst@alianza.demo', password: 'demo1234', personId: 'u8', role: 'sst' },
  { email: 'demo.admin@alianza.demo', password: 'demo1234', personId: 'u9', role: 'administracion' },
];

export const roleLabel: Record<UserRole, string> = {
  colaborador: 'Colaborador',
  sst: 'Seguridad y Salud en el Trabajo',
  administracion: 'Administración',
  ti: 'Área de TI',
};
