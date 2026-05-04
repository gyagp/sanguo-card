import { describe, it, expect, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
}));

describe("Layout metadata", () => {
  it("exports metadata with Chinese title, description, and keywords", async () => {
    const { metadata } = await import("./layout");

    expect(metadata.title).toBe("三国卡牌 - 三国题材策略卡牌游戏");
    expect(metadata.description).toContain("三国");
    expect(metadata.keywords).toEqual(
      expect.arrayContaining(["卡牌游戏", "三国", "策略"])
    );
  });

  it("has openGraph metadata in Chinese with zh_CN locale", async () => {
    const { metadata } = await import("./layout");
    const og = metadata.openGraph as Record<string, unknown>;

    expect(og.title).toContain("三国卡牌");
    expect(og.locale).toBe("zh_CN");
    expect(og.siteName).toBe("三国卡牌");
  });

  it("has twitter metadata in Chinese", async () => {
    const { metadata } = await import("./layout");
    const twitter = metadata.twitter as Record<string, unknown>;

    expect(twitter.title).toContain("三国卡牌");
    expect(twitter.description).toBeTruthy();
  });

  it("renders html with lang='zh'", async () => {
    const layoutModule = await import("./layout");
    const RootLayout = layoutModule.default;

    const result = RootLayout({ children: null as unknown as React.ReactNode });
    expect(result.props.lang).toBe("zh");
  });
});
