import { deepEqual, equal } from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  installSkill,
  listSkills,
  loadSkill,
  removeSkill,
  resetSkillPathOverridesForTests,
  searchSkills,
  setSkillPathOverridesForTests,
  injectSkillIntoPrompt,
} from "./index.js";

const SAMPLE_SKILL = `---
name: my-skill
description: 'What this skill does'
version: '1.0.0'
triggers: ['keyword1', 'keyword2']
---
# Skill Content
Instructions here...
`;

test("installSkill followed by listSkills returns the new skill", async () => {
  const homeDir = await mkdtemp(join(tmpdir(), "va-claw-skills-home-"));
  const projectDir = await mkdtemp(join(tmpdir(), "va-claw-skills-project-"));
  setSkillPathOverridesForTests({ homeDir, projectDir });

  try {
    await installSkill(SAMPLE_SKILL, "my-skill");
    const skills = await listSkills();

    equal(skills.length, 1);
    equal(skills[0]?.name, "my-skill");
  } finally {
    resetSkillPathOverridesForTests();
    await rm(homeDir, { recursive: true, force: true });
    await rm(projectDir, { recursive: true, force: true });
  }
});

test("loadSkill parses frontmatter and content", async () => {
  const homeDir = await mkdtemp(join(tmpdir(), "va-claw-skills-home-"));
  const projectDir = await mkdtemp(join(tmpdir(), "va-claw-skills-project-"));
  setSkillPathOverridesForTests({ homeDir, projectDir });

  try {
    const skillPath = await installSkill(SAMPLE_SKILL, "my-skill");
    const skill = await loadSkill(skillPath);

    equal(skill.description, "What this skill does");
    equal(skill.version, "1.0.0");
    deepEqual(skill.triggers, ["keyword1", "keyword2"]);
    equal(skill.content, "# Skill Content\nInstructions here...");
  } finally {
    resetSkillPathOverridesForTests();
    await rm(homeDir, { recursive: true, force: true });
    await rm(projectDir, { recursive: true, force: true });
  }
});

test("searchSkills matches keywords from triggers and description", async () => {
  const homeDir = await mkdtemp(join(tmpdir(), "va-claw-skills-home-"));
  const projectDir = await mkdtemp(join(tmpdir(), "va-claw-skills-project-"));
  setSkillPathOverridesForTests({ homeDir, projectDir });

  try {
    await installSkill(SAMPLE_SKILL, "my-skill");
    const results = await searchSkills("Need keyword2 support");

    equal(results.length, 1);
    equal(results[0]?.name, "my-skill");
  } finally {
    resetSkillPathOverridesForTests();
    await rm(homeDir, { recursive: true, force: true });
    await rm(projectDir, { recursive: true, force: true });
  }
});

test("removeSkill removes an installed skill from listSkills", async () => {
  const homeDir = await mkdtemp(join(tmpdir(), "va-claw-skills-home-"));
  const projectDir = await mkdtemp(join(tmpdir(), "va-claw-skills-project-"));
  setSkillPathOverridesForTests({ homeDir, projectDir });

  try {
    await installSkill(SAMPLE_SKILL, "my-skill");
    await removeSkill("my-skill");
    const skills = await listSkills();

    equal(skills.length, 0);
  } finally {
    resetSkillPathOverridesForTests();
    await rm(homeDir, { recursive: true, force: true });
    await rm(projectDir, { recursive: true, force: true });
  }
});

test("listSkills prefers project skills over installed skills with the same name", async () => {
  const homeDir = await mkdtemp(join(tmpdir(), "va-claw-skills-home-"));
  const projectDir = await mkdtemp(join(tmpdir(), "va-claw-skills-project-"));
  setSkillPathOverridesForTests({ homeDir, projectDir });

  try {
    await installSkill(SAMPLE_SKILL, "my-skill");
    const projectSkillsDir = join(projectDir, "skills");
    await mkdir(projectSkillsDir, { recursive: true });
    await writeFile(
      join(projectSkillsDir, "my-skill.md"),
      SAMPLE_SKILL.replace("Instructions here...", "Project instructions"),
      "utf8",
    );
    const [skill] = await listSkills();

    equal(skill?.content, "# Skill Content\nProject instructions");
  } finally {
    resetSkillPathOverridesForTests();
    await rm(homeDir, { recursive: true, force: true });
    await rm(projectDir, { recursive: true, force: true });
  }
});

