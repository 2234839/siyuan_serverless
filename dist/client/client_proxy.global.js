(function () {
  'use strict';

  // src/client_proxy.ts
  var _WebSocket = class {
    //   io: Socket;
    constructor(path) {
      this.path = path;
    }
    onmessage(ev) {
    }
    send(_msg) {
    }
    onopen() {
    }
    onerror() {
    }
    onclose() {
    }
  };
  globalThis.WebSocket = _WebSocket;

})();
