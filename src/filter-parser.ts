// Grammar:
// Space -> /\s+/
// Hex -> /[0-9A-F]+/
// Filter -> FilterItem (Space FilterItem)*
// FilterItem -> Term | Quote | Regex | Addr
// Term -> /\S+/
// Quote -> '"' /[^"]*/ '"'
// Regex -> '/' /[^/]*/ '/'
// Addr -> AddrEQ | AddrGT | AddrLT | AddrGE | AddrLE | AddrNear
// AddrEQ -> '=' Hex
// AddrGT -> '>' Hex
// AddrLT -> '<' Hex
// AddrGE -> '>=' Hex
// AddrLE -> '<=' Hex
// AddrNear -> '~' Hex


const ROM_OFFSET = 0x8000000;

export enum SearchType {
  Term,
  Quote,
  Regex,
  AddrEQ,
  AddrGT,
  AddrLT,
  AddrGE,
  AddrLE,
  AddrNear
}

export class FilterItem {

  public text: string;
  public type: SearchType;
  public exclude: boolean;
  public addr: number | null;
  public regex: RegExp | null;
  
  constructor(type: SearchType, exclude: boolean, text: string = '') {
    this.text = text;
    this.type = type;
    this.exclude = exclude;
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
    // setup
    this.filter = filter;
    this.initialize();
    
    // parse
    this.parseFilterStart();

    // finalize results
    let results: FilterItem[] = [];
    for (const item of this.items) {
      switch (item.type) {
        case SearchType.Regex:
          // create RegExp objects now (avoid making them on the fly later)
          item.regex = new RegExp(item.text, 'i');
          break;
        case SearchType.AddrEQ:
        case SearchType.AddrGT:
        case SearchType.AddrLT:
        case SearchType.AddrGE:
        case SearchType.AddrLE:
        case SearchType.AddrNear:
          // exclude addr filter if not valid hex
          if (!/(0x)?[0-9A-Fa-f]+/.test(item.text)) {
            continue;
          }
          item.addr = parseInt(item.text, 16);
          // check if virtual rom address
          if (item.addr >= ROM_OFFSET) {
            item.addr -= ROM_OFFSET;
          }
          break;
        default:
          // lowercase terms and quotes
          item.text = item.text.toLowerCase();
          break;
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
    this.items[last].text += text;
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
    let searchType: SearchType;
    if (c === "=") {
      // double equals is also allowed,
      // so skip second equals if present
      if (this.filter[this.index] === "=") {
        this.index++;
      }
      searchType = SearchType.AddrEQ;
    } else if (c === ">") {
        if (this.filter[this.index] === "=") {
          this.index++;
          searchType = SearchType.AddrGE;
        } else {
          searchType = SearchType.AddrGT;
        }
    } else if (c === "<") {
      if (this.filter[this.index] === "=") {
        this.index++;
        searchType = SearchType.AddrLE;
      } else {
        searchType = SearchType.AddrLT;
      }
    } else if (c === "~") {
        searchType = SearchType.AddrNear;
    } else {
      return false;
    }
    // add new filter item
    const item = new FilterItem(searchType, this.exclude);
    this.items.push(item);
    this.parseFilterTerm();
    return true;
  }

  private static parseFilterNonAddr(c: string): void {
    // item text is expected, so don't check for minus or space
    if (c === '"') {
      this.items.push(new FilterItem(SearchType.Quote, this.exclude));
      this.parseFilterQuote();
    } else if (c === '/') {
      this.items.push(new FilterItem(SearchType.Regex, this.exclude));
      this.parseFilterRegex();
    } else {
      this.items.push(new FilterItem(SearchType.Term, this.exclude, c));
      this.parseFilterTerm();
    }
  }

  private static parseFilterItem(): void {
    if (this.index >= this.filter.length) {
      return
    }
    // new item is expected, so check for minus but not space
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
    // item text is expected, so don't check for minus or space
    const c = this.filter[this.index++];
    if (this.tryParseFilterAddr(c)) {
      return;
    }
    this.parseFilterNonAddr(c);
  }

  private static parseFilterQuote(): void {
    this.exclude = false;
    let terminated = false;
    while (this.index < this.filter.length) {
      const c = this.filter[this.index++];
      if (c === '"') {
        terminated = true;
        break;
      }
      this.addToLast(c);
    }
    if (!terminated) {
      // TODO: indicate problem to user
      this.items.pop();
      return;
    }
    this.parseFilterSpace();
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
      // TODO: indicate problem to user
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
