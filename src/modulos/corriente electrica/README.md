# Corriente eléctrica — Laboratorio de circuitos DC

Dos módulos: laboratorio libre de circuitos DC y visualizador interactivo de ley de Ohm.

## Estructura

- `fisica/modelos.ts`: componentes, terminales y validación de datos.
- `fisica/redElectrica.ts`: análisis nodal modificado (MNA), fuentes con resistencia interna y cálculo de ramas.
- `fisica/conexiones.ts`: clasificación topológica serie, paralelo, mixto, abierto y puente.
- `fisica/energia.ts`: integral por tramos de potencia disipada por cargas y cables.
- `fisica/persistencia.ts`: JSON versionado validado antes de cargar.
- `fisica/ejemplos.ts`: doce circuitos editables, incluyendo puente resistivo y baterías en serie.
- `controles/useLaboratorio.ts`: estado local inmutable y hasta 50 pasos de deshacer/rehacer.
- `controles/PropiedadesComponente.tsx`: parámetros, instrumentos y pulsador momentáneo.
- `componentes/Laboratorio2D.tsx`: editor SVG, arrastre, terminales, cables, selección, zoom y desplazamiento.
- `componentes/ComponenteElectrico.tsx`: dibujos vectoriales originales e instrumentos.
- `componentes/LeyOhm.tsx`: circuito animado, controles numéricos y deslizantes, gráficas I(V) e I(R).
- `CorrienteElectrica.tsx`: biblioteca, herramientas, persistencia y resultados.

Se conservan los archivos del constructor serie/paralelo anterior y sus pruebas.
El laboratorio principal utiliza la red de terminales y MNA, no el algoritmo del constructor anterior.

## Modelo y alcance

Corriente continua estacionaria. Hasta 80 componentes y 160 cables, con múltiples fuentes y redes de puente.
Cada terminal posee identidad eléctrica; mover o rotar conserva sus conexiones. Cruces geométricos no crean uniones.
Los cables tienen 0.001 Ω, los contactos cerrados 0.001 Ω y los amperímetros 0.01 Ω.
Así se obtienen corrientes determinadas incluso en lazos de cables, sin simular conductores ideales de corriente indefinida.
Las fuentes admiten −240 a +240 V y resistencia interna configurable (mínimo 0.01 Ω).
La ecuación de fuente es Va−Vb−rI=ε, con I positiva de terminal 0 a terminal 1.
Una fuente que entrega energía tiene potencia terminal negativa. Su pérdida interna es rI².
La energía acumulada mostrada corresponde a cargas externas y cables; excluye pérdidas internas de fuentes.
Se integra el tiempo real visible y activo, deteniéndose al pausar, cambiar de módulo o esconder la pestaña.
El modelo DC se recalcula al editar incluso estando la animación pausada. No representa transitorios.

Los voltímetros ideales no cargan la red; entre islas independientes muestran tensión indeterminada.
El multímetro ofrece V y A, sin un modo de resistencia no justificado en circuitos energizados.
Los potenciómetros tienen tres terminales y dos resistencias variables cuya suma permanece constante.
Bombillas: resistencia configurable constante, brillo cualitativo saturado a 5 W, sin modelo térmico.
Pulsadores: contacto cerrado mientras se mantiene pulsado el botón en propiedades.
Las tierras comparten un nodo ideal. Cada isla sin tierra recibe una referencia local; sus potenciales
no se comparan con los de otras islas. Fuente sin corriente, cortocircuito y corrientes elevadas muestran avisos.

El motor monta y resuelve MNA mediante eliminación de Gauss con pivoteo escalado.
Comprueba finitud y residuo del sistema, informa fallos y publica el residuo KCL.
La potencia entregada en terminales de fuentes coincide con la disipada en cargas y cables.
Req externa se muestra para una fuente, incluyendo cables y contactos; a voltaje nulo se usa una fuente de prueba de 1 V.
Con varias fuentes se muestran mediciones por componente y no un cociente V/I global engañoso.

Ohm: fuente ideal, sin la resistencia interna del laboratorio. Controles −24 a +24 V y 1 a 1000 Ω.
I(V): eje V lineal y R fija. I(R): eje R logarítmico, etiquetado, y V fijo.
Ambas gráficas tienen escalas verticales automáticas y punto del estado actual.

## Interacción y tecnologías

Arrastrar desde la biblioteca o pulsar para añadir; arrastrar un cuerpo para moverlo.
Pulsar dos terminales para conectar. Elegir cable y «Reconectar extremo» para cambiar conexiones.
Mayús + clic: selección múltiple; botones para rotar, duplicar o eliminar; tecla Supr para eliminar.
Un interruptor se cambia con un clic en su cuerpo o desde propiedades; arrastrarlo no cambia su estado.
Los pulsadores se accionan manteniendo presionado su cuerpo o el botón de propiedades.
Arrastrar el fondo mueve la vista por defecto. Mayús + arrastre, o el modo «Seleccionar varias»,
permite dibujar un recuadro que selecciona piezas del área y cables con ambos terminales dentro.
«Seleccionar varias» permite alternar piezas sin Mayús y sin accionar los interruptores.
«Quitar selección» está disponible sobre el laboratorio y elimina también cables conectados a piezas eliminadas.
La bombilla usa cristal, reflejos, filamento, casquillo y halo con gradientes SVG únicos por componente.
Su brillo emplea una escala perceptual sqrt(P/5 W); potencias residuales de hasta 1e-12 W no producen luz.
Los puntos de corriente recorren cables y componentes de dos terminales; se apagan con I=0 y respetan pausa y sentido.
Zoom mediante rueda o botones; desplazamiento arrastrando el fondo, mediante modo «Desplazar» o botón central.
En escritorio (desde 1024 px) las propiedades permanecen a la derecha del laboratorio; en móvil se apilan.
El menú de ejemplos usa una lista HTML con colores explícitos, evitando opciones invisibles del selector nativo.
Guardar descarga JSON y conserva copia local; cargar acepta JSON validado. Historial para conexiones y componentes.
Reiniciar pone energía/tiempo a cero; limpiar elimina la red y puede deshacerse.

SVG y React se mantienen por compatibilidad con el proyecto y para evitar dependencias gráficas nuevas.
Los gráficos son vectoriales originales; no se reutilizan recursos de PhET.
Animaciones: corriente de cada cable calculada por MNA; invertir electrones invierte únicamente su dirección visual.
La velocidad gráfica es cualitativa y no una velocidad de deriva. En redes conductoras los pequeños descensos de tensión
son consecuencia explícita de las resistencias de cable/contacto, no errores de las leyes de Kirchhoff.

## Validación

`npm test` incluye las pruebas anteriores y las del motor MNA, energía, clasificación topológica,
ejemplos, instrumentos, corto/abierto, fuentes múltiples, potenciómetro y persistencia.
`fisica/editor.test.cjs` ejercita handlers reales del editor con hooks/DOMPoint simulados: conexión,
arrastre/cancelación, selección múltiple, reconexión, biblioteca, bombillas y visualizador de Ohm.
No son pruebas de navegador y no certifican el aspecto visual ni las APIs de descarga del navegador.
La revisión visual en navegador integrado no pudo completarse por tiempo de espera al acceder a localhost.
