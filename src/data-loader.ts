import { TableType, tableHasAddr, KEY_NAME } from './constants';
import {
  TypeSpecKind, AssetType, SpecifierType, PointerType, ArrayType, FunctionType,
  BUILT_IN_SIZES
} from './asset-type';
import {
  DictEntry, NamedEntry, StructEntryDict, UnionEntryDict, EnumEntryDict, TypedefEntryDict,
  DataEntry, CodeEntry, StructEntry, UnionEntry, EnumEntry, TypedefEntry
} from './info-entry';

const VERSION = 7;

/** The game-wide definitions, shared across maps and regions */
export interface GameData {
  structs: StructEntryDict;
  unions: UnionEntryDict;
  enums: EnumEntryDict;
  typedefs: TypedefEntryDict;
  sizes: { [key: string]: number };
}

export class DataLoader {
  private loadedGame = '';
  private gameData?: GameData;

  /**
   * Loads the entries for the provided game/region/map. The game-wide defs are
   * fetched once per game and cached, so region/map changes don't refetch them.
   */
  async load(game: string, region: string, map: string, tableType: TableType)
      : Promise<{ gameData: GameData; entries: NamedEntry[] }> {
    const needDefs = game !== this.loadedGame || !this.gameData;
    const defsProm = needDefs ? this.loadGameData(game) : Promise.resolve(this.gameData!);
    const mapProm = tableHasAddr(tableType)
      ? this.loadMapData(game, map, region, tableType)
      : null;

    const gameData = await defsProm;
    this.gameData = gameData;
    this.loadedGame = game;

    const entries = mapProm
      ? await mapProm
      : this.buildDefEntries(tableType, gameData);
    return { gameData, entries };
  }

  private async loadGameData(game: string): Promise<GameData> {
    const [structJson, unionJson, enumJson, typedefJson] =
      await this.fetchJsons(game, ['structs', 'unions', 'enums', 'typedefs']);

    const structs: StructEntryDict = {};
    for (const entry of structJson) {
      structs[entry[KEY_NAME]] = new StructEntry(entry);
    }
    const unions: UnionEntryDict = {};
    for (const entry of unionJson) {
      unions[entry[KEY_NAME]] = new UnionEntry(entry);
    }
    const enums: EnumEntryDict = {};
    for (const entry of enumJson) {
      let name = entry[KEY_NAME] as string;
      // Strip trailing underscore
      name = name.endsWith('_') ? name.slice(0, -1) : name;
      entry[KEY_NAME] = name;
      enums[name] = new EnumEntry(entry);
    }
    const typedefs: TypedefEntryDict = {};
    for (const entry of typedefJson) {
      typedefs[entry[KEY_NAME]] = new TypedefEntry(entry);
    }

    // Compute sizes
    const sizes: { [key: string]: number } = {};
    for (const entry of Object.values(structs)) {
      sizes[entry.name] = entry.size;
    }
    for (const entry of Object.values(unions)) {
      sizes[entry.name] = entry.size;
    }
    for (const entry of Object.values(typedefs)) {
      if (!(entry.name in sizes)) {
        sizes[entry.name] = this.typeSize(entry.type, sizes, typedefs);
      }
    }
    return { structs, unions, enums, typedefs, sizes };
  }

  private async loadMapData(
    game: string, map: string, region: string, tableType: TableType
  ): Promise<NamedEntry[]> {
    const [json] = await this.fetchJsons(game, [map]);
    let fullData: DictEntry[] = json;
    // Filter by region
    fullData.forEach(entry => this.applyRegion(entry, region));
    fullData = fullData.filter(entry => entry.addr !== null);
    // Convert to classes
    if (tableType === TableType.CodeList) {
      return fullData.map(entry => new CodeEntry(entry));
    }
    return fullData.map(entry => new DataEntry(entry));
  }

  private buildDefEntries(tableType: TableType, data: GameData): NamedEntry[] {
    let entries;
    switch (tableType) {
      case TableType.StructList:
        entries = data.structs;
        break;
      case TableType.UnionList:
        entries = data.unions;
        break;
      case TableType.EnumList:
        entries = data.enums;
        break;
      case TableType.TypedefList:
        entries = data.typedefs;
        break;
      default:
        throw new Error(`Invalid table type ${tableType}`);
    }
    return Object.values(entries).sort((a, b) => {
      if (a.name < b.name) { return -1; }
      if (a.name > b.name) { return 1; }
      return 0;
    });
  }

  private applyRegion(entry: { [key: string]: unknown }, region: string) {
    if (typeof entry.addr == 'object') {
      const addrs = entry.addr as { [key: string]: string };
      if (region in addrs) {
        entry.addr = addrs[region];
      } else {
        entry.addr = null;
        return;
      }
    }
    // Data may have different counts
    if (typeof entry.count == 'object') {
      const counts = entry.count as { [key: string]: string };
      if (region in counts) {
        entry.count = counts[region];
      }
    }
    // Functions may have different sizes
    if (typeof entry.size == 'object') {
      const sizes = entry.size as { [key: string]: string };
      if (region in sizes) {
        entry.size = sizes[region];
      }
    }
  }

  private getJsonUrl(game: string, jsonName: string): string {
    return `/json/${game}/${jsonName}.json?v=${VERSION}`;
  }

  private async fetchJsons(game: string, names: string[]): Promise<any[]> {
    const responses = await Promise.all(names.map(n => fetch(this.getJsonUrl(game, n))));
    return Promise.all(responses.map(r => r.json()));
  }

  /** Computes the size of types for the purpose of storing typedef sizes */
  private typeSize(
    type: AssetType, sizes: { [key: string]: number }, typedefs: TypedefEntryDict,
  ): number {
    if (type instanceof SpecifierType) {
      const name = type.specName();
      switch (type.kind) {
        case TypeSpecKind.BuiltIn:
          if (type.names.includes("long")) {
            return 8;
          }
          const size = BUILT_IN_SIZES[name];
          if (size !== undefined) {
            return size;
          }
          return 4; // int by default
        case TypeSpecKind.Typedef:
          const td = typedefs[name];
          if (td === undefined) {
            throw new Error(`Unrecognized typedef name ${name}`);
          }
          let tdSize = sizes[td.name];
          if (tdSize === undefined) {
            tdSize = this.typeSize(td.type, sizes, typedefs);
            sizes[td.name] = tdSize;
          }
          return tdSize;
        case TypeSpecKind.Struct:
        case TypeSpecKind.Union:
          return sizes[name];
        case TypeSpecKind.Enum:
          throw new Error(`Can't compute size of enum`);
        default:
          throw new Error(TypeSpecKind[type.kind]);
      }
    } else if (type instanceof ArrayType) {
      if (type.size === undefined) {
        return 0; // Treat 0 as unknown
      }
      return type.size * this.typeSize(type.innerType, sizes, typedefs);
    } else if (type instanceof PointerType) {
      return 4;
    } else if (type instanceof FunctionType) {
      throw new Error('Function types must be pointer');
    } else {
      throw new Error(`Invalid type ${typeof(type)}`);
    }
  }
}
