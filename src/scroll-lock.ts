import { ReactiveController, ReactiveControllerHost } from 'lit';

let count = 0;

function lock() {
  if (count++ === 0) {
    document.documentElement.style.overflow = 'hidden';
  }
}

function unlock() {
  if (count > 0 && --count === 0) {
    document.documentElement.style.overflow = '';
  }
}

export class ScrollLock implements ReactiveController {
  private locked = false;

  constructor(
    private host: ReactiveControllerHost,
    private isOpen: () => boolean,
  ) {
    host.addController(this);
  }

  hostUpdated() {
    const open = this.isOpen();
    if (open && !this.locked) { lock(); this.locked = true; }
    else if (!open && this.locked) { unlock(); this.locked = false; }
  }

  hostDisconnected() {
    if (this.locked) { unlock(); this.locked = false; }
  }
}
