// Firebase de imitación para las pruebas: la app de GrowFolio carga estos tres módulos en vez de los de gstatic.
// Todo vive en localStorage del navegador de la prueba, así que cada contexto de Playwright empieza de cero.
export function initializeApp(cfg) { return { options: cfg || {}, name: '[DEFAULT]' }; }
