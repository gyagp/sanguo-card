// Generate Three Kingdoms character portraits using Gemini Imagen API
// Usage: node generate-portraits.mjs

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDvcfsyYp36o-U9XcTURF3wfWkedroXa1M";
const GEMINI_MODEL = "gemini-2.5-flash-image";
const OUTPUT_DIR = "D:/workspace/project/gyagp/sanguo-card/public/card-art";

import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const portraits = [
  // 普通
  { file: "乡勇", prompt: "Portrait of a young Chinese peasant militia soldier from the Three Kingdoms era, wearing simple cloth armor and carrying a wooden shield, determined expression, warm lighting, semi-realistic anime art style, card game portrait, upper body, dramatic lighting, ancient Chinese battlefield background blur" },
  { file: "斥候骑兵", prompt: "Portrait of a Chinese scout cavalry rider from the Three Kingdoms era, wearing light leather armor with a red headband, riding on horseback, holding a short spear, alert expression, semi-realistic anime art style, card game portrait, upper body, dramatic lighting" },
  { file: "运粮车", prompt: "Illustration of an ancient Chinese grain supply wagon from Three Kingdoms era, loaded with rice sacks, pulled by an ox, wooden cart with cloth cover, warm golden hour lighting, semi-realistic anime art style, card game art" },
  { file: "弓弩手", prompt: "Portrait of a Chinese crossbowman from the Three Kingdoms era, wearing purple-tinted armor, aiming a repeating crossbow, focused intense eyes, semi-realistic anime art style, card game portrait, upper body, dramatic lighting" },
  { file: "长枪兵", prompt: "Portrait of a Chinese spearman from the Three Kingdoms era, wearing red armor, holding a long spear upright, proud warrior stance, semi-realistic anime art style, card game portrait, upper body, dramatic lighting" },
  { file: "辎重车", prompt: "Illustration of a heavily armored Chinese supply cart from Three Kingdoms era, reinforced with iron plates, defensive spikes, flags on top, semi-realistic anime art style, card game art, dramatic lighting" },
  { file: "铁剑", prompt: "Illustration of an ancient Chinese iron jian sword, straight double-edged blade with ornate bronze guard and wrapped leather grip, floating on dark background with subtle glow, semi-realistic art style, card game weapon art" },
  { file: "烽火", prompt: "Illustration of an ancient Chinese beacon tower on fire at night, flames rising high, smoke signals against dark sky, Three Kingdoms era, semi-realistic anime art style, card game spell art, dramatic red-orange lighting" },
  { file: "征兵令", prompt: "Illustration of an ancient Chinese imperial conscription decree scroll, red seal stamp, calligraphy on yellowed paper, Three Kingdoms era, semi-realistic art style, card game spell art, dramatic lighting" },
  { file: "草药", prompt: "Illustration of traditional Chinese medicinal herbs in a clay mortar, green leaves, dried roots, glowing healing aura, Three Kingdoms era, semi-realistic anime art style, card game spell art" },

  // 稀有
  { file: "张飞", prompt: "Portrait of Zhang Fei, famous warrior of Shu Han from Three Kingdoms, fierce bearded face with wide angry eyes, wearing dark blue armor, wielding a serpent spear, muscular and intimidating, semi-realistic anime art style, card game portrait, upper body, dramatic lightning and storm background" },
  { file: "赵云", prompt: "Portrait of Zhao Yun (Zhao Zilong), legendary warrior of Shu Han from Three Kingdoms, handsome young face with determined eyes, wearing gleaming silver-white armor with a white cape, holding a silver spear, semi-realistic anime art style, card game portrait, upper body, heroic golden light background" },
  { file: "许褚", prompt: "Portrait of Xu Chu, mighty bodyguard of Cao Cao from Three Kingdoms, massive muscular bare-chested warrior, fierce expression, carrying a giant battle axe, semi-realistic anime art style, card game portrait, upper body, dramatic battle background" },
  { file: "夏侯惇", prompt: "Portrait of Xiahou Dun, one-eyed general of Wei from Three Kingdoms, wearing blue armor, one eye covered with an eyepatch, fierce and loyal expression, holding a long blade, semi-realistic anime art style, card game portrait, upper body, dramatic stormy background" },
  { file: "甘宁", prompt: "Portrait of Gan Ning, pirate warrior of Wu from Three Kingdoms, wearing green armor with bells attached, wild hair, dashing rogue expression, holding a short blade, semi-realistic anime art style, card game portrait, upper body, river and ship background" },
  { file: "黄忠", prompt: "Portrait of Huang Zhong, legendary old archer of Shu Han from Three Kingdoms, elderly warrior with white beard, wearing red armor, drawing a powerful bow, wise and fierce eyes, semi-realistic anime art style, card game portrait, upper body, dramatic mountain background" },
  { file: "伏兵", prompt: "Illustration of Chinese soldiers hiding in ambush among tall grass and bamboo, Three Kingdoms era, multiple warriors crouching with weapons ready, tense atmosphere, semi-realistic anime art style, card game spell art, green-tinted dramatic lighting" },
  { file: "草船借箭", prompt: "Illustration of the famous Borrowing Arrows with Straw Boats scene from Three Kingdoms, straw-covered boats on misty river at night, arrows flying through fog, semi-realistic anime art style, card game spell art, dramatic blue-grey fog lighting" },
  { file: "青龙偃月刀", prompt: "Illustration of the legendary Green Dragon Crescent Blade (Guan Yu's weapon), massive polearm with crescent-shaped blade, green jade dragon carved on the blade, glowing with emerald energy, floating on dark background, semi-realistic art style, card game weapon art" },
  { file: "丈八蛇矛", prompt: "Illustration of the Zhang Ba Serpent Spear (Zhang Fei's weapon), long spear with a snake-like forked blade tip, dark iron with red tassel, floating on dark background with subtle lightning, semi-realistic art style, card game weapon art" },

  // 史诗
  { file: "吕布", prompt: "Portrait of Lu Bu, the mightiest warrior of Three Kingdoms China, wearing elaborate purple-gold armor with a magnificent phoenix feather headdress, fierce red eyes, holding the Sky Piercer halberd, riding Red Hare horse, semi-realistic anime art style, card game portrait, upper body, epic battle background with fire and lightning" },
  { file: "孙策", prompt: "Portrait of Sun Ce, the Little Conqueror of Wu from Three Kingdoms, young handsome face full of confidence, wearing red and gold armor, heroic pose, semi-realistic anime art style, card game portrait, upper body, Yangtze River battle background" },
  { file: "典韦", prompt: "Portrait of Dian Wei, the fearsome bodyguard of Cao Cao from Three Kingdoms, massive hulking warrior in dark blue heavy armor, dual-wielding giant war axes, terrifying battle cry expression, semi-realistic anime art style, card game portrait, upper body, fire and destruction background" },
  { file: "太史慈", prompt: "Portrait of Taishi Ci, brave warrior of Wu from Three Kingdoms, wearing red armor, dual-wielding a spear and short halberd, determined and noble expression, semi-realistic anime art style, card game portrait, upper body, battlefield duel background" },
  { file: "连环计", prompt: "Illustration of the Chain Stratagem from Three Kingdoms, warships chained together on a vast river, intricate iron chains connecting the fleet, ominous atmosphere, semi-realistic anime art style, card game spell art, dark blue-grey dramatic lighting" },
  { file: "空城计", prompt: "Illustration of the Empty Fort Strategy from Three Kingdoms, Zhuge Liang sitting calmly on top of an open city gate playing a guqin zither, empty streets below, enemy army in the distance, tense atmospheric scene, semi-realistic anime art style, card game spell art" },
  { file: "方天画戟", prompt: "Illustration of the Sky Piercer Halberd (Fang Tian Hua Ji, Lu Bu's weapon), ornate crescent-bladed polearm with gold and crimson decorations, dragon engravings, glowing with fierce red energy, floating on dark background, semi-realistic art style, card game weapon art" },

  // 传说
  { file: "刘备", prompt: "Portrait of Liu Bei, founding emperor of Shu Han from Three Kingdoms, wearing magnificent golden dragon imperial robes and crown, kind wise face with long ears, benevolent yet determined expression, holding a pair of twin swords, semi-realistic anime art style, card game portrait, upper body, golden palace throne room background, epic legendary golden aura" },
  { file: "曹操", prompt: "Portrait of Cao Cao, the cunning warlord of Wei from Three Kingdoms, wearing dark imperial armor and black crown, sharp intelligent eyes, calculating smile, exuding power and authority, semi-realistic anime art style, card game portrait, upper body, dark throne room with red banners background, epic legendary dark aura" },
  { file: "孙权", prompt: "Portrait of Sun Quan, ruler of Wu from Three Kingdoms, wearing red and gold imperial armor with tiger motifs, young but authoritative face, piercing blue-green eyes, commanding presence, semi-realistic anime art style, card game portrait, upper body, grand palace overlooking the Yangtze background, epic legendary red aura" },
  { file: "诸葛亮", prompt: "Portrait of Zhuge Liang (Kongming), the legendary strategist of Shu Han from Three Kingdoms, wearing elegant scholar robes and Taoist crane-feather fan in hand, serene and all-knowing expression, mystical wind flowing through his robes, semi-realistic anime art style, card game portrait, upper body, starry night sky with constellation map background, epic legendary purple-blue magical aura" },
  { file: "关羽", prompt: "Portrait of Guan Yu, the God of War from Three Kingdoms, iconic long flowing black beard, red face, wearing green robes over heavy armor, eyes half-closed in stern dignity, holding the Green Dragon Crescent Blade, semi-realistic anime art style, card game portrait, upper body, temple with incense smoke background, epic legendary emerald-gold divine aura" },
  { file: "司马懿", prompt: "Portrait of Sima Yi, the cunning strategist of Wei from Three Kingdoms, elderly face with sharp hawk-like eyes, wearing dark scholarly robes with fur collar, calculating and patient expression, semi-realistic anime art style, card game portrait, upper body, dark study room with maps and candles background, epic legendary dark purple aura" },
  { file: "火烧赤壁", prompt: "Illustration of the Battle of Red Cliffs (Chi Bi) from Three Kingdoms, massive fleet of warships engulfed in flames on the Yangtze River at night, towering inferno reflecting on water, epic scale destruction, semi-realistic anime art style, card game spell art, epic legendary fiery red-orange dramatic lighting" },
];

