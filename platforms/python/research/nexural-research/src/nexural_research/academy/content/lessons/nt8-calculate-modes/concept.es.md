# Modos de cálculo

## Objetivos

- Explicar cómo elegir OnBarClose, OnEachTick u OnPriceChange de forma deliberada.
- Producir evidencia reproducible en vez de declarar éxito en un campo JSON.

## Concepto

La automatización es segura solo cuando su comportamiento puede reconstruirse a partir de hechos
ordenados. Este laboratorio modela **modos de cálculo** como una operación explícita en una traza
determinista y solo simulada. El runner controla reloj, semilla, fixture, aserciones e inyección de fallos;
el alumno controla los pasos de implementación.

## Ejercicio

Abre `starter/program.yaml`, reemplaza `TODO` con la operación indicada por la especificación visible y
añade la recuperación exigida por el escenario `latency`. No pegues booleanos esperados: el grader
los ignora y vuelve a ejecutar la fuente.

## Evidencia

Un artefacto válido vincula hash de fuente, operaciones ordenadas, fallo con semilla, aserciones públicas,
controles ocultos y digest final. Compáralo con `expected-trace.json` y explica cualquier diferencia.
