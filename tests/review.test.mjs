import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, ".runtime/venv/bin/videoops");
const options = {
  skip: fs.existsSync(cli)
    ? false
    : "Run npm run setup to install the canonical review CLI.",
  timeout: 120000,
};

// These opaque bytes qualify review-state transitions only. The human decision
// below is a test fixture, never production approval or decoded audiovisual QA.
function fixture(t) {
  const workspace = fs.mkdtempSync(
    path.join(os.tmpdir(), "videoops-review-fixture-"),
  );
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));
  fs.mkdirSync(path.join(workspace, "output"));
  const candidate = path.join(workspace, "output/draft.mp4");
  fs.writeFileSync(candidate, "TEST FIXTURE ONLY: opaque candidate revision 1");
  fs.writeFileSync(
    path.join(workspace, "evidence.json"),
    JSON.stringify({
      testFixture: true,
      purpose: "Review state transition qualification; not audiovisual QA",
    }),
  );
  const invoke = (command, args = [], expectedSuccess = true) => {
    const result = spawnSync(
      cli,
      ["review", command, "--workspace", workspace, ...args],
      {
        encoding: "utf8",
        timeout: 30000,
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
      },
    );
    assert.ifError(result.error);
    assert.equal(result.signal, null, "Review CLI must exit normally");
    const value = JSON.parse(result.stdout);
    if (expectedSuccess) assert.equal(result.status, 0, JSON.stringify(value));
    else {
      assert.equal(result.status, 1, "Policy/conflict rejection must exit 1");
      assert.equal(value.ok, false);
      assert.equal(value.error, "MEDIA_REVIEW_OPERATION_FAILED");
    }
    return value;
  };
  const submitted = invoke("submit-candidate", [
    "--candidate",
    "output/draft.mp4",
  ]);
  assert.equal(submitted.state, "REVIEW_INCOMPLETE");
  const decision = (id, perceptual = "REVIEW_INCOMPLETE") => ({
    version: "videoops-review-decision/v1",
    id,
    candidate_sha256: submitted.candidate.sha256,
    technical: "PASS",
    perceptual,
    reviewer: {
      identity: "TEST FIXTURE ONLY: simulated local human reviewer",
      type: "human",
      capabilities_exercised:
        perceptual === "PASS"
          ? ["deterministic_validation", "visual_playback", "audio_listening"]
          : ["deterministic_validation"],
    },
    reviewed_at: new Date().toISOString(),
    evidence: ["evidence.json"],
    defects: [],
  });
  const record = (value, { authorize = true, success = true } = {}) => {
    const file = path.join(workspace, `${value.id}.json`);
    fs.writeFileSync(file, JSON.stringify(value));
    return invoke(
      "record",
      ["--decision", file, ...(authorize ? ["--authorize-local"] : [])],
      success,
    );
  };
  return { workspace, candidate, invoke, decision, record, submitted };
}

test(
  "canonical review keeps technical-only evidence incomplete and refuses promotion",
  options,
  (t) => {
    const f = fixture(t);
    assert.equal(
      f.record(f.decision("technical-only")).state,
      "REVIEW_INCOMPLETE",
    );
    f.invoke("promote", ["--authorize-local"], false);
    assert.equal(
      fs.existsSync(path.join(f.workspace, "output/final.mp4")),
      false,
    );
  },
);

test(
  "canonical perceptual PASS requires both capabilities and a capable reviewer",
  options,
  (t) => {
    const f = fixture(t);
    for (const capability of ["visual_playback", "audio_listening"]) {
      const value = f.decision(`missing-${capability}`, "PASS");
      value.reviewer.capabilities_exercised =
        value.reviewer.capabilities_exercised.filter((x) => x !== capability);
      f.record(value, { success: false });
    }
    const tool = f.decision("technical-tool", "PASS");
    tool.reviewer.type = "technical_tool";
    f.record(tool, { success: false });
    assert.equal(f.invoke("status").state, "REVIEW_INCOMPLETE");
  },
);

test(
  "canonical review refuses stale approval and promotion after candidate bytes change",
  options,
  (t) => {
    const f = fixture(t);
    const old = f.decision("old-candidate", "PASS");
    assert.equal(f.record(old).state, "APPROVED");
    fs.writeFileSync(
      f.candidate,
      "TEST FIXTURE ONLY: changed audio and video bytes",
    );
    f.invoke("promote", ["--authorize-local"], false);
    f.record({ ...old, id: "changed-in-place" }, { success: false });
    f.invoke("submit-candidate", [
      "--candidate",
      "output/draft.mp4",
      "--user-revision",
    ]);
    f.record({ ...old, id: "stale-hash" }, { success: false });
    assert.equal(
      fs.existsSync(path.join(f.workspace, "output/final.mp4")),
      false,
    );
  },
);

test(
  "canonical review requires local operator authority and preserved evidence",
  options,
  (t) => {
    const f = fixture(t);
    const value = f.decision("operator-authority", "PASS");
    f.record(value, { authorize: false, success: false });
    f.record(
      { ...value, id: "artifact-authority", local_authorized: true },
      { success: false },
    );
    f.record(
      { ...value, id: "missing-evidence", evidence: ["absent.json"] },
      { success: false },
    );
    assert.equal(f.record(value).state, "APPROVED");
    f.invoke("promote", [], false);
    fs.writeFileSync(
      path.join(f.workspace, "evidence.json"),
      "Changed evidence",
    );
    f.invoke("promote", ["--authorize-local"], false);
    assert.equal(
      fs.existsSync(path.join(f.workspace, "output/final.mp4")),
      false,
    );
  },
);

test(
  "canonical review promotes matching fixture bytes after an authorized human PASS",
  options,
  (t) => {
    const f = fixture(t);
    f.record(f.decision("technical-first"));
    const human = f.decision("human-fixture-pass", "PASS");
    human.technical = "NOT_REVIEWED";
    human.reviewer.capabilities_exercised = [
      "visual_playback",
      "audio_listening",
    ];
    assert.equal(f.record(human).state, "APPROVED");
    const promoted = f.invoke("promote", ["--authorize-local"]);
    const final = fs.readFileSync(path.join(f.workspace, "output/final.mp4"));
    assert.deepEqual(final, fs.readFileSync(f.candidate));
    assert.equal(
      promoted.final.sha256,
      createHash("sha256").update(final).digest("hex"),
    );
    assert.equal(promoted.final.sha256, f.submitted.candidate.sha256);
    assert.equal(f.invoke("status").state, "APPROVED");
  },
);
