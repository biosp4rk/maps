import { html, css, nothing } from 'lit';
import { colorText, colorMuted, grayBorder } from './theme';

export const dialogStyles = css`
  .dialog-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }
  .dialog {
    background: #202020;
    color: ${colorText};
    border: ${grayBorder};
    border-radius: 8px;
    min-width: 300px;
    max-width: 90%;
    max-height: 80vh;
    text-align: left;
    font-family: verdana, sans-serif;
    display: flex;
    flex-direction: column;
  }
  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 40px;
    flex-shrink: 0;
    padding: 16px 20px;
    border-bottom: ${grayBorder};
  }
  .dialog-header h2 {
    margin: 0;
    font-size: 120%;
  }
  .dialog-close {
    background: none;
    border: none;
    color: ${colorMuted};
    font-size: 18px;
    line-height: 1;
    padding: 6px 8px;
    border-radius: 5px;
    cursor: pointer;
  }
  .dialog-close:hover {
    background: #383838;
  }
  .dialog-body {
    overflow-y: auto;
    min-height: 0;
    padding: 16px 20px;
  }
  .dialog-body > :first-child {
    margin-top: 0;
  }
  .dialog-body > :last-child  {
    margin-bottom: 0;
  }
`;

export function renderDialog(
  open: boolean, title: unknown, body: unknown, onClose: () => void
) {
  if (!open) {
    return nothing;
  }
  return html`
    <div class="dialog-overlay" @click="${onClose}">
      <div class="dialog" @click="${(e: Event) => e.stopPropagation()}">
        <div class="dialog-header">
          <h2>${title}</h2>
          <button class="dialog-close" title="Close" @click="${onClose}">✕</button>
        </div>
        <div class="dialog-body">${body}</div>
      </div>
    </div>`;
}
