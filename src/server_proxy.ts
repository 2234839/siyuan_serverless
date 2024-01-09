import http from "http";
import WebSocket from "ws";
import { readFile } from "fs/promises";
import { spawn } from "child_process";
let ws: WebSocket;

const reqId = 1;
const proxy = http.createServer(async (req, res) => {
  console.log(req.url);

  const isRootHtml =
    req.url?.startsWith("/stage/build/desktop/") ||
    req.url?.startsWith("/ocean_press_siyuan_proxy.js");
  if (req.headers.cookie) {
    if (!ws) {
      ws = new WebSocket("ws://127.0.0.1:6806/ws", {
        headers: req.headers,
      });
      ws.addEventListener("open", (ev) => {
        console.log("open");
        // 防止内核自动退出
        setInterval(() => {
          ws.send(
            JSON.stringify({
              cmd: "ping",
              reqId: reqId,
              param: {},
            }),
          );
        }, 5_000);
      });
      ws.addEventListener("message", (ev) => {});
      ws.addEventListener("error", (ev) => {});
    }
  }
  if (req.url?.startsWith("/ocean_press_siyuan_proxy.js")) {
    const script = await readFile("./dist/client/client_proxy.global.js", "utf-8");
    res.end(script);
    return;
  }
  const proxyReq = http.request(
    {
      host: "127.0.0.1",
      port: 6806,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        ...(isRootHtml ? { "Accept-Encoding": "" } : {}),
      },
    },
    async (proxyRes) => {
      res.writeHead(proxyRes.statusCode!, proxyRes.headers);
      if (req.url?.startsWith("/stage/build/desktop/")) {
        console.log("============");
        let body = "";
        proxyRes.addListener("data", (chunk) => {
          body += chunk;
        });
        proxyRes.addListener("end", () => {
          res.end(
            body.replace(/<script/, `<script src="/ocean_press_siyuan_proxy.js"></script><script`),
          );
        });
      } else {
        proxyRes.pipe(res);
      }
    },
  );
  proxyReq.on("error", (err) => {
    res.writeHead(500, "无法连接思源核心");
    res.end(err.message);
  });
  req.pipe(proxyReq);
});
const port = 9000;
proxy.listen(port, () => {
  console.log(`Proxy server is running on port ${port}`);
});
const programPath = "./resources/kernel/SiYuan-Kernel";
const workingDirectory = "/code/";

// 启动另一个程序，并指定工作目录
const childProcess = spawn(
  programPath,
  process.env.siyuanArg
    ? process.env.siyuanArg.split(" ")
    : [
        "-wd",
        "./resources/",
        "-workspace",
        "/data/wd",
        "-lang",
        "zh_CN",
        "-accessAuthCode",
        "ssrkqdj6unz1p3gg",
        "-alsologtostderr",
        "./err.log",
        "-log_dir",
        "/data/wd",
      ],
  {
    cwd: workingDirectory,
  },
);
childProcess.stdout.on("data", (data) => console.log(data.toString()));
childProcess.stderr.on("data", (data) => console.error(data.toString()));
// 监听子进程的退出事件
childProcess.on("exit", (code, signal) => {
  console.log(`子进程退出，退出码：${code}`);
});
