
import "./map-table";import { css, customElement, html, LitElement, property } from 'lit-element';
import { GameVal, getHexVal } from './utils';

/**
 * Renders a single row in a table.
 */
@customElement('map-row')
export class MapRow extends LitElement {
  static override styles = css`
    :host {
      background: #202020;
      border: 1px solid #808080;
      display: flex;

      --map-blue: #2196F3;
      --map-gray: #202020;
      --map-black: #999999;
    }

    :host([odd]) {
      background: #101010;
    }

    div:not(:last-child) {
      border-right: 1px solid var(--map-black);
    }

    div {
      box-sizing: border-box;
      display: inline-block;
      overflow: hidden;
      padding: 3px 5px 3px 5px;
      text-overflow: ellipsis;
    }

    div,
    span {
      transition: background-color .5s linear;
    }

    p {
      margin: 0px 0px 3px 0px;
    }

    .size {
      flex: none;
      text-align: right;
      width: 5em;
    }

    .addr {
      flex: none;
      font-family: "Courier New", monospace;
      width: 7em;
    }

    .addr,
    .offset {
      text-align: right;
    }

    .type {
      font-family: "Courier New", monospace;
      font-size: 14px;
      margin: 0;
    }

    .val,
    .offset {
      width: 5.5em;
    }

    .has-tooltip {
      border-bottom: 1px dotted white;
      cursor: help;
    }

    .expand {
      color: var(--map-blue);
      cursor: pointer;
    }

    .highlight {
      background-color: lightblue;
    }

    .desc,
    .params,
    .return {
      flex: 1;
    }
  `;

  /**
   * The JSON data to render.
   */
  @property({ type: Object }) data = {} as { [key: string]: unknown };

  @property({ type: Object }) structs = {} as { [key: string]: unknown };

  @property({ type: Object }) enums = {} as { [key: string]: unknown };

  @property({ type: String }) version = '';

  @property({ type: Boolean, reflect: true }) odd = false;

  @property({ type: Boolean, reflect: true }) expanded = false;

  @property({ type: Boolean }) isEnum = false;

  @property({ type: String }) parentAddress = '';

  @property({ type: String }) maptype = '';

  private toHex(num: number): string {
    return num.toString(16).toUpperCase();
  }

  private getLength() {
    return this.getSize() * this.getCount();
  }

