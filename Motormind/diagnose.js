import { readFileSync } from 'node:fs';

const manual = JSON.parse(readFileSync(new URL('./data/manual.json', import.meta.url), 'utf8'));

const normalize = (code) => code.trim().toUpperCase();

/**
 * @param {{ vehicleId: string, codes: string[] }} input
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
export function diagnose({ vehicleId, codes }) {
  const vehicle = manual.vehicles.find((v) => v.id === vehicleId);
  if (!vehicle) throw new Error(`Vehículo no encontrado: ${vehicleId}`);

  if (!Array.isArray(codes) || codes.some((code) => typeof code !== 'string')) {
    throw new TypeError('codes debe ser un array de strings');
  }

  // Manual keys are normalized too: some come with stray whitespace (e.g. "P0420 ")
  const byCode = new Map(Object.entries(vehicle.codes).map(([code, entry]) => [normalize(code), entry]));

  const found = [];
  const notFound = [];
  // Normalized, unique and sorted, so the output only depends on the set of codes, not on their order
  for (const code of [...new Set(codes.map(normalize))].sort()) {
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

  const causes = [...merged.values()]
    // The manual comes from parsed PDFs and may reference causes it never defines: skip those, keep the rest
    .filter(({ id }) => Object.hasOwn(vehicle.causes, id))
    .map(({ id, probability, codes: causeCodes }) => {
      const { title, component, steps } = vehicle.causes[id];
      // Copy the steps so callers cannot mutate the in-memory manual through the result
      return { id, title, component, probability, codes: causeCodes, steps: steps.map((s) => ({ ...s })) };
    })
    .sort((a, b) => b.probability - a.probability || (a.id < b.id ? -1 : 1));

  return { vehicle: vehicle.name, codes: found, notFound, causes };
}
