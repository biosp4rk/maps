import { LitElement, html, css } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import {
  GameEntry, GameVar, GameData, GameRelVar, GameStructDict,
  GameEnumDict, GameCode, GameEnumVal, GameStruct, GameEnum
} from './entry-types';
import { toHex } from './utils';
import {
  TableType, KEY_ADDR, KEY_CAT, KEY_DESC, KEY_LABEL, KEY_LEN, KEY_NOTES,
  KEY_OFF, KEY_PARAMS, KEY_RET, KEY_SIZE, KEY_TYPE, KEY_VAL, KEY_VALS,
  KEY_VARS, CATEGORIES, getHeading
} from './constants';

const grayBorder = css`1px solid #808080`;

/** Renders a table */
@customElement('map-table')
export class MapTable extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    table, th, td {
      border: ${grayBorder};
      border-collapse: collapse;
    }

    th {
      padding: 3px 10px;
    }

    td {
      overflow-wrap: normal;
      padding: 3px 5px;
      vertical-align: top;
    }
    
    tbody tr:nth-child(odd) {
      background-color: #101010;
    }

    tbody tr:nth-child(even) {
      background-color: #202020;
    }

    .addr,
    .length,
    .offset,
    .size,
    .type,
    .val {
      font-family: "Courier New", monospace;
      text-align: right;
      padding-top: 5px;
      padding-bottom: 1px;
    }

    .type, .inline-type {
      font-size: 90%;
    }
    
    .type {
      max-width: 300px;
    }

    .inline-type {
      font-family: "Courier New", monospace;
      margin-right: 3px;
    }

    .label {
      max-width: 300px;
      word-wrap: break-word;
    }

    .desc-span {
      max-width: 350px;
      display: inline-block;
      word-wrap: break-word;
    }
    
    .params, .returns {
      max-width: 250px;
    }

    .code-var-notes {
      font-size: 80%;
      border: ${grayBorder};
      padding: 3px 5px;
      margin: 5px 0px 2px 0px;
    }

    .notes {
      max-width: 350px;
    }

    .has-tooltip {
      cursor: help;
      text-decoration: underline dotted;
      text-decoration-thickness: from-font;
    }

    .expand {
      color: #A0A0E0;
      cursor: pointer;
      margin-left: 5px;
    }

    .main-table {
      table-layout: fixed;
      margin: auto;
      max-width: 95%;
    }

    .sub-table {
      margin: 5px 0px 2px 0px;
    }

    :host(#first) #heading-row {
      background: #101010;
    }
  `;

  /** The type of data to display in the table */
  @property({ type: Number }) tableType: TableType = TableType.None;
  /** The JSON data to render */
  @property({ type: Array }) entries: GameEntry[] = [];
  /** All struct definitions in the game */
  @property({ type: Object }) structs: GameStructDict = {};
  /** All enum definitions in the game */
  @property({ type: Object }) enums: GameEnumDict = {};
  /** Address of parent entry if table is part of row */
  @property({ type: Number }) parentAddr = NaN;
  /** Columns that should not be displayed */
  @property({ type: Object }) hiddenColumns: Set<string> = new Set<string>();

  /** Indexes of rows that are expanded */
  private expandedItems: Set<string> = new Set<string>();

  collapseAll() {
    const tables = Array.from(this.shadowRoot?.querySelectorAll('map-table')!);
    tables.forEach(table => table.collapseAll());
    this.expandedItems.clear();
    this.requestUpdate();
  }

  updateVisibleColumns() {
    // recursively update sub-tables
    const tables = this.shadowRoot?.querySelectorAll('map-table')!
    for (const table of tables) {
      table.updateVisibleColumns();
    }
    this.requestUpdate();
  }

  private getClasses(): string[] {
    switch (this.tableType) {
      case TableType.RamList:
      case TableType.DataList:
        return [KEY_ADDR, KEY_LEN, KEY_CAT, KEY_TYPE, KEY_LABEL, KEY_DESC, KEY_NOTES];
      case TableType.CodeList:
        return [KEY_ADDR, KEY_LEN, KEY_LABEL, KEY_DESC, KEY_PARAMS, KEY_RET, KEY_NOTES];
      case TableType.StructList:
        return [KEY_SIZE, KEY_LABEL, KEY_DESC, KEY_VARS, KEY_NOTES];
      case TableType.EnumList:
        return [KEY_LABEL, KEY_DESC, KEY_VALS, KEY_NOTES];
      case TableType.StructDef:
        return [KEY_OFF, KEY_LEN, KEY_TYPE, KEY_LABEL, KEY_DESC, KEY_NOTES];
      case TableType.EnumDef:
        return [KEY_VAL, KEY_LABEL, KEY_DESC, KEY_NOTES];
      default:
        throw new Error('Invalid TableType ' + this.tableType);
    }
  }

  //** Get table headings based on map type */
  private getHeadings(): string[] {
    return this.getClasses()
      .filter(k => !this.hiddenColumns.has(k))
      .map(k => getHeading(k));
  }

  private isMainTable(): boolean {
    switch (this.tableType) {
      case TableType.RamList:
      case TableType.CodeList:
      case TableType.DataList:
      case TableType.StructList:
      case TableType.EnumList:
        return true;
      default:
        return false;
    }
  }

  private expand(event: any) {
    const key: string = event.target.dataset.expandKey;
    if (this.expandedItems.has(key)) {
      this.expandedItems.delete(key);
    } else {
      this.expandedItems.add(key);
    }
    this.requestUpdate();
  }

  private renderType(type: string) {
    if (this.hiddenColumns.has(KEY_TYPE)) {
      return '';
    }
    return html`<td class="type">${type}</td>`
  }

  private renderCat(cat?: string) {
    if (this.hiddenColumns.has(KEY_CAT)) {
      return '';
    }
    const catName = cat ? CATEGORIES[cat] : undefined;
    return html`<td class="cat">${catName ?? ''}</td>`
  }

  private renderVarLength(entry: GameVar) {
    if (this.hiddenColumns.has(KEY_LEN)) {
      return '';
    }
    const len = toHex(entry.getLength(this.structs));
    const toolTip = entry.getLengthToolTip(this.structs);
    return html`<td
      class="length ${toolTip ? 'has-tooltip' : 'no-tooltip'}"
      title="${toolTip}">${len}</td>`;
  }

  private hasSubTable(entry: GameEntry): Boolean {
    if (entry instanceof GameVar) {
      const gv = entry as GameVar;
      const isEnum = Boolean(gv.enum) && gv.enum! in this.enums;
      const isStruct = gv.spec() in this.structs;
      return isEnum || isStruct;
    } else if (entry instanceof GameStruct ||
      entry instanceof GameEnum) {
      return true;
    }
    return false;
  }

  private renderSubTable(entry: GameEntry) {
    if (entry instanceof GameVar) {
      const gv = entry as GameVar;
      if (gv.enum && gv.enum! in this.enums) {
        const ge: GameEnum = this.enums[gv.enum!];
        return this.renderEnumDef(ge);
      } else if (gv.structName && gv.structName! in this.structs) {
        const gs = this.structs[gv.structName!];
        let pa = NaN;
        if (this.tableType === TableType.RamList ||
          this.tableType === TableType.DataList) {
          pa = (entry as GameData).addr;
        } else if (this.parentAddr) {
          pa = this.parentAddr + (entry as GameRelVar).offset;
        }
        return this.renderStructDef(gs, pa);
      }
    } else if (entry instanceof GameStruct) {
      return this.renderStructDef(entry as GameStruct);
    } else if (entry instanceof GameEnum) {
      return this.renderEnumDef(entry as GameEnum);
    }
    return '';
  }

  private renderLabel(label: string) {
    if (this.hiddenColumns.has(KEY_LABEL)) {
      return '';
    }
    return html`<td class="label">${label}</td>`
  }

  private renderToggleAndTable(entry: GameEntry) {
    let toggle: any = '';
    let table: any = '';
    if (this.hasSubTable(entry)) {
      const key = entry.label;
      const expanded = this.expandedItems.has(key);
      toggle = html`<span class="expand" data-expand-key="${key}"
        @click="${this.expand}">[${expanded ? '−' : '+'}]</span>`;
      if (expanded) {
        table = this.renderSubTable(entry);
      }
    }
    return [toggle, table];
  }

  private renderDesc(entry: GameEntry) {
    const [toggle, table] = this.renderToggleAndTable(entry);
    return html`<td class="desc">
      <span class="desc-span">${entry.desc}${toggle}</span>
      ${table}
    </td>`;
  }

  private renderNotes(notes?: string) {
    if (this.hiddenColumns.has(KEY_NOTES)) {
      return '';
    }
    return html`<td class="notes">${notes}</td>`
  }

  private renderDataVarEntry(entry: GameData) {
    return html`<tr>
      <td class="addr">${toHex(entry.addr)}</td>
      ${this.renderVarLength(entry)}
      ${this.renderCat(entry.catStr())}
      ${this.renderType(entry.typeStr())}
      ${this.renderLabel(entry.label)}
      ${this.renderDesc(entry)}
      ${this.renderNotes(entry.notes)}
    </tr>`;
  }

  private renderCodeLength(entry: GameCode) {
    if (this.hiddenColumns.has(KEY_LEN)) {
      return '';
    }
    const toolTip = entry.getToolTip();
    return html`<td class="length ${toolTip ? 'has-tooltip' : 'no-tooltip'}"
      title="${toolTip}">${toHex(entry.size)}
    </td>`;
  }

  private renderCodeVarDesc(cv: GameVar, paramIdx: number, entryLabel: string) {
    const notes = cv.notes ? cv.notes : '';
    let toggle: any = '';
    let noteBox: any = '';
    if (notes) {
      const key = `${entryLabel}:${paramIdx}`;
      const expanded = this.expandedItems.has(key);
      toggle = html`<span class="expand" data-expand-key="${key}"
        @click="${this.expand}">[?]</span>`;
      if (expanded) {
        noteBox = html`<div class="code-var-notes">${notes}</div>`
      }
    }
    return html`<span class="desc-span">${cv.desc}${toggle}</span>
      ${noteBox}`;
  }

  private renderCodeVar(cv: GameVar, paramIdx: number, entryLabel: string) {
    return html`<div>
      <span class="inline-type">${cv.typeStr()}</span>
      ${this.renderCodeVarDesc(cv, paramIdx, entryLabel)}
    </div>`;
  }

  private renderCodeArgs(entry: GameCode) {
    if (this.hiddenColumns.has(KEY_PARAMS)) {
      return '';
    }
    const params = entry.params;
    if (!params) {
      return html`<td>void</td>`;
    }
    return html`<td class="params">${params.map(
      (arg, pIdx) => this.renderCodeVar(arg, pIdx, entry.label))}
    </td>`;
  }

  private renderCodeRet(entry: GameCode) {
    if (this.hiddenColumns.has(KEY_RET)) {
      return '';
    }
    const ret = entry.return;
    if (!ret) {
      return html`<td>void</td>`;
    }
    return html`<td class="returns">${this.renderCodeVar(ret, -1, entry.label)}</td>`;
  }

  private renderCodeEntry(entry: GameCode) {
    return html`<tr>
      <td class="addr">${toHex(entry.addr)}</td>
      ${this.renderCodeLength(entry)}
      ${this.renderLabel(entry.label)}
      <td class="desc">
        <span class="desc-span">${entry.desc}</span>
      </td>
      ${this.renderCodeArgs(entry)}
      ${this.renderCodeRet(entry)}
      ${this.renderNotes(entry.notes)}
    </tr>`;
  }

  private renderStructSize(size: number) {
    if (this.hiddenColumns.has(KEY_SIZE)) {
      return '';
    }
    return html`<td class="size">${toHex(size)}</td>`;
  }

  private renderStructEntry(entry: GameStruct) {
    const [toggle, table] = this.renderToggleAndTable(entry);
    const vars = html`<td class="vars">${toggle}${table}</td>`;
    return html`<tr>
      ${this.renderStructSize(entry.size)}
      ${this.renderLabel(entry.label)}
      <td class="desc">
        <span class="desc-span">${entry.desc}</span>
      </td>
      ${vars}
      ${this.renderNotes(entry.notes)}
    </tr>`;
  }

  private renderEnumEntry(entry: GameEnum) {
    const [toggle, table] = this.renderToggleAndTable(entry);
    const vals = html`<td class="vals">${toggle}${table}</td>`;
    return html`<tr>
      ${this.renderLabel(entry.label)}
      <td class="desc">
        <span class="desc-span">${entry.desc}</span>
      </td>
      ${vals}
      ${this.renderNotes(entry.notes)}
    </tr>`;
  }

  private renderStructVar(entry: GameRelVar) {
    const toolTip = entry.getOffsetToolTip(this.parentAddr);
    // structs can have categories, but they're left out to save space
    return html`<tr>
      <td class="offset ${toolTip ? 'has-tooltip' : 'no-tooltip'}"
        title="${toolTip}">
        ${toHex(entry.offset)}
      </td>
      ${this.renderVarLength(entry)}
      ${this.renderType(entry.typeStr())}
      ${this.renderLabel(entry.label)}
      ${this.renderDesc(entry)}
      ${this.renderNotes(entry.notes)}
    </tr>`;
  }

  private renderStructDef(entry: GameStruct, parentAddr: number = NaN) {
    return html`<map-table
      .tableType="${TableType.StructDef}"
      .entries="${entry.vars}"
      .structs="${this.structs}"
      .enums="${this.enums}"
      .parentAddr="${parentAddr}"
      .hiddenColumns="${this.hiddenColumns}">
    </map-table>`
  }

  private renderEnumVal(entry: GameEnumVal) {
    return html`<tr>
      <td class="val">${toHex(entry.val)}</td>
      ${this.renderLabel(entry.label)}
      <td class="desc">${entry.desc}</td>
      ${this.renderNotes(entry.notes)}
    </tr>`;
  }

  private renderEnumDef(entry: GameEnum) {
    return html`<map-table
      .tableType="${TableType.EnumDef}"
      .entries="${entry.vals}"
      .structs="${this.structs}"
      .enums="${this.enums}"
      .hiddenColumns="${this.hiddenColumns}">
    </map-table>`
  }

  private renderRow(item: GameEntry) {
    switch (this.tableType) {
      case TableType.RamList:
      case TableType.DataList:
        const gd = item as GameData;
        return this.renderDataVarEntry(gd);
      case TableType.CodeList:
        const gc = item as GameCode;
        return this.renderCodeEntry(gc);
      case TableType.StructList:
        const gs = item as GameStruct;
        return this.renderStructEntry(gs);
      case TableType.EnumList:
        const ge = item as GameEnum;
        return this.renderEnumEntry(ge);
      case TableType.StructDef:
        const grv = item as GameRelVar;
        return this.renderStructVar(grv);
      case TableType.EnumDef:
        const gel = item as GameEnumVal;
        return this.renderEnumVal(gel);
      default:
        throw new Error('Invalid TableType');
    }
  }

  override render() {
    return html`
      <table class="${this.isMainTable() ? 'main-table' : 'sub-table'}">
        <tr id="heading-row">
          ${this.getHeadings().map(heading => html`
            <th>${heading}</th>`)}
        </tr>
        ${this.entries.map((item: GameEntry) => {
          return this.renderRow(item);
        })}
      </table>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'map-table': MapTable;
  }
}
