import { LitElement, html, css } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import {
  InfoEntry, VarEntry, DataEntry, StructVarEntry, StructEntryDict,
  EnumEntryDict, CodeEntry, EnumValEntry, StructEntry, EnumEntry, DataType
} from './info-entry';
import { toHex } from './utils';
import {
  TableType, KEY_ADDR, KEY_CAT, KEY_DESC, KEY_NAME, KEY_LEN,
  KEY_OFF, KEY_PARAMS, KEY_RET, KEY_SIZE, KEY_TYPE, KEY_VAL, KEY_VALS,
  KEY_VARS, CATEGORIES, getHeading
} from './constants';

const grayBorder = css`1px solid #808080`;
const font = css`Menlo, Monaco, "Courier New", monospace`;

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
    .name,
    .offset,
    .size,
    .type,
    .val {
      padding-top: 4px;
    }

    .addr,
    .length,
    .offset,
    .size,
    .type,
    .val {
      font-family: ${font};
      text-align: right;
    }
    
    .type {
      max-width: 350px;
    }

    .name-span {
      max-width: 350px;
      display: inline-block;
      word-wrap: break-word;
      color: #9cdcfe;
      font-family: ${font};
    }

    .desc {
      max-width: 350px;
    }
    
    .params {
      max-width: 350px;
    }

    .returns {
      min-width: 150px;
      max-width: 250px;
    }

    .code-var {
      font-family: ${font};
    }

    .code-var-desc {
      font-size: 80%;
      border: ${grayBorder};
      padding: 3px 5px;
      margin: 5px 0px 2px 0px;
    }

    .has-tooltip {
      cursor: help;
      text-decoration: underline dotted;
      text-decoration-thickness: from-font;
    }

    .expand {
      color: #a0a0e0;
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
  @property({ type: Array }) entries: InfoEntry[] = [];
  /** All struct definitions in the game */
  @property({ type: Object }) structs: StructEntryDict = {};
  /** All enum definitions in the game */
  @property({ type: Object }) enums: EnumEntryDict = {};
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
    // Recursively update sub-tables
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
        return [KEY_ADDR, KEY_LEN, KEY_CAT, KEY_TYPE, KEY_NAME, KEY_DESC];
      case TableType.CodeList:
        return [KEY_ADDR, KEY_LEN, KEY_NAME, KEY_PARAMS, KEY_RET, KEY_DESC];
      case TableType.StructList:
        return [KEY_SIZE, KEY_NAME, KEY_VARS, KEY_DESC];
      case TableType.EnumList:
        return [KEY_NAME, KEY_VALS, KEY_DESC];
      case TableType.StructDef:
        return [KEY_OFF, KEY_LEN, KEY_TYPE, KEY_NAME, KEY_DESC];
      case TableType.EnumDef:
        return [KEY_VAL, KEY_NAME, KEY_DESC];
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

  private renderVarLength(entry: VarEntry) {
    if (this.hiddenColumns.has(KEY_LEN)) {
      return '';
    }
    const len = toHex(entry.getLength(this.structs));
    const toolTip = entry.getLengthToolTip(this.structs);
    return html`<td
      class="length ${toolTip ? 'has-tooltip' : 'no-tooltip'}"
      title="${toolTip}">${len}</td>`;
  }

  private hasSubTable(entry: InfoEntry): Boolean {
    if (entry instanceof VarEntry) {
      const ve = entry as VarEntry;
      const isEnum = Boolean(ve.enum) && ve.enum! in this.enums;
      const isStruct = ve.baseType === DataType.Struct;
      return isEnum || isStruct;
    } else if (entry instanceof StructEntry ||
      entry instanceof EnumEntry) {
      return true;
    }
    return false;
  }

  private renderSubTable(entry: InfoEntry) {
    if (entry instanceof VarEntry) {
      const ve = entry as VarEntry;
      if (ve.enum && ve.enum! in this.enums) {
        const ee: EnumEntry = this.enums[ve.enum!];
        return this.renderEnumDef(ee);
      } else if (ve.structName && ve.structName! in this.structs) {
        const se = this.structs[ve.structName!];
        let pa = NaN;
        if (!ve.isPtr) {
          if (this.tableType === TableType.RamList ||
            this.tableType === TableType.DataList) {
            pa = (entry as DataEntry).addr;
          } else if (this.parentAddr) {
            pa = this.parentAddr + (entry as StructVarEntry).offset;
          }
        }
        return this.renderStructDef(se, pa);
      }
    } else if (entry instanceof StructEntry) {
      return this.renderStructDef(entry as StructEntry);
    } else if (entry instanceof EnumEntry) {
      return this.renderEnumDef(entry as EnumEntry);
    }
    return '';
  }

  private renderToggleAndTable(entry: InfoEntry) {
    let toggle: any = '';
    let table: any = '';
    if (this.hasSubTable(entry)) {
      const key = entry.name;
      const expanded = this.expandedItems.has(key);
      toggle = html`<span class="expand" data-expand-key="${key}"
        @click="${this.expand}">[${expanded ? '−' : '+'}]</span>`;
      if (expanded) {
        table = this.renderSubTable(entry);
      }
    }
    return [toggle, table];
  }

  private renderName(entry: InfoEntry) {
    const [toggle, table] = this.renderToggleAndTable(entry);
    return html`<td class="name">
      <span class="name-span">${entry.name}</span>${toggle}
      ${table}
    </td>`;
  }

  private renderDesc(desc?: string) {
    if (this.hiddenColumns.has(KEY_DESC)) {
      return '';
    }
    return html`<td class="desc">${desc}</td>`
  }

  private renderDataEntry(entry: DataEntry) {
    return html`<tr>
      <td class="addr">${toHex(entry.addr)}</td>
      ${this.renderVarLength(entry)}
      ${this.renderCat(entry.catStr())}
      ${this.renderType(entry.typeStr())}
      ${this.renderName(entry)}
      ${this.renderDesc(entry.desc)}
    </tr>`;
  }

  private renderCodeLength(entry: CodeEntry) {
    if (this.hiddenColumns.has(KEY_LEN)) {
      return '';
    }
    const toolTip = entry.getToolTip();
    return html`<td class="length ${toolTip ? 'has-tooltip' : 'no-tooltip'}"
      title="${toolTip}">${toHex(entry.size)}
    </td>`;
  }

  private renderCodeVar(ve: VarEntry, paramIdx: number, entryName: string) {
    let codeVar = html`<span class="inline-type">${ve.typeStr()}</span>`;
    if (paramIdx >= 0) {
      codeVar = html`${codeVar} <span class="name-span">${ve.name}</span>`
    }
    let toggle: any = '';
    let descBox: any = '';
    if (ve.desc) {
      const key = `${entryName}:${paramIdx}`;
      const expanded = this.expandedItems.has(key);
      toggle = html`<span class="expand" data-expand-key="${key}"
        @click="${this.expand}">[?]</span>`;
      if (expanded) {
        descBox = html`<div class="code-var-desc">${ve.desc}</div>`
      }
    }
    return html`<div><span class="code-var">${codeVar}</span>${toggle}${descBox}</div>`;
  }

  private renderCodeParams(entry: CodeEntry) {
    if (this.hiddenColumns.has(KEY_PARAMS)) {
      return '';
    }
    const params = entry.params;
    if (!params) {
      return html`<td class="params"><span class="code-var">void</span></td>`;
    }
    return html`<td class="params">${params.map(
      (p, pIdx) => this.renderCodeVar(p, pIdx, entry.name))}
    </td>`;
  }

  private renderCodeRet(entry: CodeEntry) {
    if (this.hiddenColumns.has(KEY_RET)) {
      return '';
    }
    const ret = entry.return;
    if (!ret) {
      return html`<td class="returns"><span class="code-var">void</span></td>`;
    }
    return html`<td class="returns">${this.renderCodeVar(ret, -1, entry.name)}</td>`;
  }

  private renderCodeEntry(entry: CodeEntry) {
    return html`<tr>
      <td class="addr">${toHex(entry.addr)}</td>
      ${this.renderCodeLength(entry)}
      <td class="name">
        <span class="name-span">${entry.name}</span>
      </td>
      ${this.renderCodeParams(entry)}
      ${this.renderCodeRet(entry)}
      ${this.renderDesc(entry.desc)}
    </tr>`;
  }

  private renderStructSize(size: number) {
    if (this.hiddenColumns.has(KEY_SIZE)) {
      return '';
    }
    return html`<td class="size">${toHex(size)}</td>`;
  }

  private renderStructEntry(entry: StructEntry) {
    const [toggle, table] = this.renderToggleAndTable(entry);
    const vars = html`<td class="vars">${toggle}${table}</td>`;
    return html`<tr>
      ${this.renderStructSize(entry.size)}
      <td class="name">
        <span class="name-span">${entry.name}</span>
      </td>
      ${vars}
      ${this.renderDesc(entry.desc)}
    </tr>`;
  }

  private renderEnumEntry(entry: EnumEntry) {
    const [toggle, table] = this.renderToggleAndTable(entry);
    const vals = html`<td class="vals">${toggle}${table}</td>`;
    return html`<tr>
      <td class="name">
        <span class="name-span">${entry.name}</span>
      </td>
      ${vals}
      ${this.renderDesc(entry.desc)}
    </tr>`;
  }

  private renderStructVar(entry: StructVarEntry) {
    const toolTip = entry.getOffsetToolTip(this.parentAddr);
    // Structs can have categories, but they're left out to save space
    return html`<tr>
      <td class="offset ${toolTip ? 'has-tooltip' : 'no-tooltip'}"
        title="${toolTip}">
        ${toHex(entry.offset)}
      </td>
      ${this.renderVarLength(entry)}
      ${this.renderType(entry.typeStr())}
      ${this.renderName(entry)}
      ${this.renderDesc(entry.desc)}
    </tr>`;
  }

  private renderStructDef(entry: StructEntry, parentAddr: number = NaN) {
    return html`<map-table
      .tableType="${TableType.StructDef}"
      .entries="${entry.vars}"
      .structs="${this.structs}"
      .enums="${this.enums}"
      .parentAddr="${parentAddr}"
      .hiddenColumns="${this.hiddenColumns}">
    </map-table>`
  }

  private renderEnumVal(entry: EnumValEntry) {
    return html`<tr>
      <td class="val">${toHex(entry.val)}</td>
      <td class="name">${entry.name}</td>
      ${this.renderDesc(entry.desc)}
    </tr>`;
  }

  private renderEnumDef(entry: EnumEntry) {
    return html`<map-table
      .tableType="${TableType.EnumDef}"
      .entries="${entry.vals}"
      .structs="${this.structs}"
      .enums="${this.enums}"
      .hiddenColumns="${this.hiddenColumns}">
    </map-table>`
  }

  private renderRow(item: InfoEntry) {
    switch (this.tableType) {
      case TableType.RamList:
      case TableType.DataList:
        const de = item as DataEntry;
        return this.renderDataEntry(de);
      case TableType.CodeList:
        const ce = item as CodeEntry;
        return this.renderCodeEntry(ce);
      case TableType.StructList:
        const se = item as StructEntry;
        return this.renderStructEntry(se);
      case TableType.EnumList:
        const ee = item as EnumEntry;
        return this.renderEnumEntry(ee);
      case TableType.StructDef:
        const sve = item as StructVarEntry;
        return this.renderStructVar(sve);
      case TableType.EnumDef:
        const eve = item as EnumValEntry;
        return this.renderEnumVal(eve);
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
        ${this.entries.map((item: InfoEntry) => {
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