  async highlightCell(key: string, shouldScroll: boolean) {
    if (key == 'enum') {
      this.expanded = true;
    }
    await this.requestUpdate();
    let element = this.shadowRoot?.querySelector('.' + key)! as HTMLElement;
    if (shouldScroll) {
      // Account for the sticky header.
      const yOffset = -155;
      const y =
        element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
    element.classList.add('highlight');
  }

  async highlightSubTable(
    result: { row: number[], key: string }, shouldScroll: boolean) {
    this.expanded = true;
    await this.requestUpdate();
    let table = this.shadowRoot?.querySelector('map-table')!;
    table.highlight(result, shouldScroll);
  }

  clearHighlights() {
    let highlights =
      Array.from(this.shadowRoot?.querySelectorAll('.highlight')!);
    highlights.forEach(el => el.classList.remove('highlight'));
    if (this.expanded) {
      let table = this.shadowRoot?.querySelector('map-table')!;
      table.clearHighlights();
    }
  }

  collapseAll() {
    if (this.expanded) {
      let table = this.shadowRoot?.querySelector('map-table')!;
      table.collapseAll();
    }
    this.expanded = false;
  }

  private getCount() {
    return 'count' in this.data ? parseInt(this.data.count as string, 16) : 1;
  }

  private getSize() : number {
    let size : number;
    if (this.data.size) {
      size = getHexVal(this.data.size as GameVal, this.version);
    } else {
      let type = (this.data.type as string).split('.')[0];
      switch (type) {
        case 'u8':
        case 's8':
        case 'flags8':
        case 'bool':
          size = 1;
          break;
        case 'u16':
        case 's16':
        case 'flags16':
          size = 2;
          break;
        case 'u32':
        case 's32':
        case 'ptr':
          size = 4;
          break;
        case 'palette':
          size = 32;
          break;
        default:
          const struct = this.structs[type] as { size: GameVal }
          size = getHexVal(struct.size, this.version);
          break;
      }
    }
    return size;
  }

  private getTooltip() {
    if (this.maptype === 'code') {
      return `Ends at ${
        this.toHex(this.getAddr() + this.getLength() - 1)}`
    }
    if (this.version) {
      const count = this.getCount();
      if (count > 1) {
        const size = this.getSize();
        return 'Size: ' + this.toHex(size) + '\nCount: ' + this.toHex(count);
      }
      return '';
    } else {
      return 'Address: ' + this.getOffsetAddr();
    }
  }

  private getOffsetAddr() {
    let off = parseInt(this.data.offset as string, 16);
    return this.toHex(parseInt(this.parentAddress, 16) + off);
  }

  private showToggle() {
    return (this.isExpandEnum() || this.data.type as string in this.structs);
  }

  private expand() {
    this.expanded = !this.expanded;
  }

  private isExpandEnum() {
    return 'enum' in this.data;
  }

  private getExpandName(): string {
    return this.isExpandEnum() ? this.data.enum as string :
      this.data.type as string;
  }

  private getData(): { [key: string]: unknown }[] {
    if (this.isExpandEnum()) {
      return this.enums[this.getExpandName()] as { [key: string]: unknown }[];
    }
    return (this.structs[this.getExpandName()] as { [key: string]: unknown })
      .vars as { [key: string]: unknown }[];
  }

  private getAddr(): number {
    if (this.version) {
      return getHexVal(this.data.addr as GameVal, this.version);
    }
    return parseInt(this.data.offset as string, 16);
  }

  private getAddrStr(): string {
    return this.toHex(this.getAddr());
  }

  private shouldAddrHaveToolTip(): boolean {
    return !this.version;
  }

  private getFirstClass(data: { [key: string]: unknown }): string {
    if (data.val) {
      return 'val'
    } else if (data.addr) {
      return 'addr';
    }
    return 'offset';
  }

  private renderCodeVar(codeVar: object) {
    const cv = codeVar as { [index: string]: string };
    const t = cv.type.split('.')[0]
    return html`<p>
      <span class="type">${t}</span>
      <span>${cv.desc}</span>
    </p>`;
  }

  override render() {
    return this.isEnum ?
      html`
      <div class="${this.getFirstClass(this.data)}">${this.data.val}</div>
      <div class="desc">${this.data.desc}</div>` :
      html`
      <div class="${this.getFirstClass(this.data)}">
        <span class="${this.shouldAddrHaveToolTip() ? 'has-tooltip' : ''}"
              title="${
        this.shouldAddrHaveToolTip() ? this.getTooltip() :
          ''}">${this.getAddrStr()}</span>
      </div>
      <div class="size">
        <span class="${
        this.version && !!this.getTooltip() ? 'has-tooltip' : ''}"
              title="${this.getTooltip()}">${
        this.toHex(this.getLength())}</span>
      </div>
      <div class="desc">${this.data.desc} ${
        this.showToggle() ?
          html`<span class="expand" @click="${this.expand}">[${
            this.expanded ? '-' : '+'}]</span>` :
          ''}
          ${
        this.expanded ? html`<map-table
              .data="${this.getData()}"
              ?isEnum="${this.isExpandEnum()}"
              .structs="${this.structs}"
              .enums="${this.enums}"
              .parentAddress="${
          this.version ? this.getAddrStr() :
            this.getOffsetAddr()}">
            </map-table>` :
          ''}
      </div>
      ${
        this.maptype === 'code' ?
          html`
      <div class="params">
        <span>
          ${this.data.params ?
            (this.data.params as object[])
              .map((param) => this.renderCodeVar(param)) :
              'void'}
        </span>
      </div>
      <div class="return">
        <span>
          ${this.data.return ?
            this.renderCodeVar(this.data.return as object) :
            'void'}
        </span>
      </div>` :
          ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'map-row': MapRow;
  }
}
