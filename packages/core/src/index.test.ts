import { describe, expect, it } from "vitest";
import { placeholder } from "./index.js";

describe("placeholder", () => {
  it("is callable", () => {
    expect(placeholder()).toBeUndefined();
  });
});
