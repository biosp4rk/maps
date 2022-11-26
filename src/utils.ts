
export function toHex(num: number): string {
  return num.toString(16).toUpperCase();
}

export function getPrimSize(type: string) : number {
  switch (type) {
    case 'u8':
    case 's8':
    case 'bool':
      return 1;
    case 'u16':
    case 's16':
      return 2
    case 'u32':
    case 's32':
      return 4;
    case 'void':
      return 0;
    default:
      return NaN;
  }
}

export function getPrimDesc(type: string) : string {
  switch (type) {
    case 'u8':
      return 'Unsigned 8 bit integer';
    case 's8':
      return 'Signed 8 bit integer';
    case 'bool':
      return 'Boolean (0 or 1)';
    case 'u16':
      return 'Unsigned 16 bit integer';
    case 's16':
      return 'Signed 16 bit integer';
    case 'u32':
      return 'Unsigned 32 bit integer';
    case 's32':
      return 'Signed 32 bit integer';
    default:
      return '';
  }
}

export function getTagDesc(tag: string) : string {
  switch (tag) {
    case 'flags':
      return 'Integer used for bit flags';
    case 'ascii':
      return '8 bit ASCII character';
    case 'text':
      return '16 bit in-game text character';
    case 'rle':
      return 'RLE compressed';
    case 'lz':
      return 'LZ77 compressed';
    case 'gfx':
      return 'Graphics';
    case 'tilemap':
      return 'Tilemap';
    case 'palette':
      return 'Palette';
    case 'oamframe':
      return 'OAM frame data';
    case 'thumb':
      return '16 bit THUMB code';
    case 'arm':
      return '32 bit ARM code';
    default:
      return '';
  }
}
