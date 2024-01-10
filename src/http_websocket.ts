class MsgEvent extends Event {
  constructor(type: string, public data: string) {
    super(type);
  }
}
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
const allWebSocket: HTTP_WebSocket[] = [];
const local_msgs: HTTP_WebSocket.SyncEvent["msgs"] = {};
/** 消息轮询，思源目前至少有三条 ws 链接，sync 方法被我实现成复用逻辑，用于减少请求调用次数 */
async function loop() {
  if (allWebSocket.length === 0) return;
  if (document.hidden) {
    /** 在不可见的状态下，不去进行网络相关操作，更契合serverless的特性 */
    return;
  }
  const msgs = { ...local_msgs };
  /** 本地存储的信息被发送了，所以删掉 */
  Object.keys(local_msgs).forEach((id) => delete local_msgs[id]);

  const res = await HTTP_WebSocket.post(
    { type: "sync", msgs, ids: allWebSocket.map((el) => el.reqId) },
    "",
  );
  if (res.type !== "sync") throw "错误的返回值";
  /** 重新连接 */
  for (const id of res.ids ?? []) {
    allWebSocket.find((w) => w.reqId === id)?.login();
  }

  for (const r of Object.keys(res.msgs)) {
    const ws = allWebSocket.find((w) => w.reqId === r);
    if (!ws) return;
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
    await sleep(1_100);
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

export class HTTP_WebSocket extends EventTarget implements WebSocket {
  public reqId: string;
  constructor(public path: string | URL, protocols?: string | string[] | undefined) {
    super();
    this.reqId = path.toString().match(/.+id=(.*)&.+/)![1];
    allWebSocket.push(this);
  }
  login() {
    HTTP_WebSocket.post(
      {
        type: "open",
        path: this.path.toString(),
      },
      this.reqId,
    ).then((e) => {
      const ev = new Event("open");
      this.dispatchEvent(ev);
      this.onopen(ev);
    });
  }
  static async post(p: HTTP_WebSocket.Event, reqId: string) {
    return await fetch("/siyuan_serverless_api", {
      body: JSON.stringify({ ...p, reqId }),
      method: "POST",
    }).then((r) => r.json() as Promise<HTTP_WebSocket.Event>);
  }
  /** 法将需要通过 WebSocket 链接传输至服务器的数据排入队列，
   * 并根据所需要传输的 data bytes 的大小来增加 bufferedAmount的值。
   * 若数据无法传输（例如数据需要缓存而缓冲区已满）时，套接字会自行关闭。 */
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    if (local_msgs[this.reqId] === undefined) {
      local_msgs[this.reqId] = [];
    }
    local_msgs[this.reqId].push(data.toString());
  }
  /** 关闭 WebSocket 连接或连接尝试（如果有的话）。如果连接已经关闭，则此方法不执行任何操作。 */
  close(
    /** 一个数字状态码，它解释了连接关闭的原因。如果没有传这个参数，默认使用 1005。CloseEvent的允许的状态码见状态码列表 。 */
    code?: number,
    /** 一个人类可读的字符串，它解释了连接关闭的原因。这个 UTF-8 编码的字符串不能超过 123 个字节。 */
    reason?: string,
  ) {
    console.log("close");
  }
  onclose(e: CloseEvent) {}
  onerror(e: Event) {}
  onmessage(e: MsgEvent) {
    console.log(e);
  }
  onopen(e: Event) {}

  /** 返回值为当构造函数创建WebSocket实例对象时 URL 的绝对路径。 */
  get url(): string {
    throw "未实现";
  }
  /** 返回当前 WebSocket 的链接状态  https://developer.mozilla.org/zh-CN/docs/Web/API/WebSocket/readyState */
  get readyState(): 0 | 1 | 2 | 3 {
    throw "未实现";
  }
  get protocol(): string {
    throw "未实现";
  }
  /** 返回服务器已选择的扩展值。https://developer.mozilla.org/zh-CN/docs/Web/API/WebSocket/extensions */
  get extensions(): string {
    throw "未实现";
  }
  /** 返回已经被send()方法放入队列中但还没有被发送到网络中的数据的字节数。https://developer.mozilla.org/zh-CN/docs/Web/API/WebSocket/bufferedAmount */
  get bufferedAmount(): number {
    throw "未实现";
  }
  /** 返回 websocket 连接所传输二进制数据的类型。 "blob" "arraybuffer" */
  get binaryType(): "arraybuffer" | "blob" {
    throw "未实现";
  }
  //  常量 https://developer.mozilla.org/zh-CN/docs/Web/API/WebSocket#%E5%B8%B8%E9%87%8F
  /** 正在链接中 */
  readonly CONNECTING = 0 as const;
  /** 已经链接并且可以通讯 */
  readonly OPEN = 1 as const;
  /** 连接正在关闭 */
  readonly CLOSING = 2 as const;
  /** 连接已关闭或者没有链接成功 */
  readonly CLOSED = 3 as const;
}
export namespace HTTP_WebSocket {
  export const CONNECTING = 0 as const;
  export const OPEN = 1 as const;
  export const CLOSING = 2 as const;
  export const CLOSED = 3 as const;
  export type Event = OpenEvent | SyncEvent | LoginEvent;
  export interface OpenEvent {
    type: "open";
    path: string;
  }
  export interface SyncEvent {
    type: "sync";
    /** 客户端向服务端同步时，全体客户端的id，服务端会进行判定，当对应id服务端不存在对应链路时，重新登录 */
    ids: string[];
    msgs: { [reqId: string]: string[] };
  }
  export interface LoginEvent {
    type: "login";
  }
}
