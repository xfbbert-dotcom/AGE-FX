import { DEFAULT_DATA_ROOT, DEFAULT_SERVICE_PORT } from "./config.js";
import { openAgeDatabase } from "./db/client.js";
import { createServer } from "./server.js";

const dataRoot = process.env.AGE_FX_DATA_ROOT ?? DEFAULT_DATA_ROOT;
const port = Number(process.env.PORT ?? DEFAULT_SERVICE_PORT);

const db = openAgeDatabase(dataRoot);
const app = createServer(db, dataRoot);

app.listen(port, "127.0.0.1", () => {
  console.log(`AGE-FX companion service listening at http://127.0.0.1:${port}`);
  console.log(`AGE-FX data root: ${dataRoot}`);
});
