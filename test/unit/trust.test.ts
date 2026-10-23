import { it, expect, vi } from "vitest";
const state = vi.hoisted(() => ({ trusted: false }));
vi.mock("vscode", () => ({
  workspace: {
    get isTrusted() {
      return state.trusted;
    },
  },
}));
import { requireTrust } from "../../src/extension/configuration";
it("blocks mutations and runtime configuration in restricted workspaces", () => {
  state.trusted = false;
  expect(() => requireTrust()).toThrow("trusted");
});
it("allows explicitly trusted workspaces", () => {
  state.trusted = true;
  expect(() => requireTrust()).not.toThrow();
});
