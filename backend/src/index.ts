import { createApp } from "app";
import { loadConfig } from "config";
import { createDatabase } from "db";
import { createStorage } from "storage";

const args = process.argv.slice(2);
const configPath = args[0] && !args[0].includes("=") ? args[0] : undefined;
const overrides = configPath ? args.slice(1) : args;
const config = loadConfig(configPath, overrides);
const db = await createDatabase(config.db);
const storage = createStorage(config.storage);
const app = createApp(db, storage, config.logBuffer);

app.listen(config.server.port, () => {
  console.log(`Backend listening on http://localhost:${String(config.server.port)}`);
});
