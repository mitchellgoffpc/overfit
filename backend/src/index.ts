import { createApp } from "app";
import { loadConfig } from "config";
import { createDatabase } from "db";

const configPath = process.argv[2];
const config = loadConfig(configPath);
const db = await createDatabase(config.db);
const app = createApp(db);

app.listen(config.server.port, () => {
  console.log(`Backend listening on http://localhost:${String(config.server.port)}`);
});
