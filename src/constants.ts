import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// dist/constants.js -> ../assets
export const ASSETS_DIR = path.resolve(__dirname, "..", "assets");
export const ICONS_JSON_PATH = path.join(ASSETS_DIR, "icons.json");
export const ICONS_DIR = path.join(ASSETS_DIR, "icons");

export const CHARACTER_LIMIT = 25000;
