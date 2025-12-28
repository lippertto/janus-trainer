export enum ConfigKey {
  MAX_COMPENSATION_CENTS_PER_YEAR = 'max-compensation-cents-per-year',
  MAX_TRAININGS_PER_COURSE = 'max-trainings-per-course',
}

export function defaultValueFor(key: ConfigKey): string {
  switch (key) {
    case ConfigKey.MAX_COMPENSATION_CENTS_PER_YEAR:
      return '300000';
    case ConfigKey.MAX_TRAININGS_PER_COURSE:
      return '44';
  }
}

function isPositiveInteger(str: string): boolean {
  const isInteger = /^\d+$/.test(str);
  if (!isInteger) return false;

  const num = parseInt(str, 10);
  return num >= 0 && Number.isFinite(num);
}

export function isValidValueFor(key: ConfigKey, value: string): boolean {
  switch (key) {
    case ConfigKey.MAX_COMPENSATION_CENTS_PER_YEAR:
      return isPositiveInteger(value);
    case ConfigKey.MAX_TRAININGS_PER_COURSE:
      return isPositiveInteger(value);
  }
}
