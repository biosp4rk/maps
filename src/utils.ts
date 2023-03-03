import { PrimType } from './entry-types';

export function toHex(num: number): string {
  return num.toString(16).toUpperCase();
}

export function getPrimDesc(type: PrimType) : string {
  switch (type) {
    case PrimType.U8:
      return 'Unsigned 8 bit integer';
    case PrimType.S8:
      return 'Signed 8 bit integer';
    case PrimType.Bool:
      return 'Boolean (0 or 1)';
    case PrimType.U16:
      return 'Unsigned 16 bit integer';
    case PrimType.S16:
      return 'Signed 16 bit integer';
    case PrimType.U32:
      return 'Unsigned 32 bit integer';
    case PrimType.S32:
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
    case 'oam_frame':
      return 'OAM frame data';
    case 'bg_blocks':
      return 'Block map for BG';
    case 'bg_map':
      return 'Tilemap for BG';
    case 'thumb':
      return '16 bit THUMB code';
    case 'arm':
      return '32 bit ARM code';
    default:
      return '';
  }
}