async function generateImage(prompt, outputPath) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{
      parts: [{
        text: `Generate an image: ${prompt}\n\nThe image should be a 512x512 card game portrait/illustration with high quality details. Style: semi-realistic anime, suitable for a Three Kingdoms card game similar to Hearthstone.`
      }]
    }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();

  // Extract image from response
  const candidates = data.candidates || [];
  for (const candidate of candidates) {
    const parts = candidate.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        const buffer = Buffer.from(part.inlineData.data, "base64");
        const ext = part.inlineData.mimeType?.includes("png") ? "png" : "webp";
        const finalPath = outputPath.replace(/\.\w+$/, `.${ext}`);
        await writeFile(finalPath, buffer);
        console.log(`  Saved: ${finalPath} (${buffer.length} bytes)`);
        return finalPath;
      }
    }
  }

  throw new Error("No image in Gemini response");
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log(`Generating ${portraits.length} portraits...\n`);

  let success = 0;
  let failed = 0;

  for (const p of portraits) {
    const outPath = join(OUTPUT_DIR, `${p.file}.webp`);
    if (existsSync(outPath) || existsSync(outPath.replace('.webp', '.png'))) {
      console.log(`  Skip (exists): ${p.file}`);
      success++;
      continue;
    }

    console.log(`  Generating: ${p.file}...`);
    try {
      await generateImage(p.prompt, outPath);
      success++;
      // Rate limit: wait 2s between requests
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error(`  FAILED: ${p.file}: ${err.message}`);
      failed++;
      // Wait longer on failure (might be rate limited)
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  console.log(`\nDone: ${success} success, ${failed} failed out of ${portraits.length}`);
}

main().catch(console.error);
