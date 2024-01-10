(function () {
  'use strict';

  // src/http_websocket.ts
  var MsgEvent = class extends Event {
    constructor(type, data) {
      super(type);
      this.data = data;
    }
  };
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  var allWebSocket = [];
  var local_msgs = {};
  async function loop() {
    if (allWebSocket.length === 0)
      return;
    if (document.hidden) {
      return;
    }
    const msgs = { ...local_msgs };
    Object.keys(local_msgs).forEach((id) => delete local_msgs[id]);
    const res = await HTTP_WebSocket.post(
      { type: "sync", msgs, ids: allWebSocket.map((el) => el.reqId) },
      ""
    );
    if (res.type !== "sync")
      throw "\u9519\u8BEF\u7684\u8FD4\u56DE\u503C";
    for (const id of res.ids ?? []) {
      allWebSocket.find((w) => w.reqId === id)?.login();
    }
    for (const r of Object.keys(res.msgs)) {
      const ws = allWebSocket.find((w) => w.reqId === r);
      if (!ws)
        return;
      for (const data of res.msgs[ws.reqId]) {
        const e = new MsgEvent("message", data);
        try {
          ws.onmessage(e);
        } catch (error) {
          console.log(error);
        }
        ws.dispatchEvent(e);
      }
    }
  }
  (async () => {
    while (1) {
      await sleep(1100);
      if (!document.getElementById("message")) {
        console.log("no!");
        continue;
      }
      try {
        await loop();
      } catch (error) {
        console.log(error);
      }
    }
  })();
  var HTTP_WebSocket = class _HTTP_WebSocket extends EventTarget {
    constructor(path, protocols) {
      super();
      this.path = path;
      //  常量 https://developer.mozilla.org/zh-CN/docs/Web/API/WebSocket#%E5%B8%B8%E9%87%8F
      /** 正在链接中 */
      this.CONNECTING = 0;
      /** 已经链接并且可以通讯 */
      this.OPEN = 1;
      /** 连接正在关闭 */
      this.CLOSING = 2;
      /** 连接已关闭或者没有链接成功 */
      this.CLOSED = 3;
      this.reqId = path.toString().match(/.+id=(.*)&.+/)[1];
      allWebSocket.push(this);
    }
    login() {
      _HTTP_WebSocket.post(
        {
          type: "open",
          path: this.path.toString()
        },
        this.reqId
      ).then((e) => {
        const ev = new Event("open");
        this.dispatchEvent(ev);
        this.onopen(ev);
      });
    }
    static async post(p, reqId) {
      return await fetch("/siyuan_serverless_api", {
        body: JSON.stringify({ ...p, reqId }),
        method: "POST"
      }).then((r) => r.json());
    }
    /** 法将需要通过 WebSocket 链接传输至服务器的数据排入队列，
     * 并根据所需要传输的 data bytes 的大小来增加 bufferedAmount的值。
     * 若数据无法传输（例如数据需要缓存而缓冲区已满）时，套接字会自行关闭。 */
    send(data) {
      if (local_msgs[this.reqId] === void 0) {
        local_msgs[this.reqId] = [];
      }
      local_msgs[this.reqId].push(data.toString());
    }
    /** 关闭 WebSocket 连接或连接尝试（如果有的话）。如果连接已经关闭，则此方法不执行任何操作。 */
    close(code, reason) {
      console.log("close");
    }
    onclose(e) {
    }
    onerror(e) {
    }
    onmessage(e) {
      console.log(e);
    }
    onopen(e) {
    }
    /** 返回值为当构造函数创建WebSocket实例对象时 URL 的绝对路径。 */
    get url() {
      throw "\u672A\u5B9E\u73B0";
    }
    /** 返回当前 WebSocket 的链接状态  https://developer.mozilla.org/zh-CN/docs/Web/API/WebSocket/readyState */
    get readyState() {
      throw "\u672A\u5B9E\u73B0";
    }
    get protocol() {
      throw "\u672A\u5B9E\u73B0";
    }
    /** 返回服务器已选择的扩展值。https://developer.mozilla.org/zh-CN/docs/Web/API/WebSocket/extensions */
    get extensions() {
      throw "\u672A\u5B9E\u73B0";
    }
    /** 返回已经被send()方法放入队列中但还没有被发送到网络中的数据的字节数。https://developer.mozilla.org/zh-CN/docs/Web/API/WebSocket/bufferedAmount */
    get bufferedAmount() {
      throw "\u672A\u5B9E\u73B0";
    }
    /** 返回 websocket 连接所传输二进制数据的类型。 "blob" "arraybuffer" */
    get binaryType() {
      throw "\u672A\u5B9E\u73B0";
    }
  };
  ((HTTP_WebSocket2) => {
    HTTP_WebSocket2.CONNECTING = 0;
    HTTP_WebSocket2.OPEN = 1;
    HTTP_WebSocket2.CLOSING = 2;
    HTTP_WebSocket2.CLOSED = 3;
  })(HTTP_WebSocket || (HTTP_WebSocket = {}));
  globalThis.WebSocket = HTTP_WebSocket;

})();
