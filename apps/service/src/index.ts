import { DEFAULT_DATA_ROOT, DEFAULT_SERVICE_PORT } from "./config.js";
import { openAgeDatabase } from "./db/client.js";
import { createServer } from "./server.js";

const dataRoot = process.env.AGE_FX_DATA_ROOT ?? DEFAULT_DATA_ROOT;
const port = parseServicePort(process.env.PORT);

const db = openAgeDatabase(dataRoot);
const app = createServer(db, dataRoot);

app.listen(port, "127.0.0.1", () => {
  console.log(`AGE-FX companion service listening at http://127.0.0.1:${port}`);
  console.log(`AGE-FX data root: ${dataRoot}`);
});

function parseServicePort(portValue: string | undefined): number {
  const rawPort = portValue ?? String(DEFAULT_SERVICE_PORT);
  const port = Number(rawPort);

  if (!/^\d+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(
      `Invalid PORT "${rawPort}". AGE-FX service PORT must be an integer from 1 to 65535.`
    );
    process.exit(1);
  }

  return port;
}
