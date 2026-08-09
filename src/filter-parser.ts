// Grammar:
// Space -> /\s+/
// Hex -> /[0-9A-F]+/
// Filter -> FilterItem (Space FilterItem)*
// FilterItem -> Term | Regex | Addr
// Term -> /\S+/
// Regex -> '/' /[^/]*/ '/'
// Addr -> AddrEQ | AddrGT | AddrLT | AddrGE | AddrLE | AddrNear
// AddrEQ -> '=' Hex
// AddrGT -> '>' Hex
// AddrLT -> '<' Hex
// AddrGE -> '>=' Hex
// AddrLE -> '<=' Hex
// AddrNear -> '~' Hex


const ROM_OFFSET = 0x8000000;

export enum FilterType {
  Term,
  Regex,
  AddrEQ,
  AddrGT,
  AddrLT,
  AddrGE,
  AddrLE,
  AddrNear
}

export class FilterItem {
  public type: FilterType;
  public exclude: boolean;
  public term: string;
  public regex: RegExp | null;
  public addr: number | null;
  
  constructor(type: FilterType, exclude: boolean, term: string = '') {
    this.type = type;
    this.exclude = exclude;
    this.term = term;
    this.addr = null;
    this.regex = null;
  }
}

export class FilterParser {
  private static filter: string;
  private static index: number;
  private static items: Array<FilterItem>;
  private static exclude: boolean;

  public static parse(filter: string): Array<FilterItem> {
    // Setup
    this.filter = filter;
    this.initialize();
    
    // Parse
    this.parseFilterStart();

    // Finalize results
    let results: FilterItem[] = [];
    for (const item of this.items) {
      switch (item.type) {
        case FilterType.Term:
          item.term = item.term.toLowerCase();
          break;
        case FilterType.Regex:
          // Create RegExp objects now (avoid making them on the fly later)
          item.regex = new RegExp(item.term, 'i');
          break;
        case FilterType.AddrEQ:
        case FilterType.AddrGT:
        case FilterType.AddrLT:
        case FilterType.AddrGE:
        case FilterType.AddrLE:
        case FilterType.AddrNear:
          // Exclude addr filter if not valid hex
          if (!/^(0x)?[0-9A-Fa-f]+$/.test(item.term)) {
            continue;
          }
          item.addr = parseInt(item.term, 16);
          // Check if virtual rom address
          if (item.addr >= ROM_OFFSET) {
            item.addr -= ROM_OFFSET;
          }
          break;
        default:
          throw new Error('Invalid FilterType ' + item.type);
      }
      results.push(item);
    }

    this.reset();
    return results;
  }

  private static initialize() {
    this.index = 0;
    this.items = [];
    this.exclude = false;
  }

  private static reset() {
    this.filter = '';
    this.index = -1;
    this.items = [];
    this.exclude = false;
  }

  private static addToLast(text: string): void {
    const last = this.items.length - 1;
    this.items[last].term += text;
  }

  private static parseFilterStart(): void {
    if (this.index >= this.filter.length) {
      return
    }
    const c = this.filter[this.index++];
    if (this.tryParseFilterAddr(c)) {
      return;
    }
    if (c === '-') {
      this.exclude = true;
      this.parseFilterText();
    } else if (c === ' ') {
      this.parseFilterSpace();
    } else {
      this.parseFilterNonAddr(c);
    }
  }

  private static tryParseFilterAddr(c: string): boolean {
    if (this.index >= this.filter.length) {
      return false;
    }
    let searchType: FilterType;
    if (c === '=') {
      // Double equals is also allowed, so skip second equals if present
      if (this.filter[this.index] === '=') {
        this.index++;
      }
      searchType = FilterType.AddrEQ;
    } else if (c === '>') {
        if (this.filter[this.index] === '=') {
          this.index++;
          searchType = FilterType.AddrGE;
        } else {
          searchType = FilterType.AddrGT;
        }
    } else if (c === '<') {
      if (this.filter[this.index] === '=') {
        this.index++;
        searchType = FilterType.AddrLE;
      } else {
        searchType = FilterType.AddrLT;
      }
    } else if (c === '~') {
        searchType = FilterType.AddrNear;
    } else {
      return false;
    }
    // Add new filter item
    const item = new FilterItem(searchType, this.exclude);
    this.items.push(item);
    this.parseFilterTerm();
    return true;
  }

  private static parseFilterNonAddr(c: string): void {
    // Item text is expected, so don't check for minus or space
    if (c === '/') {
      this.items.push(new FilterItem(FilterType.Regex, this.exclude));
      this.parseFilterRegex();
    } else {
      this.items.push(new FilterItem(FilterType.Term, this.exclude, c));
      this.parseFilterTerm();
    }
  }

  private static parseFilterItem(): void {
    if (this.index >= this.filter.length) {
      return
    }
    // New item is expected, so check for minus but not space
    const c = this.filter[this.index++];
    if (this.tryParseFilterAddr(c)) {
      return;
    }
    if (c === '-') {
      this.exclude = true;
      this.parseFilterText();
    } else {
      this.parseFilterNonAddr(c);
    }
  }

  private static parseFilterText(): void {
    if (this.index >= this.filter.length) {
      return
    }
    // Item text is expected, so don't check for minus or space
    const c = this.filter[this.index++];
    if (this.tryParseFilterAddr(c)) {
      return;
    }
    this.parseFilterNonAddr(c);
  }
  
  private static parseFilterRegex(): void {
    this.exclude = false;
    let escaped = false;
    let terminated = false;
    while (this.index < this.filter.length) {
      const c = this.filter[this.index++];
      if (c === '/' && !escaped) {
        terminated = true;
        break;
      }
      if (escaped) {
        escaped = false;
      } else if (c === '\\') {
        escaped = true;
      }
      this.addToLast(c);
    }
    if (!terminated) {
      // TODO: Indicate problem to user
      this.items.pop();
      return;
    }
    this.parseFilterSpace();
  }
  
  private static parseFilterSpace(): void {
    while (this.index < this.filter.length && this.filter[this.index] === ' ') {
      this.index++;
    }
    this.parseFilterItem();
  }
  
  private static parseFilterTerm(): void {
    this.exclude = false;
    while (this.index < this.filter.length) {
      const c = this.filter[this.index++];
      if (c === ' ') {
        break;
      }
      this.addToLast(c);
    }
    this.parseFilterSpace();
  }
}
