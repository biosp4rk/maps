export enum SearchType {
  Term,
  Quote,
  Regex
}

export class FilterItem {

  public text: string;
  public type: SearchType;
  public exclude: boolean;
  public regex: RegExp | null;
  
  constructor(type: SearchType, exclude: boolean, text: string = '') {
    this.text = text;
    this.type = type;
    this.exclude = exclude;
    this.regex = null;
  }

}

export class FilterParser {

  private static filter: string;
  private static index: number;
  private static items: Array<FilterItem>;
  private static exclude: boolean;
  //private static terms: Array<string>;
  //private static quotes: Array<string>;
  //private static regexes: Array<string>;

  public static parse(filter: string): Array<FilterItem> {
    // setup
    this.filter = filter;
    this.initialize();
    
    // parse
    this.parseFilterStart();

    // finalize results
    for (const item of this.items) {
      if (item.type === SearchType.Regex) {
        // create RegExp objects now (avoid making them on the fly later)
        item.regex = new RegExp(item.text, 'i');
      } else {
        // lowercase terms and quotes
        item.text = item.text.toLowerCase();
      }
    }
    const results = this.items;
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
    if (c === '"') {
      this.items.push(new FilterItem(SearchType.Quote, this.exclude));
      this.parseFilterQuote();
    } else if (c === '/') {
      this.items.push(new FilterItem(SearchType.Regex, this.exclude));
      this.parseFilterRegex();
    } else if (c === '-') {
      this.exclude = true;
      this.parseFilterText();
    } else if (c === ' ') {
      this.parseFilterSpace();
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
    if (c === '"') {
      this.items.push(new FilterItem(SearchType.Quote, this.exclude));
      this.parseFilterQuote();
    } else if (c === '/') {
      this.items.push(new FilterItem(SearchType.Regex, this.exclude));
      this.parseFilterRegex();
    } else if (c === '-') {
      this.exclude = true;
      this.parseFilterText();
    } else {
      this.items.push(new FilterItem(SearchType.Term, this.exclude, c));
      this.parseFilterTerm();
    }
  }

  private static parseFilterText(): void {
    if (this.index >= this.filter.length) {
      return
    }
    // item text is expected, so don't check for minus or space
    const c = this.filter[this.index++];
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

  private static parseFilterQuote(): void {
    this.exclude = false;
    while (this.index < this.filter.length) {
      const c = this.filter[this.index++];
      if (c === '"') {
        break;
      }
      this.addToLast(c);
    }
    this.parseFilterSpace();
  }
  
  private static parseFilterRegex(): void {
    this.exclude = false;
    let escaped = false;
    while (this.index < this.filter.length) {
      const c = this.filter[this.index++];
      if (c === '/' && !escaped) {
        break;
      }
      if (escaped) {
        escaped = false;
      } else if (c === '\\') {
        escaped = true;
      }
      this.addToLast(c);
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
