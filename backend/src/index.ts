import { createApp } from "app";
import { loadConfig } from "config";
import { createDatabase } from "db";

const args = process.argv.slice(2);
const configPath = args[0] && !args[0].includes("=") ? args[0] : undefined;
const overrides = configPath ? args.slice(1) : args;
const config = loadConfig(configPath, overrides);
const db = await createDatabase(config.db);
const app = createApp(db);

app.listen(config.server.port, () => {
  console.log(`Backend listening on http://localhost:${String(config.server.port)}`);
});
