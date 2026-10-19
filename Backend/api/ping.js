/**
 * Endpoint simples de ping para verificar se o serverless está ativo.
 */
module.exports = (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "pong",
    timestamp: new Date().toISOString(),
  });
};
