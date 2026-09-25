import { TableType, tableHasAddr } from './constants';
import { TypeSpecKind } from './asset-type';
import {
  NamedEntry, StructEntryDict, UnionEntryDict, EnumEntryDict,
  DataEntry, CodeEntry, StructEntry, EnumEntry
} from './info-entry';
import { FilterItem, FilterType } from './filter-parser';

export interface FilterContext {
  tableType: TableType;
  structs: StructEntryDict;
  unions: UnionEntryDict;
  enums: EnumEntryDict;
  sizes: { [key: string]: number };
  searchStructsUnions: boolean;
  searchEnums: boolean;
}

export class FilterEngine {
  constructor(private ctx: FilterContext) {}

  apply(allData: NamedEntry[], filterItems: FilterItem[]): NamedEntry[] {
    let data = allData;
    for (const item of filterItems) {
      switch (item.type) {
        case FilterType.Term:
        case FilterType.Regex:
          data = data.filter(entry => this.matchesName(entry, item));
          break;
        case FilterType.AddrEQ:
        case FilterType.AddrGT:
        case FilterType.AddrLT:
        case FilterType.AddrGE:
        case FilterType.AddrLE:
          data = tableHasAddr(this.ctx.tableType)
            ? data.filter(entry => this.checkAddrFilter(entry.sortValue(), item))
            : [];
          break;
        case FilterType.AddrNear:
          data = tableHasAddr(this.ctx.tableType) ? this.handleNearAddrFilter(data, item) : [];
          break;
      }
    }
    return data;
  }

  static highlightRegex(filterItems: FilterItem[]): RegExp | null {
    const highlightItems = filterItems.filter(
      item =>
        (item.type === FilterType.Term || item.type === FilterType.Regex) &&
        !item.exclude);
    if (highlightItems.length === 0) {
      return null;
    }
    return new RegExp(highlightItems.map(i => i.term).join('|'), 'gi');
  }

  private matchesName(entry: NamedEntry, item: FilterItem): boolean {
    let suName = undefined;
    let eName = undefined;
    if (this.ctx.tableType === TableType.RamList || this.ctx.tableType === TableType.DataList) {
      const de = entry as DataEntry;
      if (this.ctx.searchStructsUnions &&
        (de.specKind === TypeSpecKind.Struct || de.specKind === TypeSpecKind.Union)) {
        suName = de.specName();
      }
      if (this.ctx.searchEnums) {
        eName = de.enum;
      }
    } else if (this.ctx.tableType === TableType.StructList && this.ctx.searchStructsUnions) {
      suName = (entry as StructEntry).name;
    } else if (this.ctx.tableType === TableType.EnumList && this.ctx.searchEnums) {
      eName = (entry as EnumEntry).name;
    }
    return this.checkNameFilter(entry.name, item, suName, eName);
  }

  private checkNameFilter(
    name: string,
    item: FilterItem,
    structUnionName: string = '',
    enumName: string = '',
    seenParents: Set<string> = new Set<string>()
  ): boolean {
    if (seenParents.has(structUnionName)) {
      return false;
    }
    name = name.toLowerCase();
    if (item.type === FilterType.Term) {
      if (name.includes(item.term) !== item.exclude) {
        return true;
      }
    } else if (item.type === FilterType.Regex) {
      if (item.regex!.test(name) !== item.exclude) {
        return true;
      }
    }
    // Check if entry is struct or union
    if (this.ctx.searchStructsUnions && structUnionName) {
      let suEntry = undefined;
      if (structUnionName in this.ctx.structs) {
        suEntry = this.ctx.structs[structUnionName];
      } else if (structUnionName in this.ctx.unions) {
        suEntry = this.ctx.unions[structUnionName];
      }
      if (suEntry) {
        seenParents.add(structUnionName);
        if (suEntry.vars.some(
          su => this.checkNameFilter(su.name, item, su.specName(), su.enum, seenParents))
        ) {
          return true;
        }
      }
    }
    // Check if entry has enum
    if (this.ctx.searchEnums && enumName && enumName in this.ctx.enums) {
      const ee = this.ctx.enums[enumName].vals;
      if (ee.some(ev => this.checkNameFilter(ev.name, item))) {
        return true;
      }
    }
    // Did not match name, struct var, or enum val
    return false;
  }

  private checkAddrFilter(addr: number, item: FilterItem): boolean {
    switch (item.type) {
      case FilterType.AddrEQ:
        if ((addr === item.addr!) !== item.exclude) { return true; }
        break;
      case FilterType.AddrGT:
        if ((addr > item.addr!) !== item.exclude) { return true; }
        break;
      case FilterType.AddrLT:
        if ((addr < item.addr!) !== item.exclude) { return true; }
        break;
      case FilterType.AddrGE:
        if ((addr >= item.addr!) !== item.exclude) { return true; }
        break;
      case FilterType.AddrLE:
        if ((addr <= item.addr!) !== item.exclude) { return true; }
        break;
    }
    return false;
  }

  private handleNearAddrFilter(data: NamedEntry[], item: FilterItem): NamedEntry[] {
    const target = item.addr!;
    // Find index of first entry past address using binary search
    const numEntries = data.length;
    let low = 0;
    let high = numEntries;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (data[mid].sortValue() > target) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }
    const idx = low;
    // Check if exact match
    let exact = false;
    if (idx - 1 >= 0) {
      let addr;
      let size;
      const entry = data[idx - 1];
      if (this.ctx.tableType === TableType.CodeList) {
        const ce = entry as CodeEntry;
        addr = ce.addr;
        size = ce.size;
      } else {
        const de = entry as DataEntry;
        addr = de.addr;
        size = de.getLength(this.ctx.sizes);
      }
      if (target >= addr && target < addr + size) {
        exact = true;
      }
    }
    // Get left/right entries
    let left = idx - 1;
    if (exact) { left--; }
    if (left < 0) { left = 0; }
    let right = idx;
    if (right >= numEntries) {
      right = numEntries - 1;
    }
    return data.slice(left, right + 1);
  }
}
