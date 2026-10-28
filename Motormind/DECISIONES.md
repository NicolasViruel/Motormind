# Decisiones

**Tiempo que tardé:** 1hora Aprox

## Causa compartida entre dos códigos

Si dos códigos apuntan a la misma causa, la muestro una sola vez con ambos códigos y uso la probabilidad más alta del manual. Así no aumento el valor sin una regla que lo justifique, aunque aparezca en varios códigos.
Por ejemplo si me aparecen 2 fallos P0300 y P0301 de bobina averiada con una probabilidad del 45 y otra del 60% muestro una sola vez la mas alta.

## Otros supuestos

Quito códigos repetidos, espacios al principio y al final, y convierto a mayúsculas. Ordeno los códigos y las causas para que cambiar el orden de entrada no cambie el resultado; si dos causas tienen la misma probabilidad, ordeno por su id.

Los códigos que no encuentro van a notFound. Si no llegan códigos, devuelvo las listas vacías; si el vehículo no existe o codes no es un array de strings, lanzo un error.

Si el manual menciona una causa sin definirla, la salteo y devuelvo las demás para que se pueda seguir usando el diagnóstico. Por ahora, la respuesta no avisa que se descartó esa causa.

Mantengo las probabilidades tal como están en el manual, aunque no sumen 100 %.

Copio los pasos de comprobación para que modificar el resultado no cambie los datos del manual en memoria.


## Dónde se equivocó la IA (o casi)

Al revisar con la IA, se detectó y corrigió que los pasos compartían la misma referencia con el manual. También se reconsideró lanzar un error por una causa faltante y se corrigió un test que esperaba un comportamiento incompatible con esa decisión.

## Qué haría con más tiempo

Con más tiempo, revisaría los datos al cargar el manual para detectar causas faltantes y códigos que quedan iguales al quitar espacios y pasar a mayúsculas. También agregaría un aviso sobre las causas descartadas.
