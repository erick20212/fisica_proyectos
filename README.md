# React + TypeScript + Vite

## Validación del módulo de trayectoria

Ejecutar `npm test`. Las pruebas usan `node:test` y el TypeScript instalado;
no requieren dependencias nuevas ni navegador. El archivo de pruebas está junto
al motor: `src/modulos/electromagnetismo/fisica/trayectoria.test.cjs`.

El motor integra posición y velocidad con RK4 y superposición de Coulomb en SI:
cargas en C (el panel convierte nC), posiciones en m, masa en kg y tiempo en s.
El paso del panel es un **máximo**. Se compara un paso RK4 con dos semipasos
para estimar el error local (diferencia / 15), con tolerancia relativa `1e-10`,
absoluta de posición `1e-11 m` y de velocidad `1e-11 m/s`. Es posible cambiarlas
mediante las propiedades opcionales de `ConfiguracionTrayectoria`.

La proximidad a una fuente limita el desplazamiento por paso para proteger las
etapas RK4 de la singularidad. Se buscan intersecciones en ambos semipasos para
detectar contactos entre muestras y la salida del dominio esférico. Cerca de un
posible contacto se limita también la curvatura del segmento, usando una
resolución espacial objetivo de `1e-8 m`. El estado de contacto se vuelve a
integrar hasta su tiempo estimado. El radio de colisión es un límite de validez
del modelo puntual; no se modelan impactos, rebotes ni fuerzas de contacto.

El diagnóstico de energía mide `max |H(t)-H(0)| / S`, con `H = K + qV` y
`S = K(0) + sum |q V_i(0)|`, para evitar dividir por una energía total que
puede cancelarse. Las pruebas de órbita y atracción hacia una fuente exigen
una variación menor que `1e-6` con esta escala. La tolerancia local no constituye
una garantía de error global para toda configuración: si la carga/masa es
extrema, reducir el paso, comparar convergencia y revisar el diagnóstico.
Se termina explícitamente por duración, colisión, borde, límite de pasos o
imposibilidad de resolver un paso finito. El presupuesto cuenta pasos aceptados
(cada uno guarda dos semipasos); no se prolonga una trayectoria truncada.

Las pruebas cubren equilibrio entre dos cargas iguales, desplazamientos
`X = ±0.5 m`, dipolo y ambos signos de la partícula, neutras y movimiento
uniforme, superposición de 3/5/10 fuentes, movimiento 3D, convergencia de RK4,
energía, contactos entre muestras, finalización e invalidación de reproducción.
Los callbacks reales de `Particula3D` se comprueban sin WebGL: inicio, pausa,
reanudación, reinicio y velocidad visual. La revisión visual se realiza aparte.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
