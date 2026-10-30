/**
 * TinyEmitter - 轻量级事件发射器 (ES Module + CommonJS 双兼容)
 */
export default class TinyEmitter {
  constructor() {
    this._events = {};
  }

  on(event, fn, ctx) {
    if (!this._events) this._events = {};
    (this._events[event] = this._events[event] || []).push({ fn, ctx });
    return this;
  }

  once(event, fn, ctx) {
    const self = this;
    function listener(...args) {
      self.off(event, listener);
      fn.apply(ctx || this, args);
    }
    listener._original = fn;
    return this.on(event, listener, ctx);
  }

  emit(event, ...args) {
    if (!this._events || !this._events[event]) return this;
    const listeners = this._events[event].slice();
    for (let i = 0; i < listeners.length; i++) {
      listeners[i].fn.apply(listeners[i].ctx || this, args);
    }
    return this;
  }

  off(event, fn) {
    if (!this._events || !this._events[event]) return this;
    if (!fn) {
      delete this._events[event];
      return this;
    }
    this._events[event] = this._events[event].filter(
      (item) => item.fn !== fn && item.fn._original !== fn
    );
    return this;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TinyEmitter;
  module.exports.TinyEmitter = TinyEmitter;
}