import { createServer } from "http";
import app from "./server/app.js";
import { loadConfig } from "./server/util/config.js";
import { connectMongo } from "./server/util/mongo.js";
import { connectVectorMongo } from "./server/util/vectorMongo.js";

const config = loadConfig();

async function main() {
  // Connect to both databases
  await connectMongo(config); // Original database
  await connectVectorMongo(); // Vector search database
  const server = createServer(app);
  server.listen(config.PORT, () => {
    console.log(`API listening on http://0.0.0.0:${config.PORT}`);
  });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
