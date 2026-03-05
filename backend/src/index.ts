import { createApp } from "app";
import { loadConfig } from "config";

const configPath = process.argv[2];
const config = loadConfig(configPath);
const app = await createApp(config);

app.listen(config.server.port, () => {
  console.log(`Backend listening on http://localhost:${String(config.server.port)}`);
});
