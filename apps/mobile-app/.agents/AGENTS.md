# Reglas Universales de Desarrollo

Al ejecutar cualquier tarea de análisis, generación de código o refactorización, el asistente **DEBE OBLIGATORIAMENTE**:

1. Garantizar que cada archivo nuevo o editado pase el linter (`npm run lint`) y formatter (`npm run format` / prettier).
2. Mantener la estructura estricta de 4 archivos (Render, Styles, Hook, Tests) por componente o vista.
3. Ejecutar y validar que la **cobertura de pruebas (Coverage)** de la feature afectada se mantenga por encima del 95% (`npm run test -- --coverage`).
4. Cero comentarios ni variables en español