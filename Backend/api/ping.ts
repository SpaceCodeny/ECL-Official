import type { IncomingMessage, ServerResponse } from "http";

/**
 * Endpoint de diagnóstico — retorna OK sem inicializar o NestJS.
 * Usado para confirmar que a infraestrutura Vercel funciona.
 */
export default function handler(_req: IncomingMessage, res: ServerResponse) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    status: "ok",
    timestamp: new Date().toISOString(),
    node: process.version,
    env: process.env.NODE_ENV,
    serverless: process.env.SERVERLESS,
  }));
}
