// import { io, Socket } from "socket.io-client";
const rawWs = globalThis.WebSocket;
// 先简单的屏蔽掉 ws 连接
// 没有 ws 的话应该会很容易导致多端使用的情况下互相覆盖写，再想想吧
class _WebSocket {
  //   io: Socket;
  constructor(public path: string) {
    // const socket = io(path);
    // this.io = socket;
    // socket.io.on("open", () => {
    //   console.log("链接成功");
    //   this.onopen();
    // });
    // socket.io.on("close", (ev) => {
    //   console.log("disconnect", ev);
    // //   this.onclose();
    // });
    // socket.io.on("error", (ev) => {
    //   console.log("error", ev);
    // //   this.onclose();
    // });
  }
  onmessage(ev: any) {}
  send(_msg: string) {}
  onopen() {}
  onerror() {}
  onclose() {}
}
//@ts-ignore
globalThis.WebSocket = _WebSocket;
