export type GameVal = string | { [key: string]: string };

export function getHexVal(val: GameVal, version: string) : number {
  if (typeof val == 'object') {
    val = val[version];
  }
  return parseInt(val as string, 16);
}

export function getPrimSize(type: string) : number {
  switch (type) {
    case 'u8':
    case 's8':
    case 'flags8':
    case 'bool':
      return 1;
    case 'u16':
    case 's16':
    case 'flags16':
    case 'char':
      return 2
    case 'u32':
    case 's32':
    case 'ptr':
      return 4;
    case 'palette':
      return 32;
    default:
      return NaN;
  }
}

export function getPrimName(type: string) : string {
  switch (type) {
    case 'u8':
      return 'Unsigned 8 bit integer';
    case 's8':
      return 'Signed 8 bit integer';
    case 'flags8':
      return '8 bit integer used for bit flags';
    case 'bool':
      return 'Boolean (0 or 1)';
    case 'u16':
      return 'Unsigned 16 bit integer';
    case 's16':
      return 'Signed 16 bit integer';
    case 'flags16':
      return '16 bit integer used for bit flags';
    case 'u32':
      return 'Unsigned 32 bit integer';
    case 's32':
      return 'Signed 32 bit integer';
    case 'ptr':
      return '32 bit address pointer';
    case 'ascii':
      return '8 bit ASCII character';
    case 'char':
      return '16 bit in-game text character';
    case 'lz':
      return 'LZ77 compressed';
    case 'gfx':
      return 'Graphics';
    case 'tilemap':
      return 'Tilemap';
    case 'palette':
      return 'Palette';
    case 'thumb':
      return '16 bit THUMB code';
    case 'arm':
      return '32 bit ARM code';
    default:
      return '';
  }
}
