import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtime = path.join(root, ".runtime"),
  deps = path.join(runtime, "deps");
if (process.argv.length !== 2) throw Error("Usage: npm run setup");
if (!["linux", "darwin"].includes(process.platform))
  throw Error(
    "Setup supports macOS/Linux; use a Linux environment on Windows.",
  );
const [major, minor, patch] = process.versions.node.split(".").map(Number);
if (major !== 26 || minor < 12 || (minor === 12 && patch < 1))
  throw Error("Node 26.12.1 or a later 26.x is required.");
const run = (bin, args, cwd = root) => {
  const r = spawnSync(bin, args, {
    cwd,
    encoding: "utf8",
    timeout: 300000,
    maxBuffer: 8 * 1024 * 1024,
    env: {
      ...process.env,
      PYTHONDONTWRITEBYTECODE: "1",
      PIP_DISABLE_PIP_VERSION_CHECK: "1",
    },
  });
  if (r.error || r.status !== 0)
    throw Error(
      `${path.basename(bin)} ${args[0]} failed: ${r.error?.message || r.stderr.slice(-5000) || r.stdout.slice(-5000)}`,
    );
  return r.stdout.trim();
};
const raw = fs.readFileSync(path.join(root, "sources.lock.json"));
const lock = JSON.parse(raw),
  lockHash = createHash("sha256").update(raw).digest("hex");
if (lock.schema !== "kujo.videoops-factory.sources/v1")
  throw Error("Unsupported source lock.");
for (const [name, source] of Object.entries(lock.repositories)) {
  if (
    !/^[a-z0-9-]+$/.test(name) ||
    source.url !== `https://github.com/kujolang/${name}.git` ||
    !/^[a-f0-9]{40}$/.test(source.commit)
  )
    throw Error("Invalid source lock entry: " + name);
}
for (const [name, version] of Object.entries(lock.python.requirements))
  if (!/^[a-z0-9-]+$/.test(name) || !/^\d+(\.\d+)+$/.test(version))
    throw Error("Invalid Python dependency pin.");
const expectedPython = {
  ...lock.python.requirements,
  [lock.python.distribution]: lock.python.version,
};
for (const dir of [runtime, deps]) {
  if (fs.existsSync(dir) && fs.lstatSync(dir).isSymbolicLink())
    throw Error("Runtime/dependency directories must not be symlinks.");
  fs.mkdirSync(dir, { recursive: true });
}
const guard = path.join(runtime, "setup.lock");
try {
  fs.mkdirSync(guard);
} catch (e) {
  if (e.code === "EEXIST")
    throw Error(
      "Setup lock exists. Confirm no setup process is active before removing the empty .runtime/setup.lock directory.",
    );
  throw e;
}
const startedAt = new Date().toISOString(),
  started = performance.now();
const python = path.join(runtime, "venv/bin/python"),
  venv = path.dirname(path.dirname(python));
const marker = path.join(venv, "factory-setup.json");
let createdVenv = false,
  staging;
