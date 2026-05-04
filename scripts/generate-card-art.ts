import * as fs from "fs";
import * as path from "path";
import { cards } from "../src/game/cards";
import { Card } from "../src/game/types";

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("Error: GEMINI_API_KEY environment variable is required");
  process.exit(1);
}

const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent";

const OUTPUT_DIR = path.resolve(__dirname, "../public/card-art");

const FACTION_COLORS: Record<string, string> = {
  wei: "蓝色(魏国风格)",
  shu: "绿色(蜀国风格)",
  wu: "红色(吴国风格)",
  qun: "琥珀色/金色(群雄风格)",
  neutral: "灰色/中性色调",
};

function buildPrompt(card: Card): string {
  const color = FACTION_COLORS[card.faction];

  if (card.type === "minion") {
    return `生成一张三国武将卡通风格的卡牌插画，角色名为"${card.name}"，${card.description}。画面主色调为${color}，Q版可爱风格，白色背景，适合卡牌游戏使用。`;
  }
  if (card.type === "spell") {
    return `生成一张三国主题的法术效果场景插画，法术名为"${card.name}"，效果：${card.description}。画面主色调为${color}，卡通风格，白色背景，适合卡牌游戏使用。`;
  }
  // weapon
  return `生成一张三国主题的武器造型插画，武器名为"${card.name}"，${card.description}。画面主色调为${color}，卡通风格，白色背景，适合卡牌游戏使用。`;
}

async function generateImage(card: Card): Promise<void> {
  const outputPath = path.join(OUTPUT_DIR, `${card.name}.png`);

  if (fs.existsSync(outputPath)) {
    console.log(`⏭ Skipping ${card.name} — already exists`);
    return;
  }

  const prompt = buildPrompt(card);
  console.log(`🎨 Generating ${card.name} (${card.type}, ${card.faction})...`);

  const response = await fetch(`${API_URL}?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `API error for ${card.name}: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts) {
    throw new Error(`No content returned for ${card.name}`);
  }

  const imagePart = parts.find(
    (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData
  );
  if (!imagePart) {
    throw new Error(`No image data returned for ${card.name}`);
  }

  const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
  fs.writeFileSync(outputPath, imageBuffer);
  console.log(`✅ Saved ${card.name}.png (${imageBuffer.length} bytes)`);
}

async function main(): Promise<void> {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`Generating art for ${cards.length} cards...\n`);

  for (const card of cards) {
    try {
      await generateImage(card);
    } catch (err) {
      console.error(
        `❌ Failed for ${card.name}: ${err instanceof Error ? err.message : err}`
      );
    }
    // Rate limiting: wait 2 seconds between requests
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log("\nDone!");
}

main();
