import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { shuffleOptions } from "../scripts/parse-david-2027.mjs";

describe("deterministic answer shuffle", () => {
  test("the correct option text stays attached to the new letter", () => {
    const options = ["Alpha", "Beta", "Gamma", "Delta"];
    const once = shuffleOptions(options, "B", "fixture-question");
    const twice = shuffleOptions(options, "B", "fixture-question");
    assert.deepEqual(once, twice);
    assert.equal(once.options[once.correct_answer], "Beta");
    assert.equal(once.letter_before, "B");
    assert.notEqual(once.options.join("|"), options.join("|"));
  });

  test("the imported Hole's and Krause keys are not piled on B", () => {
    const questions = JSON.parse(readFileSync(new URL("../question-bank-canonical-2027-11-16.json", import.meta.url), "utf8"));
    for (const file of ["domain-ii-holes.md", "krause-ncp.md"]) {
      const group = questions.filter((question) => question.source_file === file);
      const counts = {};
      for (const question of group) counts[question.correct_letter] = (counts[question.correct_letter] || 0) + 1;
      for (const count of Object.values(counts)) {
        assert.ok(count / group.length < 0.4, `${file} letter share ${count}/${group.length}`);
      }
    }
    const ethics = questions.filter((question) => question.source_file === "domain-iii-ethics.md");
    assert.equal(ethics.length, 50);
    assert.ok(ethics.every((question) => question.shuffle === null));
    assert.ok(questions.filter((question) => question.source_file === "krause-ncp.md").every((question) => question.domain_mapping_status === "proposed"));
  });
});
