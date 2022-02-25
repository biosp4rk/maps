export type GameVal = string | { [key: string]: string };

export function getHexVal(val: GameVal, version: string) : number {
  if (typeof val == 'object') {
    val = val[version];
  }
  return parseInt(val as string, 16);
}
