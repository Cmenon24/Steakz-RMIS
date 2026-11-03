// starts the actual http server and listens for incoming requests
import "dotenv/config";
import app from "./app.js";

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`
========================================
       STEAKZ RMIS BACKEND
========================================
  Environment: ${process.env.NODE_ENV || "development"}
  Port:        ${PORT}
  API:         http://localhost:${PORT}
  Health:      http://localhost:${PORT}/api/v1/health
========================================
  `);
});
