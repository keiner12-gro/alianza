// Configuración dinámica sobre app.json: permite publicar la versión web en la raíz de un dominio (Vercel)
// o en /alianza (XAMPP). EXPO_BASE_URL vacío o "/" = raíz.
module.exports = ({ config }) => {
  const base = process.env.EXPO_BASE_URL;
  const experiments = { ...(config.experiments ?? {}) };
  if (base !== undefined) {
    if (base === '' || base === '/') delete experiments.baseUrl;
    else experiments.baseUrl = base;
  }
  return { ...config, experiments };
};
