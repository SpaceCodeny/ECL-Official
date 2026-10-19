/**
 * Vercel serverless function handler.
 * Este arquivo é o ponto de entrada para todas as requisições na Vercel.
 */

// Flag de serverless
process.env.SERVERLESS = "true";

let app = null;

module.exports = (req, res) => {
  if (!app) {
    const { createApp } = require("../dist/app");
    app = createApp();
  }
  app(req, res);
};
