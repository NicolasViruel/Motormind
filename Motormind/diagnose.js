import { readFileSync } from 'node:fs';

const manual = JSON.parse(readFileSync(new URL('./data/manual.json', import.meta.url), 'utf8'));

const normalizeCode = (code) => code.trim().toUpperCase();
const normalizeCauseId = (id) => id.trim().toLowerCase();

/**
 * @param {{ vehicleId: string, codes: string[], discarded?: string[], normalize?: boolean }} input
 * @returns {{
 *   vehicle: string,
 *   codes: { code: string, description: string }[],
 *   notFound: string[],
 *   causes: {
 *     id: string, title: string, component: string, probability: number,
 *     codes: string[], steps: { text: string, expected: string }[]
 *   }[]
 * }}
 */
export function diagnose({ vehicleId, codes, discarded = [], normalize = false }) {
  const vehicle = manual.vehicles.find((v) => v.id === vehicleId);
  if (!vehicle) throw new Error(`Vehículo no encontrado: ${vehicleId}`);

  if (!Array.isArray(codes) || codes.some((code) => typeof code !== 'string')) {
    throw new TypeError('codes debe ser un array de strings');
  }

  if (!Array.isArray(discarded) || discarded.some((id) => typeof id !== 'string')) {
    throw new TypeError('discarded debe ser un array de strings');
  }
  // Causas que el mecánico ya descartó. Los ids desconocidos se ignoran (no hay nada que quitar).
  const discardedSet = new Set(discarded.map(normalizeCauseId));

  // Las claves introducidas manualmente también se normalizan: algunas contienen espacios en blanco adicionales (p. ej., "P0420 ")
  const byCode = new Map(Object.entries(vehicle.codes).map(([code, entry]) => [normalizeCode(code), entry]));

  const found = [];
  const notFound = [];
  // Normalizado, único y ordenado, de modo que el resultado solo depende del conjunto de códigos, no de su orden
  for (const code of [...new Set(codes.map(normalizeCode))].sort()) {
    if (byCode.has(code)) {
      found.push({ code, description: byCode.get(code).description });
    } else {
      notFound.push(code);
    }
  }

  const merged = found.reduce((acc, { code }) => {
    for (const { cause, probability } of byCode.get(code).causes) {
      const entry = acc.get(cause);
      if (!entry) {
        acc.set(cause, { id: cause, probability, codes: [code] });
      } else {
        entry.probability = Math.max(entry.probability, probability);
        entry.codes.push(code);
      }
    }
    return acc;
  }, new Map());

  const remaining = [...merged.values()]
    // El manual proviene de archivos PDF analizados y puede hacer referencia a causas que nunca llega a definir: omítelas y conserva el resto.
    .filter(({ id }) => Object.hasOwn(vehicle.causes, id))
    .filter(({ id }) => !discardedSet.has(id));

  // Opcional: reparte la probabilidad solo entre las causas que quedan, de modo que sumen 1
  const total = remaining.reduce((sum, { probability }) => sum + probability, 0);
  const scale = normalize && total > 0 ? total : 1;

  const causes = remaining
    .map(({ id, probability, codes: causeCodes }) => {
      const { title, component, steps } = vehicle.causes[id];
      // Copia los pasos para que quienes realizan la llamada no puedan modificar el manual en memoria a través del resultado
      return { id, title, component, probability: probability / scale, codes: causeCodes, steps: steps.map((s) => ({ ...s })) };
    })
    .sort((a, b) => b.probability - a.probability || (a.id < b.id ? -1 : 1));

  return { vehicle: vehicle.name, codes: found, notFound, causes };
}
