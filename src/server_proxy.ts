import http from "http";
import WebSocket from "ws";
import { readFile } from "fs/promises";
import { spawn } from "child_process";
import { HTTP_WebSocket } from "./http_websocket";
let kernelHOST = "127.0.0.1";
let kernelPort = 6806;
const port = 9000;

const id_ws = new Map<string, { ws: WebSocket; msg: any[] }>();
const cookie_id = {} as { [key: string]: Set<string> };
let kernelStartStatus = false;
const kernelStartStatus_p = new Promise<true>(async (r) => {
  while (1) {
    await sleep(5);
    if (kernelStartStatus) {
      break;
    }
  }
  r(true);
});
const proxy = http.createServer(async (req, res) => {
  await kernelStartStatus_p;
  const isRootHtml =
    req.url?.startsWith("/stage/build/desktop/") ||
    req.url?.startsWith("/ocean_press_siyuan_proxy.js");
  const url = new URL(`http://${kernelHOST}:${kernelPort}${req.url}`);
  if (req.url?.startsWith("/ocean_press_siyuan_proxy.js")) {
    const script = await readFile("./dist/client/client_proxy.global.js", "utf-8");
    res.end(script);
    return;
  }
  if (req.url?.startsWith("/siyuan_serverless_api")) {
    const event: HTTP_WebSocket.Event & { reqId: string } = await new Promise((r) => {
      let body = "";
      req.on("data", (data) => (body += data));
      req.on("end", () => r(JSON.parse(body)));
    });
    const reqId = event.reqId;
    const cookie = req.headers.cookie;
    if (!cookie) {
      throw "没有传递正确的 cookie";
    }
    if (cookie_id[cookie] === undefined) {
      cookie_id[cookie] = new Set();
    }
    cookie_id[cookie].add(reqId);
    if (event.type == "open") {
      const path = event.path.split("/ws");
      /** 移除前面的协议url */
      path.shift();
      const wsPath = `ws://${kernelHOST}:${kernelPort}/ws${path.join("")}`;
      const ws = new WebSocket(wsPath, {
        headers: { cookie },
      });

      id_ws.get(reqId)?.ws.close();
      id_ws.set(reqId, { ws, msg: [] });

      ws.addEventListener("open", (ev) => {
        console.log("open", wsPath);
        setInterval(() => {
          ws.send(
            JSON.stringify({
              cmd: "ping",
              reqId: Date.now(),
              param: {},
            }),
          );
        }, 1_000);

        sendEvent(event);
      });
      ws.addEventListener("message", (ev) => {
        // console.log(ev.data);
        const msg = id_ws.get(reqId)!.msg;
        msg.push(ev.data);
      });
      ws.addEventListener("error", (ev) => {
        console.log("error", ev.message);
      });
      ws.addEventListener("close", (ev) => {
        console.log("close", ev.reason);
      });
    } else if (event.type == "sync") {
      const loginIds = event.ids?.filter((id) => !id_ws.has(id)) ?? [];
      // 代理客户端传达的消息
      Object.keys(event.msgs).forEach((reqId) => {
        const ws = id_ws.get(reqId)?.ws;
        if (!ws) {
          console.error("未登录的客户端发送了信息", reqId);
          return;
        }
        const msg = event.msgs[reqId];
        msg.forEach((data) => ws.send(data));
      });
      const msgs: HTTP_WebSocket.SyncEvent["msgs"] = {};
      event.ids
        .filter((id) => id_ws.has(id))
        .forEach((reqId) => {
          const msg = id_ws.get(reqId)!.msg;
          id_ws.get(reqId)!.msg = [];
          msgs[reqId] = msg;
          if (msg.length > 0) console.log(`${reqId} 同步 ${msg.length} 条消息`);
        });
      sendEvent({ type: "sync", msgs, ids: loginIds });
    }
    function sendEvent(e: HTTP_WebSocket.Event) {
      res.end(JSON.stringify(e));
    }
    return;
  }
  const proxyReq = http.request(
    {
      host: kernelHOST,
      port: kernelPort,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        ...(isRootHtml ? { "Accept-Encoding": "" } : {}),
      },
    },
    async (proxyRes) => {
      if (url.pathname === "/stage/build/desktop/") {
        let body = "";
        proxyRes.addListener("data", (chunk) => {
          body += chunk;
        });
        proxyRes.addListener("end", () => {
          const i = body.indexOf("<script");
          const p = body.substring(0, i);
          const n = body.substring(i);

          const newHtml =
            p + `<script defer="defer" src="/ocean_press_siyuan_proxy.js"></script>` + n;
          /** 不重新计算长度，会出现html被截断的问题 */
          res.writeHead(proxyRes.statusCode!, {
            ...proxyRes.headers,
            "content-length": newHtml.length,
          });

          res.end(newHtml);
        });
      } else {
        res.writeHead(proxyRes.statusCode!, proxyRes.headers);
        proxyRes.pipe(res);
      }
    },
  );
  proxyReq.on("error", (err) => {
    res.writeHead(500);

    res.end(err.message);
  });
  req.pipe(proxyReq);
});
kernelStartStatus_p.then(() => {
  proxy.listen(port, () => {
    console.log(`Proxy server is running on port ${port}`);
  });
});

const programPath = `./resources/kernel/SiYuan-Kernel`;
// const workingDirectory = "/code/";
const workingDirectory = "./";

const siyuanArg = process.env.siyuanArg;
if (!siyuanArg) throw "请设置思源启动参数";
// 启动另一个程序，并指定工作目录
const childProcess = spawn(programPath, siyuanArg.split(" "), {
  cwd: workingDirectory,
});

function log(data: any) {
  const t = data.toString() as string;
  /** 判断日志中 内核是否已监听端口，TODO 应该改成更好的实现 */
  const reg = /kernel \[pid=(\d+)\] http server \[(.+):(\d+)] is booting/;
  if (!kernelStartStatus && reg.test(t)) {
    kernelStartStatus = true;
    const [_, _pid, host, port] = t.match(reg)!;
    kernelHOST = host;
    kernelPort = parseInt(port);
  }
  console.log(t);
}
childProcess.stdout.on("data", log);
childProcess.stderr.on("data", log);
// 监听子进程的退出事件
childProcess.on("exit", (code, signal) => {
  console.log(`子进程退出，退出码：${code}`);
  process.exit(code ?? 0);
});
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
