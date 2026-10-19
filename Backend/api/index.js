/**
 * Vercel Serverless Function — Elite Champions League API
 *
 * Este arquivo é o entry point que a Vercel invoca para cada request HTTP.
 * Ele delega para o handler NestJS compilado em dist/serverless.js.
 */

// O handler é uma função async (req, res) exportada como default
module.exports = require("../dist/serverless").default;