// ========== 补充测试 ==========

test("injectSkillIntoPrompt includes basePrompt and skill content", () => {
  const basePrompt = "Wake up and process this.";
  const skill = {
    name: "coding-agent",
    description: "Coding guidance",
    version: "1.0.0",
    triggers: ["coding"],
    content: "Follow these coding guidelines.",
    path: "/tmp/skill.md",
  };

  const result = injectSkillIntoPrompt(skill, basePrompt);

  ok(result.includes(basePrompt));
  ok(result.includes("[Skill: coding-agent@1.0.0]"));
  ok(result.includes(skill.content));
});

test("injectSkillIntoPrompt returns only skill block when basePrompt is empty", () => {
  const skill = {
    name: "test-skill",
    description: "Test",
    version: "2.0.0",
    triggers: ["test"],
    content: "Test skill content.",
    path: "/tmp/test.md",
  };

  const result = injectSkillIntoPrompt(skill, "");

  equal(result, "[Skill: test-skill@2.0.0]\nTest skill content.");
});

test("searchSkills is case-insensitive", async () => {
  const homeDir = await mkdtemp(join(tmpdir(), "va-claw-skills-home-"));
  const projectDir = await mkdtemp(join(tmpdir(), "va-claw-skills-project-"));
  setSkillPathOverridesForTests({ homeDir, projectDir });

  try {
    await installSkill(SAMPLE_SKILL, "my-skill");

    // Test various case combinations
    const results1 = await searchSkills("KEYWORD1");
    const results2 = await searchSkills("KeyWord2");
    const results3 = await searchSkills("WHAT THIS SKILL DOES");

    equal(results1.length, 1);
    equal(results2.length, 1);
    equal(results3.length, 1);
    equal(results1[0]?.name, "my-skill");
  } finally {
    resetSkillPathOverridesForTests();
    await rm(homeDir, { recursive: true, force: true });
    await rm(projectDir, { recursive: true, force: true });
  }
});

test("installSkill overwrites existing skill with same name", async () => {
  const homeDir = await mkdtemp(join(tmpdir(), "va-claw-skills-home-"));
  const projectDir = await mkdtemp(join(tmpdir(), "va-claw-skills-project-"));
  setSkillPathOverridesForTests({ homeDir, projectDir });

  try {
    // Install first version
    const originalSkill = `---
name: my-skill
description: 'Original skill'
version: '1.0.0'
triggers: ['original']
---
Original content.
`;
    const path1 = await installSkill(originalSkill, "my-skill");

    // Install updated version
    const updatedSkill = `---
name: my-skill
description: 'Updated skill'
version: '2.0.0'
triggers: ['updated']
---
Updated content.
`;
    const path2 = await installSkill(updatedSkill, "my-skill");

    // Verify path is the same
    equal(path1, path2);

    // Verify content is updated
    const fileContent = await readFile(path2, "utf8");
    ok(fileContent.includes("Updated content."));
    ok(fileContent.includes("version: '2.0.0'"));

    // Verify list shows updated skill
    const skills = await listSkills();
    equal(skills.length, 1);
    equal(skills[0]?.version, "2.0.0");
    equal(skills[0]?.content, "Updated content.");
  } finally {
    resetSkillPathOverridesForTests();
    await rm(homeDir, { recursive: true, force: true });
    await rm(projectDir, { recursive: true, force: true });
  }
});

function ok(condition: boolean, message?: string): void {
  if (!condition) {
    throw new Error(message ?? "Expected condition to be true");
  }
}
