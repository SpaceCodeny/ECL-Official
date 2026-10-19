import { createApp } from "./app";
import { config } from "./config/environment";
import { prisma } from "./database/prisma";

async function main() {
  try {
    // Testa conexão com o banco
    await prisma.$connect();
    console.log(`[Server] Conectado ao banco de dados`);

    const app = createApp();
    const port = config.PORT;

    app.listen(port, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║  ${config.APP_NAME.padEnd(54)} ║
╠════════════════════════════════════════════════════════════╣
║  🚀 Servidor rodando                                       ║
║  📍 Ambiente: ${config.NODE_ENV.padEnd(44)} ║
║  🌐 Porta: ${port.toString().padEnd(47)} ║
║  📡 API: http://localhost:${port}/api/v1${" ".padEnd(19)} ║
║  📚 Docs: http://localhost:${port}/docs${" ".padEnd(20)} ║
║  ❤️  Health: http://localhost:${port}/health${" ".padEnd(17)} ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error("[Server] Erro ao iniciar:", error);
    process.exit(1);
  }
}

void main();
