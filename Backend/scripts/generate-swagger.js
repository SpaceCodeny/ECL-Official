/**
 * Script para gerar o arquivo swagger.json durante o build
 */
const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Elite Champions League API',
      version: '1.0.0',
      description: 'API REST da Elite Champions League — torneios de Standoff 2',
    },
    servers: [
      {
        url: process.env.APP_URL || 'http://localhost:3000',
        description: 'API server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

// Cria a pasta dist se não existir
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Salva o swagger spec
const outputPath = path.join(distDir, 'swagger.json');
fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));

console.log(`✅ Swagger spec gerado em: ${outputPath}`);
