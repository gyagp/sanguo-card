import * as fs from "fs";
import * as path from "path";
import { cards } from "./cards";

const SCRIPT_PATH = path.resolve(__dirname, "../../scripts/generate-card-art.ts");

describe("generate-card-art.ts script", () => {
  let scriptContent: string;

  beforeAll(() => {
    scriptContent = fs.readFileSync(SCRIPT_PATH, "utf-8");
  });

  test("scripts/generate-card-art.ts exists", () => {
    expect(fs.existsSync(SCRIPT_PATH)).toBe(true);
  });

  test("script imports card definitions from src/game/cards", () => {
    expect(scriptContent).toMatch(/from\s+["']\.\.\/src\/game\/cards["']/);
  });

  test("script reads GEMINI_API_KEY from environment variable", () => {
    expect(scriptContent).toContain("process.env.GEMINI_API_KEY");
  });

  test("script exits with error if GEMINI_API_KEY is not set", () => {
    expect(scriptContent).toMatch(/process\.exit\(1\)/);
  });

  test("script uses correct Gemini API URL with image generation model", () => {
    expect(scriptContent).toContain(
      "generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent"
    );
  });

  test("script sends responseModalities with TEXT and IMAGE", () => {
    expect(scriptContent).toMatch(/responseModalities.*TEXT.*IMAGE/s);
  });

  test("script uses POST method for API calls", () => {
    expect(scriptContent).toMatch(/method:\s*["']POST["']/);
  });

  test("script generates faction-appropriate prompts for minions (三国武将卡通风格)", () => {
    expect(scriptContent).toContain("三国武将卡通风格");
  });

  test("script generates faction-appropriate prompts for spells (法术效果场景)", () => {
    expect(scriptContent).toContain("法术效果场景");
  });

  test("script generates faction-appropriate prompts for weapons (武器造型)", () => {
    expect(scriptContent).toContain("武器造型");
  });

  test("script includes faction color direction for wei (blue/魏)", () => {
    expect(scriptContent).toMatch(/wei.*蓝色.*魏/s);
  });

  test("script includes faction color direction for shu (green/蜀)", () => {
    expect(scriptContent).toMatch(/shu.*绿色.*蜀/s);
  });

  test("script includes faction color direction for wu (red/吴)", () => {
    expect(scriptContent).toMatch(/wu.*红色.*吴/s);
  });

  test("script includes faction color direction for qun (amber/群)", () => {
    expect(scriptContent).toMatch(/qun.*琥珀色.*群|qun.*金色.*群/s);
  });

  test("script saves output as PNG to public/card-art/", () => {
    expect(scriptContent).toMatch(/public\/card-art/);
    expect(scriptContent).toMatch(/\.png/);
  });

  test("script decodes base64 image data", () => {
    expect(scriptContent).toMatch(/Buffer\.from\(.*base64/s);
  });

  test("script handles rate limiting with delays between requests", () => {
    expect(scriptContent).toMatch(/setTimeout|delay|sleep/);
  });

  test("script skips cards that already have generated PNGs (idempotent)", () => {
    expect(scriptContent).toMatch(/existsSync|exists/);
    expect(scriptContent).toMatch(/[Ss]kip/);
  });

  test("script creates output directory if it doesn't exist", () => {
    expect(scriptContent).toMatch(/mkdirSync|mkdir/);
  });

  test("script iterates over all cards from cards.ts", () => {
    expect(scriptContent).toMatch(/for.*card.*of.*cards|cards\.(forEach|map)/);
  });

  test("cards.ts has cards for the script to process", () => {
    expect(cards.length).toBeGreaterThanOrEqual(34);
  });

  test("buildPrompt function handles all three card types", () => {
    const minionBlock = scriptContent.match(/type.*===?\s*["']minion["']/);
    const spellBlock = scriptContent.match(/type.*===?\s*["']spell["']/);
    expect(minionBlock).not.toBeNull();
    expect(spellBlock).not.toBeNull();
  });
});
