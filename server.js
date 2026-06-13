const express = require('express');
const os = require('os');
const path = require('path');
const promClient = require('prom-client');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Prometheus: recolectar métricas por defecto de Node.js (CPU, Memoria, Event Loop, etc.)
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ register: promClient.register });

// Métrica personalizada: Contador de requests HTTP
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total de requests HTTP recibidas',
  labelNames: ['method', 'route', 'status_code']
});

// Middleware para contar todas las requests
app.use((req, res, next) => {
  res.on('finish', () => {
    // Registramos la métrica cada vez que termina un request
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route ? req.route.path : req.path,
      status_code: res.statusCode
    });
  });
  next();
});

// Endpoint que Prometheus llamará para leer las métricas
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', promClient.register.contentType);
    const metrics = await promClient.register.metrics();
    res.end(metrics);
  } catch (ex) {
    res.status(500).end(ex.message);
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/info', (req, res) => {
  res.json({
    hostname: os.hostname(),
    platform: os.platform(),
    architecture: os.arch(),
    nodeVersion: process.version,
    uptime: os.uptime()
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
