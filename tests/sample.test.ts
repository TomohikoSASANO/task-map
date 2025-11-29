// tests/sample.test.ts
import { add } from "../src/index";

describe("add", () => {
  test("1 + 2 = 3 になること", () => {
    expect(add(1, 2)).toBe(3);
  });
});
