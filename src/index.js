import { Client, GatewayIntentBits, AttachmentBuilder } from "discord.js";
import { Jimp, ResizeStrategy } from "jimp";
import express from "express";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("ImageBot is running");
});
app.listen(port, "0.0.0.0", () => {
  console.log(`Web server listening on port ${port}`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const SUPPORTED_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"];
const TARGET_BLOCKS = 32; // 長辺を何ブロックに分割するか（小さいほど粗いモザイクになる）

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  for (const attachment of message.attachments.values()) {
    const ext = attachment.name.split(".").pop().toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) continue;

    try {
      const image = await Jimp.read(attachment.url);
      const { width, height } = image.bitmap;

      // 元画像の解像度に関わらず、長辺が必ずTARGET_BLOCKS個のブロックになるように縮小サイズを決める
      const scale = TARGET_BLOCKS / Math.max(width, height);
      const smallW = Math.max(1, Math.round(width * scale));
      const smallH = Math.max(1, Math.round(height * scale));

      image
        .resize({ w: smallW, h: smallH }) // 一度小さく縮小
        .resize({ w: width, h: height, mode: ResizeStrategy.NEAREST_NEIGHBOR }); // 最近傍補間で元サイズに拡大→モザイク化

      const buffer = await image.getBuffer("image/png");
      const file = new AttachmentBuilder(buffer, { name: "output.png" });

      await message.reply({
        content: "ピクセル化（モザイク化）しました！",
        files: [file],
      });
    } catch (err) {
      console.error(err);
      await message.reply("画像の変換に失敗しました。");
    }
  }
});

client.login(process.env.DISCORD_TOKEN);