const verifyPython = () => {
  const result = JSON.parse(
    run(python, [
      "-c",
      "import json,sys;from importlib.metadata import version; assert sys.version_info >= (3,10); print(json.dumps({name:version(name) for name in json.loads(sys.argv[1])}))",
      JSON.stringify(Object.keys(expectedPython)),
    ]),
  );
  for (const [name, version] of Object.entries(expectedPython))
    if (result[name] !== version)
      throw Error("Python dependency mismatch: " + name);
  run(python, ["-m", "pip", "check"]);
  return result;
};
try {
  run("git", ["--version"]);
  run("python3", [
    "-c",
    'import sys;assert sys.version_info >= (3,10), "Python >=3.10 required"',
  ]);
  const sources = [];
  for (const [name, source] of Object.entries(lock.repositories)) {
    const dest = path.join(deps, name);
    let installed = false;
    if (fs.existsSync(dest)) {
      if (
        fs.lstatSync(dest).isSymbolicLink() ||
        !fs.statSync(dest).isDirectory() ||
        !fs.existsSync(path.join(dest, ".git"))
      )
        throw Error("Dependency must be its own plain Git checkout: " + name);
      if (
        run("git", ["rev-parse", "--show-toplevel"], dest) !== dest ||
        run("git", ["rev-parse", "HEAD"], dest) !== source.commit ||
        run("git", ["status", "--porcelain", "--untracked-files=all"], dest)
      )
        throw Error(
          `${name} is dirty or differs from sources.lock.json. Preserve it and move it aside before setup; setup never resets edits.`,
        );
    } else {
      const temp = fs.mkdtempSync(path.join(deps, ".install-"));
      try {
        run("git", ["init", "-q", temp]);
        run("git", ["remote", "add", "origin", source.url], temp);
        run(
          "git",
          [
            "-c",
            "credential.helper=",
            "fetch",
            "--depth=1",
            "origin",
            source.commit,
          ],
          temp,
        );
        run("git", ["checkout", "--detach", "FETCH_HEAD"], temp);
        if (run("git", ["rev-parse", "HEAD"], temp) !== source.commit)
          throw Error("Fetched revision mismatch.");
        fs.renameSync(temp, dest);
        installed = true;
      } finally {
        if (fs.existsSync(temp))
          fs.rmSync(temp, { recursive: true, force: true });
      }
    }
    sources.push({ name, commit: source.commit, installed });
    console.log(
      `${name}: ${source.commit}${installed ? " (installed)" : " (verified)"}`,
    );
  }
  if (fs.existsSync(venv)) {
    if (fs.lstatSync(venv).isSymbolicLink() || !fs.existsSync(marker))
      throw Error(
        "Existing .runtime/venv is not a completed factory environment. Preserve it and move it aside before setup.",
      );
    if (JSON.parse(fs.readFileSync(marker, "utf8")).lockHash !== lockHash)
      throw Error(
        "Python environment source lock changed. Preserve and move .runtime/venv aside before setup.",
      );
    verifyPython();
    console.log("Python media/review tools: verified");
  } else {
    createdVenv = true;
    run("python3", ["-m", "venv", venv]);
    run(python, [
      "-m",
      "pip",
      "install",
      "--no-input",
      ...Object.entries(lock.python.requirements).map(
        ([name, version]) => `${name}==${version}`,
      ),
    ]);
    // Build a copy so package metadata never dirties the pinned source checkout.
    staging = fs.mkdtempSync(path.join(runtime, ".media-install-"));
    const tools = path.join(staging, "tools");
    fs.cpSync(path.join(deps, "kujo-agents/videoops/tools"), tools, {
      recursive: true,
    });
    run(python, [
      "-m",
      "pip",
      "install",
      "--no-input",
      "--no-deps",
      "--no-build-isolation",
      tools,
    ]);
    const versions = verifyPython();
    fs.writeFileSync(
      marker,
      JSON.stringify(
        {
          lockHash,
          sourceCommit: lock.repositories["kujo-agents"].commit,
          versions,
        },
        null,
        2,
      ) + "\n",
    );
    createdVenv = false;
    console.log("Python media/review tools: installed");
  }
  const doctor = spawnSync(
    process.execPath,
    [path.join(root, "scripts/doctor.mjs"), "--json"],
    { cwd: root, encoding: "utf8", timeout: 120000, maxBuffer: 1024 * 1024 },
  );
  if (doctor.error) throw doctor.error;
  if (!doctor.stdout.trim())
    throw Error(
      "Doctor did not return a report: " + doctor.stderr.slice(-2000),
    );
  const result = JSON.parse(doctor.stdout);
  fs.writeFileSync(
    path.join(runtime, "setup-doctor.json"),
    JSON.stringify(result, null, 2) + "\n",
  );
  if (doctor.status !== 0 || !result.ok)
    throw Error(
      "Dependency installation finished but doctor failed: " +
        result.checks
          .filter((x) => !x.ok)
          .map((x) => x.name + ": " + x.error)
          .join("; "),
    );
  const receipt = {
    schema: "kujo.videoops-factory.setup/v1",
    ok: true,
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - started),
    lockHash,
    sources,
    doctor: "setup-doctor.json",
    providerCalls: 0,
  };
  fs.writeFileSync(
    path.join(runtime, "setup-receipt.json"),
    JSON.stringify(receipt, null, 2) + "\n",
  );
  console.log(
    "Setup complete. Local tools verified; no provider authentication or generation was attempted.",
  );
} catch (error) {
  if (createdVenv && fs.existsSync(venv))
    fs.rmSync(venv, { recursive: true, force: true });
  fs.writeFileSync(
    path.join(runtime, "setup-failure.json"),
    JSON.stringify(
      {
        ok: false,
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: Math.round(performance.now() - started),
        error: error.message,
      },
      null,
      2,
    ) + "\n",
  );
  throw error;
} finally {
  if (staging && fs.existsSync(staging))
    fs.rmSync(staging, { recursive: true, force: true });
  fs.rmdirSync(guard);
}
