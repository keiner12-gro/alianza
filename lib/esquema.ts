/**
 * Tablas de Alianza. Todas usan "IF NOT EXISTS", así que ejecutar la instalación varias veces es seguro.
 * No se usan claves foráneas (FOREIGN KEY): así funciona igual en MySQL, MariaDB y cualquier versión de
 * TiDB. Las eliminaciones en cadena (informe -> hallazgos -> fotos) las hace el código en una transacción.
 */
export const ESQUEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS usuarios (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    correo      VARCHAR(190) NOT NULL,
    clave_hash  VARCHAR(255) NOT NULL,
    nombre      VARCHAR(120) NOT NULL,
    cargo       VARCHAR(120) NOT NULL DEFAULT '',
    area        VARCHAR(120) NOT NULL DEFAULT '',
    rol         ENUM('colaborador','sst','administracion','ti') NOT NULL DEFAULT 'colaborador',
    persona_id  VARCHAR(8) NOT NULL DEFAULT 'u1',
    activo      TINYINT(1) NOT NULL DEFAULT 1,
    creado_el   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_usuarios_correo (correo)
  )`,
  `CREATE TABLE IF NOT EXISTS sesiones (
    token_hash  CHAR(64) NOT NULL PRIMARY KEY,
    usuario_id  INT UNSIGNED NOT NULL,
    creada_el   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_el   DATETIME NOT NULL,
    KEY ix_sesiones_expira (expira_el),
    KEY ix_sesiones_usuario (usuario_id)
  )`,
  `CREATE TABLE IF NOT EXISTS intentos_login (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    clave      VARCHAR(255) NOT NULL,
    creado_el  DATETIME NOT NULL,
    KEY ix_intentos_clave (clave, creado_el)
  )`,
  `CREATE TABLE IF NOT EXISTS informes_sst (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    subido_por     INT UNSIGNED NOT NULL,
    archivo        VARCHAR(255) NOT NULL,
    titulo         VARCHAR(255) NOT NULL,
    resumen_excel  TEXT NULL,
    advertencias   TEXT NULL,
    subido_el      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY ix_informes_fecha (subido_el)
  )`,
  `CREATE TABLE IF NOT EXISTS hallazgos_sst (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    informe_id      INT UNSIGNED NOT NULL,
    item            INT NOT NULL,
    fecha           DATE NULL,
    area            VARCHAR(160) NOT NULL,
    novedad         TEXT NOT NULL,
    estado          ENUM('Abierto','En proceso','Cerrado','Cancelado','Sin estado') NOT NULL,
    nota_evidencia  TEXT NULL,
    foto_archivo    VARCHAR(20) NULL,
    UNIQUE KEY uq_hallazgo_item (informe_id, item),
    KEY ix_hallazgos_estado (estado),
    KEY ix_hallazgos_area (area)
  )`,
  // Las fotos viven en la base de datos: las plataformas sin servidor no tienen disco permanente
  `CREATE TABLE IF NOT EXISTS fotos_sst (
    hallazgo_id  INT UNSIGNED NOT NULL PRIMARY KEY,
    tipo         VARCHAR(20) NOT NULL,
    datos        LONGBLOB NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS reportes_ti (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    creado_por      INT UNSIGNED NOT NULL,
    categoria       VARCHAR(40) NOT NULL,
    urgencia        ENUM('Baja','Media','Alta') NOT NULL DEFAULT 'Media',
    asunto          VARCHAR(160) NOT NULL,
    descripcion     TEXT NOT NULL,
    estado          ENUM('Abierto','En proceso','Resuelto') NOT NULL DEFAULT 'Abierto',
    asignado_a      INT UNSIGNED NULL,
    creado_el       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_el  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resuelto_el     DATETIME NULL,
    KEY ix_reportes_estado (estado, urgencia),
    KEY ix_reportes_creador (creado_por)
  )`,
  `CREATE TABLE IF NOT EXISTS reportes_ti_mensajes (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reporte_id  INT UNSIGNED NOT NULL,
    autor_id    INT UNSIGNED NOT NULL,
    texto       TEXT NOT NULL,
    creado_el   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY ix_mensajes_reporte (reporte_id, id)
  )`,
];
