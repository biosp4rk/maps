
import { css, customElement, html, LitElement, property } from 'lit-element';
import "./map-row";
import { getHexVal } from './utils';

/**
 * Renders a table.
 */
@customElement('map-table')
export class MapTable extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .heading {
      box-sizing: border-box;
      cursor: pointer;
      display: inline-block;
      font-weight: 700;
      overflow: hidden;
      padding: 3px;
      text-overflow: ellipsis;
      vertical-align: top;
    }

    .size {
      width: 5em;
    }

    .val,
    .offset {
      width: 5.5em;
    }

    .addr {
      width: 7em;
    }

    #table {
      margin: auto;
      max-width: 90%;
    }

    #heading-row {
      display: flex;
    }

    :host(#first) #heading-row {
      background: #101010;
      border: 1px solid #808080;
    }

    .desc,
    .params,
    .return {
      flex: 1;
    }

    .sort {
      display: inline-block;
    }

    :host([sortascending]) .sort {
      transform: rotate(180deg);
    }
  `;

  /**
   * The JSON data to render.
   */
  @property({ type: Array }) data: Array<{ [key: string]: unknown }> = [];

  @property({ type: Object }) structs = {};

  @property({ type: Object }) enums = {} as { [key: string]: unknown };

  @property({ type: String, reflect: true }) version = '';

  @property({ type: Boolean }) isEnum = false;

  @property({ type: String }) parentAddress = '';

  @property({ type: Object }) sortFn?: ((a: any, b: any) => number) | undefined;

  @property({ type: Boolean, reflect: true }) sortAscending = true;

  @property({ type: String }) sortedHeading = '';

  @property({ type: String }) maptype = '';

  override firstUpdated() {
    const headings = this.getHeadings(this.maptype);
    this.sortedHeading = headings[0];
  }

  private getVersionedData(version: string) {
    return this.data.filter(
      (item: { [key: string]: unknown }) =>
        typeof item.addr == 'string' ||
        version in (item.addr as { [key: string]: string }));
  }

  private getClasses() {
    if (this.version) {
      let classes = ['addr', 'size', 'desc'];
      if (this.maptype === 'code') {
        classes.push('params', 'return');
      }
      return classes;
    }
    if (this.isEnum) {
      return ['val', 'desc']
    }
    return ['offset', 'size', 'desc'];
  }

  highlight(result: { row: number[], key: string } | void, shouldScroll = true) {
    if (!result) {
      return;
    }
    let rowElement = this.shadowRoot?.querySelectorAll('map-row')[result.row[0]]!;
    if (result.row.length == 1) {
      rowElement.highlightCell(result.key, shouldScroll);
    } else {
      rowElement.highlightSubTable(
        { row: result.row.slice(1), key: result.key }, shouldScroll)
    }
  }

  clearHighlights() {
    let rows = Array.from(this.shadowRoot?.querySelectorAll('map-row')!);
    rows.forEach(row => row.clearHighlights());
  }

  collapseAll() {
    let rows = Array.from(this.shadowRoot?.querySelectorAll('map-row')!);
    rows.forEach(row => row.collapseAll());
  }

  private getHeadings(mapType: string) {
    if (this.version) {
      let headings = ['Address', 'Length', 'Description'];
      if (mapType === 'code') {
        headings.push('Arguments', 'Returns');
      }
      return headings;
    }
    if (this.isEnum) {
      return ['Value', 'Description'];
    } else {
      return ['Offset', 'Size', 'Description'];
    }
  }

  private getData(sortFn: ((a: any, b: any) => number) | undefined) {
    const data = this.version ? this.getVersionedData(this.version) : this.data;
    if (sortFn) {
      let sortedData = data.slice();
      sortedData.sort(sortFn);
      return sortedData;
    } else {
      return data;
    }
  }

  private trySort(e: Event) {
    const columnHeadings = ['Address', 'Value', 'Offset', 'Description'];
    const columnKeys = ['addr', 'val', 'offset', 'desc'];
    const labelEl =
      (e.target as HTMLElement).parentElement?.querySelector('.label')! as
      HTMLElement;
    const sortEl =
      (e.target as HTMLElement).parentElement?.querySelector('.sort')! as
      HTMLElement;
    // are we sorting by increasing or decreasing?
    if (sortEl.textContent?.trim()) {
      // previously sorted, flip direction
      this.sortAscending = !this.sortAscending;
    }
    if (columnHeadings.includes(labelEl.innerText.trim())) {
      this.sortedHeading = labelEl.innerText.trim();
      let keyIndex = columnHeadings.indexOf(labelEl.innerText.trim());
      let key = columnKeys[keyIndex];
      this.sortFn =
        (a: { [key: string]: unknown }, b: { [key: string]: unknown }) => {
          if (key == 'addr' || key == 'offset' || key == 'val') {
            const left = getHexVal(a[key] as string | { [key: string]: string }, this.version);
            const right = getHexVal(b[key] as string | { [key: string]: string }, this.version);
            if (left < right) {
              return this.sortAscending ? -1 : 1;
            } else if (left > right) {
              return this.sortAscending ? 1 : -1;
            } else {
              return 0;
            }
          } else {
            const left = a[key] as string;
            const right = b[key] as string;
            if (left < right) {
              return this.sortAscending ? -1 : 1;
            } else if (left > right) {
              return this.sortAscending ? 1 : -1;
            } else {
              return 0;
            }
          }
        }
    } else {
      this.sortedHeading = '';
      this.sortFn = undefined;
    }
  }

  override render() {
    return html`
      <div id="table">
        <div id="heading-row">
          ${this.getHeadings(this.maptype)
        .map(
          (heading, index) => html`
              <span class="heading ${this.getClasses()[index]}"
                    @click="${this.trySort}">
                <span class="label">
                  ${heading}
                </span>
                <span class="sort">
                  ${(this.sortedHeading == heading) ? html`&#x25BE;` : html``}
                </span>
              </span>`)}
        </div>
        <div>
          ${this.getData(this.sortFn)
        .map((item: { [key: string]: unknown }, index: number) => {
          return html`<map-row
            .maptype="${this.maptype}"
            .data="${item}"
            .structs="${this.structs}"
            .enums="${this.enums}"
            .version="${this.version}"
            ?odd="${index % 2 == 0}"
            ?isEnum="${this.isEnum}"
            .parentAddress="${this.parentAddress}">
            </map-row>`;
        })}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'map-table': MapTable;
  }
}
