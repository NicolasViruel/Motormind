# Decisiones

**Tiempo que tardé:** (completar)

## Causa compartida entre dos códigos

Una sola entrada por causa, con la probabilidad máxima que le asigna cualquiera de los códigos y `codes` con todos los códigos que apuntan a ella (ordenados). Elegí el máximo porque usa un número que está en el manual y no asume que los códigos son independientes (P0300 y P0301 suelen venir del mismo fallo físico). Combinar probabilidades (`1 − Π(1 − p)`) sobrestima y satura hacia 1 con 3 o más códigos. El costo: una causa respaldada por dos códigos no sube en el ranking por eso.

## Otros supuestos

- Los códigos se deduplican y se ordenan; los desconocidos van a `notFound` sin error; una lista vacía devuelve una respuesta vacía; un vehículo inexistente lanza error. Los empates de probabilidad se desempatan por `id`.
- Si el manual referencia una causa que no define (`sonda-anterior` en el Tiggo), la omito y devuelvo el resto, porque el manual sale de procesar PDFs y los datos imperfectos son esperables. Límite: el mecánico no ve que se descartó una causa (solo se nota porque las probabilidades de `P0420` suman 0,85).
- Las probabilidades no se normalizan (el `P0300` del Tiggo suma 0,85). El resultado no comparte referencias con el manual (copio los `steps`).
- Normalizo la entrada y también las claves del manual con `trim().toUpperCase()` (el Golf trae `"P0420 "` con un espacio). Si `codes` no es un array de strings lanzo `TypeError`, para que un string suelto no termine en `notFound` en silencio.

## Dónde se equivocó la IA (o casi)

- Propuso omitir la causa faltante; primero la rechacé y pedí un error, y después la IA mostró que con el error `P0420` quedaba inutilizable en el Tiggo, así que volví a omitirla.
- Un test de orden que escribió usaba `P0420` del Tiggo mientras esa decisión era lanzar error: fallaba el test, no el código.
- La primera versión devolvía `steps` por referencia al manual en memoria; una revisión crítica con tests lo detectó y lo corregí.

## Qué haría con más tiempo

Validar el manual al cargarlo (referencias rotas, claves que colisionan al normalizar) en vez de al consultar, y avisar al mecánico de las causas descartadas sin romper el formato de la respuesta.
