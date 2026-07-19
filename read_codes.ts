import fs from 'fs';
import path from 'path';

const BOT_STORAGE_FILE = path.join(process.cwd(), "telegram_bot_codes.json");
if (fs.existsSync(BOT_STORAGE_FILE)) {
  console.log("File content:", fs.readFileSync(BOT_STORAGE_FILE, "utf-8"));
} else {
  console.log("File does not exist!");
}
