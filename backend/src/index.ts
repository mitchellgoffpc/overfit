import { createApp } from "app";
import { loadConfig } from "config";
import { createDatabase } from "db";

const args = process.argv.slice(2);
const configPath = args[0];
const config = loadConfig(configPath);
const db = await createDatabase(config.db);
const app = createApp(config, db);

app.listen(config.server.port, () => {
  console.log(`Backend listening on http://localhost:${String(config.server.port)}`);
});
