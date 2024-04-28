// This file contains methods to help with json serialization+parsing
// because BigInt cannot easily be converted to json
// https://stackoverflow.com/a/77969073/213636

export function bigIntReplacer(key: string, value: any): any {
  if (typeof value === 'bigint') {
    return value.toString() + 'n';
  }
  return value;
}

export function bigIntReviver(key: string, value: any): any {
  if (typeof value === 'string' && /^\d+n$/.test(value)) {
    return BigInt(value.slice(0, -1));
  }
  return value;
}
