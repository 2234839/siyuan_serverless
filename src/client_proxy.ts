import { HTTP_WebSocket } from "./http_websocket";

const rawWs = globalThis.WebSocket;
globalThis.WebSocket = HTTP_WebSocket;
