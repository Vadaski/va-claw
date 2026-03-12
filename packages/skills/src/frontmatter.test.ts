import assert from "node:assert/strict";
import { test } from "node:test";

import { parseSkillMarkdown } from "./frontmatter.js";

function assertThrows(patternFn: () => unknown, pattern: RegExp): void {
  try {
    patternFn();
  } catch (error) {
    assert.equal(pattern.test(String(error)), true);
    return;
  }
  throw new Error(`Expected function to throw matching ${pattern}`);
}

function assertDeepEqual(left: unknown, right: unknown): void {
  assert.equal(JSON.stringify(left), JSON.stringify(right));
}

test("parseSkillMarkdown parses basic frontmatter", () => {
  const markdown = `---
name: test-skill
description: A test skill
version: 1.0.0
triggers: ['test', 'example']
---
# Test Content
This is the skill content.
`;

  const skill = parseSkillMarkdown(markdown, "/tmp/test.md");

  assert.equal(skill.name, "test-skill");
  assert.equal(skill.description, "A test skill");
  assert.equal(skill.version, "1.0.0");
  assertDeepEqual(skill.triggers, ["test", "example"]);
  assert.equal(skill.content, "# Test Content\nThis is the skill content.");
  assert.equal(skill.path, "/tmp/test.md");
});

test("parseSkillMarkdown handles empty triggers as empty array", () => {
  const markdown = `---
name: empty-triggers-skill
description: Skill with no triggers
version: 1.0.0
triggers: []
---
# Content
Skill body here.
`;

  const skill = parseSkillMarkdown(markdown, "/tmp/empty.md");

  assert.equal(skill.name, "empty-triggers-skill");
  assertDeepEqual(skill.triggers, []);
});

test("parseSkillMarkdown handles folded/multi-line description string", () => {
  const markdown = `---
name: multi-line-skill
description: 'First line\\nSecond line'
version: 1.0.0
triggers: ['multi']
---
Content here.
`;

  const skill = parseSkillMarkdown(markdown, "/tmp/multi.md");

  assert.equal(skill.description, "First line\\nSecond line");
});

test("parseSkillMarkdown throws on missing frontmatter", () => {
  const markdown = `# No Frontmatter\nJust markdown content.`;

  assertThrows(() => parseSkillMarkdown(markdown, "/tmp/no-frontmatter.md"), /missing YAML frontmatter/);
});

test("parseSkillMarkdown throws on missing name field", () => {
  const markdown = `---
description: Missing name field
version: 1.0.0
triggers: ['test']
---
Content
`;

  assertThrows(() => parseSkillMarkdown(markdown, "/tmp/no-name.md"), /missing \"name\"/);
});

test("parseSkillMarkdown throws on missing description field", () => {
  const markdown = `---
name: no-description
version: 1.0.0
triggers: ['test']
---
Content
`;

  assertThrows(() => parseSkillMarkdown(markdown, "/tmp/no-desc.md"), /missing \"description\"/);
});

test("parseSkillMarkdown throws on missing version field", () => {
  const markdown = `---
name: no-version
description: A skill without version
triggers: ['test']
---
Content
`;

  assertThrows(() => parseSkillMarkdown(markdown, "/tmp/no-version.md"), /missing \"version\"/);
});

test("parseSkillMarkdown throws on missing triggers field", () => {
  const markdown = `---
name: no-triggers
description: A skill without triggers
version: 1.0.0
---
Content
`;

  assertThrows(() => parseSkillMarkdown(markdown, "/tmp/no-triggers.md"), /missing \"triggers\"/);
});

test("parseSkillMarkdown handles double-quoted values", () => {
  const markdown = `---
name: "quoted-skill"
description: "Description with quotes"
version: "2.0.0"
triggers: ["one", "two"]
---
Content
`;

  const skill = parseSkillMarkdown(markdown, "/tmp/quoted.md");

  assert.equal(skill.name, "quoted-skill");
  assert.equal(skill.description, "Description with quotes");
  assert.equal(skill.version, "2.0.0");
  assertDeepEqual(skill.triggers, ["one", "two"]);
});

test("parseSkillMarkdown handles triggers with spaces after commas", () => {
  const markdown = `---
name: spaced-triggers
description: Test spaced triggers
version: 1.0.0
triggers: ['trigger 1', 'trigger 2', 'trigger 3']
---
Content
`;

  const skill = parseSkillMarkdown(markdown, "/tmp/spaced.md");

  assertDeepEqual(skill.triggers, ["trigger 1", "trigger 2", "trigger 3"]);
});

test("parseSkillMarkdown trims content whitespace", () => {
  const markdown = `---
name: whitespace-skill
description: Test whitespace
version: 1.0.0
triggers: ['test']
---

  Trimmed content  

`;

  const skill = parseSkillMarkdown(markdown, "/tmp/whitespace.md");

  assert.equal(skill.content, "Trimmed content");
});

test("parseSkillMarkdown handles Windows line endings", () => {
  const markdown = `---\r\nname: windows-skill\r\ndescription: Windows line endings\r\nversion: 1.0.0\r\ntriggers: ['test']\r\n---\r\nContent here\r\nMore content.`;

  const skill = parseSkillMarkdown(markdown, "/tmp/windows.md");

  assert.equal(skill.name, "windows-skill");
  assert.equal(skill.content, "Content here\r\nMore content.");
});

test("parseSkillMarkdown extracts markdown body after frontmatter", () => {
  const markdown = `---
name: content-body-skill
description: skill body extraction
version: 1.0.0
triggers: ['content']
---
# Heading
Body lines.
More body text.
`;

  const skill = parseSkillMarkdown(markdown, "/tmp/content.md");

  assert.equal(skill.content, "# Heading\nBody lines.\nMore body text.");
});

test("parseSkillMarkdown keeps trigger case", () => {
  const markdown = `---
name: case-skill
description: Case sensitivity
version: 1.0.0
triggers: ['KeywordA', 'KeywordB']
---
Content
`;

  const skill = parseSkillMarkdown(markdown, "/tmp/case.md");

  assertDeepEqual(skill.triggers, ["KeywordA", "KeywordB"]);
});

test("parseSkillMarkdown trims description trailing spaces", () => {
  const markdown = `---
name: trim-desc-skill
description:  description with spaces at end  
version: 1.0.0
triggers: ['trim']
---
Content
`;

  const skill = parseSkillMarkdown(markdown, "/tmp/trim-desc.md");

  assert.equal(skill.description, "description with spaces at end");
});
