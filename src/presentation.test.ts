import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("Settlement Window presentation", () => {
  it("uses the current name across the app and static showcase", () => {
    for (const path of ["src/app/page.tsx", "src/app/layout.tsx", "src/features/protection/ProtectionWizard.tsx", "showcase/index.html"]) {
      const source = read(path);
      expect(source).toContain("Settlement Window");
      expect(source).not.toContain("SettleShield");
    }
    expect(JSON.parse(read("package.json")).name).toBe("settlement-window");
  });

  it("links current public surfaces without changing historical chain identity", () => {
    for (const path of ["src/app/page.tsx", "showcase/index.html"]) {
      const source = read(path);
      expect(source).toContain("github.com/SourceSenseiTheRealOne/settlement-window");
      expect(source).not.toMatch(/github(?:\.io|\.com)\/[^\s"<>]*settleshield/);
    }
    expect(read("contracts/src/SettleShieldReceipt.sol")).toContain("contract SettleShieldReceipt");
    const proof = JSON.parse(read("showcase/testnet-proof.json"));
    expect(proof.chainId).toBe(50312);
    expect(proof.shield.statusLabel).toBe("Resolved");
    expect(proof.shield.payoutUsdMicros).toBe("0");
  });

  it("labels the showcase as a reference calculator with owner-attested settlement", () => {
    const source = read("showcase/index.html");
    expect(source).toContain("not a live quote");
    expect(source).toContain("Owner-attested settlement");
    expect(source).not.toContain("Known before execution");
    expect(source).toContain("No promise of full coverage");
  });
});
