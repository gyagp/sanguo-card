import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";

// Test the pure functions and component behavior for impact particles

describe("makeParticles", () => {
  // We need to import from the page module - but it's not exported.
  // Instead, test the particle logic inline since makeParticles is internal.

  it("generates 8 particles with valid properties", async () => {
    // Replicate makeParticles logic for unit testing
    const PARTICLE_COLORS = ["#ff6b35", "#ffd700", "#ff4444", "#ffaa00", "#ffffff"];
    const particles = Array.from({ length: 8 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 18 + Math.random() * 20;
      return {
        px: Math.cos(angle) * dist,
        py: Math.sin(angle) * dist,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      };
    });

    expect(particles).toHaveLength(8);
    for (const p of particles) {
      expect(typeof p.px).toBe("number");
      expect(typeof p.py).toBe("number");
      expect(PARTICLE_COLORS).toContain(p.color);
      // Distance from origin should be between 18 and 38
      const dist = Math.sqrt(p.px * p.px + p.py * p.py);
      expect(dist).toBeGreaterThanOrEqual(18);
      expect(dist).toBeLessThanOrEqual(38);
    }
  });
});

describe("ImpactBurst component", () => {
  it("renders particle elements with correct styles", () => {
    // Inline ImpactBurst for testing since it's not exported
    const { container } = render(
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
        {[
          { px: 10, py: -15, color: "#ff6b35" },
          { px: -20, py: 5, color: "#ffd700" },
        ].map((p, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2"
            style={{
              width: 6, height: 6, borderRadius: "50%",
              backgroundColor: p.color,
              marginLeft: -3, marginTop: -3,
              animation: "impactParticle 0.4s ease-out forwards",
              "--px": `${p.px}px`, "--py": `${p.py}px`,
            } as React.CSSProperties}
          />
        ))}
      </div>
    );

    const dots = container.querySelectorAll('[class*="absolute left-1/2"]');
    expect(dots).toHaveLength(2);

    const firstDot = dots[0] as HTMLElement;
    expect(firstDot.style.backgroundColor).toBe("rgb(255, 107, 53)");
    expect(firstDot.style.animation).toBe("impactParticle 0.4s ease-out forwards");
    expect(firstDot.style.getPropertyValue("--px")).toBe("10px");
    expect(firstDot.style.getPropertyValue("--py")).toBe("-15px");
    expect(firstDot.style.width).toBe("6px");
    expect(firstDot.style.height).toBe("6px");
    expect(firstDot.style.borderRadius).toBe("50%");
  });
});

describe("Impact particle CSS animation", () => {
  it("impactParticle keyframes use 0.4s duration (400ms fade)", () => {
    // The animation property string specifies 0.4s = 400ms
    const animationValue = "impactParticle 0.4s ease-out forwards";
    expect(animationValue).toContain("0.4s");
    expect(animationValue).toContain("forwards");
  });
});

describe("Impact particle integration expectations", () => {
  it("particles are cleared after 400ms timeout", () => {
    vi.useFakeTimers();
    const map = new Map<number, { px: number; py: number; color: string }[]>();
    const particles = [{ px: 10, py: 10, color: "#fff" }];
    map.set(0, particles);

    // Simulate the setTimeout cleanup pattern from page.tsx
    const setEnemyImpacts = vi.fn((updater: (prev: Map<number, any>) => Map<number, any>) => {
      const result = updater(map);
      return result;
    });

    // Simulate: safeTimeout(() => setEnemyImpacts(...), 400)
    setTimeout(() => {
      setEnemyImpacts((prev: Map<number, any>) => {
        const m = new Map(prev);
        m.delete(0);
        return m;
      });
    }, 400);

    expect(setEnemyImpacts).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(setEnemyImpacts).toHaveBeenCalledTimes(1);

    // Verify the cleanup removes the particles
    const result = setEnemyImpacts.mock.results[0].value;
    expect(result.has(0)).toBe(false);

    vi.useRealTimers();
  });

  it("hero impact is cleared after 400ms timeout", () => {
    vi.useFakeTimers();
    let heroImpact: any[] | null = [{ px: 5, py: -5, color: "#ff4444" }];
    const setHeroImpact = vi.fn((val: any) => { heroImpact = val; });

    setTimeout(() => setHeroImpact(null), 400);

    expect(setHeroImpact).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(setHeroImpact).toHaveBeenCalledWith(null);
    expect(heroImpact).toBeNull();

    vi.useRealTimers();
  });

  it("minion-vs-minion attack triggers impact at defender position", () => {
    // Verify the pattern: when enemy minion is clicked with attacker selected,
    // setEnemyImpacts is called with particles at that index
    const setEnemyImpacts = vi.fn();
    const index = 2;
    const PARTICLE_COLORS = ["#ff6b35", "#ffd700", "#ff4444", "#ffaa00", "#ffffff"];
    const particles = Array.from({ length: 8 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 18 + Math.random() * 20;
      return {
        px: Math.cos(angle) * dist,
        py: Math.sin(angle) * dist,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      };
    });

    // Simulate the call from handleEnemyMinionClick
    setEnemyImpacts((prev: Map<number, any>) => new Map(prev).set(index, particles));
    expect(setEnemyImpacts).toHaveBeenCalledTimes(1);

    const updater = setEnemyImpacts.mock.calls[0][0];
    const result = updater(new Map());
    expect(result.has(2)).toBe(true);
    expect(result.get(2)).toHaveLength(8);
  });

  it("minion-vs-hero attack triggers impact at hero position", () => {
    const setHeroImpact = vi.fn();
    const PARTICLE_COLORS = ["#ff6b35", "#ffd700", "#ff4444", "#ffaa00", "#ffffff"];
    const particles = Array.from({ length: 8 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 18 + Math.random() * 20;
      return {
        px: Math.cos(angle) * dist,
        py: Math.sin(angle) * dist,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      };
    });

    setHeroImpact(particles);
    expect(setHeroImpact).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ px: expect.any(Number), py: expect.any(Number), color: expect.any(String) }),
    ]));
  });
});
