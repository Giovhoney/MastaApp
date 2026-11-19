export const machines = ['Emba 2', 'TCY', 'Rotary', 'Kopper 66"', 'Kopper 60"'] as const;
export type Machine = (typeof machines)[number];
export function isMachine(value: unknown): value is Machine {
  return typeof value === 'string' && machines.some(machine => machine === value);
}
