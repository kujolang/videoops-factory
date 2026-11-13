import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  require = createRequire(import.meta.url);
const args = process.argv.slice(2);
if (args.some((x) => !["--json", "--offline"].includes(x)))
  throw Error("Usage: npm run doctor -- [--json] [--offline]");
const checks = [];
const check = (name, fn, fix) => {
  try {
    checks.push({ name, ok: true, detail: fn() });
  } catch (e) {
    checks.push({ name, ok: false, error: e.message, fix });
  }
};
const run = (bin, args, cwd = root) => {
  const r = spawnSync(bin, args, {
    cwd,
    encoding: "utf8",
    timeout: 30000,
    maxBuffer: 1024 * 1024,
    env: {
      ...process.env,
      PYTHONDONTWRITEBYTECODE: "1",
      PIP_DISABLE_PIP_VERSION_CHECK: "1",
    },
  });
  if (r.error || r.status !== 0)
    throw Error(`${path.basename(bin)} ${args[0]} unavailable or failed`);
  return r.stdout.trim();
};
check(
  "platform",
  () => {
    if (!["linux", "darwin"].includes(process.platform))
      throw Error("POSIX macOS/Linux required");
    return process.platform + "/" + process.arch;
  },
  "Use macOS or Linux. Native Windows is not supported.",
);
check(
  "node",
  () => {
    const [major, minor, patch] = process.versions.node.split(".").map(Number);
    if (major !== 26 || minor < 12 || (minor === 12 && patch < 1))
      throw Error("Node 26.12.1 or later 26.x required");
    return process.version;
  },
  "Use the version in .nvmrc.",
);
check("git", () => run("git", ["--version"]), "Install Git.");
check(
  "kujo",
  () => {
    const v = run(require("@kujolang/kujo-runtime").resolveKujoBinary(), [
      "--version",
    ]);
    if (v !== "kujo 1.9.0") throw Error("Expected kujo 1.9.0");
    return v;
  },
  "Run npm ci with optional platform packages enabled.",
);
check(
  "codex",
  () => {
    const v = run(path.join(root, "node_modules/.bin/codex"), ["--version"]);
    if (v !== "codex-cli 0.144.4") throw Error("Expected Codex CLI 0.144.4");
    return v;
  },
  "Run npm ci. This check never signs in or calls the provider.",
);
check(
  "hyperframes",
  () => {
    const v = run(path.join(root, "node_modules/.bin/hyperframes"), [
      "--version",
    ]);
    if (v !== "0.9.40") throw Error("Expected HyperFrames 0.9.40");
    return v;
  },
  "Run npm ci. Browser/render verification is performed separately by an actual project check.",
);
check(
  "ffmpeg",
  () => {
    const v = run("ffmpeg", ["-version"]).split("\n")[0];
    const m = v.match(/ffmpeg version (\d+)/);
    if (!m || Number(m[1]) < 6) throw Error("FFmpeg >=6 required");
    return v;
  },
  "Install FFmpeg >=6 with libx264/AAC support.",
);
check(
  "ffprobe",
  () => {
    const v = run("ffprobe", ["-version"]).split("\n")[0];
    const m = v.match(/ffprobe version (\d+)/);
    if (!m || Number(m[1]) < 6) throw Error("ffprobe >=6 required");
    return v;
  },
  "Install ffprobe with FFmpeg.",
);
check(
  "ffmpeg-encoders",
  () => {
    const s = run("ffmpeg", ["-hide_banner", "-encoders"]);
    if (!/\blibx264\b/.test(s) || !/\baac\b/.test(s))
      throw Error("libx264 and AAC encoders required");
    return ["libx264", "aac"];
  },
  "Install an FFmpeg build with libx264 and AAC encoding.",
);
let lock, raw;
check(
  "source-lock",
  () => {
    raw = fs.readFileSync(path.join(root, "sources.lock.json"));
    lock = JSON.parse(raw);
    if (lock.schema !== "kujo.videoops-factory.sources/v1")
      throw Error("Unsupported lock");
    return createHash("sha256").update(raw).digest("hex");
  },
  "Restore the repository source lock.",
);
if (lock) {
  for (const [name, source] of Object.entries(lock.repositories))
    check(
      name,
      () => {
        const dest = path.join(root, ".runtime/deps", name);
        if (
          fs.lstatSync(dest).isSymbolicLink() ||
          !fs.existsSync(path.join(dest, ".git"))
        )
          throw Error("Dependency must be its own plain Git checkout");
        if (
          run("git", ["rev-parse", "--show-toplevel"], dest) !== dest ||
          run("git", ["rev-parse", "HEAD"], dest) !== source.commit ||
          run("git", ["status", "--porcelain", "--untracked-files=all"], dest)
        )
          throw Error("Dependency is dirty or revision differs");
        return source.commit;
      },
      "Run npm run setup. Preserve changed dependencies before moving them aside.",
    );
  check(
    "python-media-review",
    () => {
      const venv = path.join(root, ".runtime/venv");
      if (fs.lstatSync(venv).isSymbolicLink())
        throw Error("Venv symlink rejected");
      const marker = JSON.parse(
        fs.readFileSync(path.join(venv, "factory-setup.json"), "utf8"),
      );
      if (marker.lockHash !== createHash("sha256").update(raw).digest("hex"))
        throw Error("Python setup lock mismatch");
      const expected = {
        ...lock.python.requirements,
        [lock.python.distribution]: lock.python.version,
      };
      const python = path.join(venv, "bin/python");
      const versions = JSON.parse(
        run(python, [
          "-c",
          'import json,sys;from importlib.metadata import version;assert sys.version_info >= (3,10);from videoops.review import ReviewService;from videoops.media import MediaService;print(json.dumps({"python":sys.version.split()[0],"packages":{name:version(name) for name in json.loads(sys.argv[1])}}))',
          JSON.stringify(Object.keys(expected)),
        ]),
      );
      for (const [name, version] of Object.entries(expected))
        if (versions.packages[name] !== version)
          throw Error("Python package differs: " + name);
      run(python, ["-m", "pip", "check"]);
      return versions;
    },
    "Run npm run setup. Preserve/move an incompatible .runtime/venv before reinstalling.",
  );
}
check(
  "disk",
  () => {
    const s = fs.statfsSync(root),
      free = s.bavail * s.bsize;
    if (free < 2 * 1024 ** 3) throw Error("Less than 2 GiB free");
    return { availableGiB: Math.round(free / 1024 ** 3) };
  },
  "Free disk space for rendered media and evidence.",
);
const result = {
  schema: "kujo.videoops-factory.doctor/v1",
  ok: checks.every((x) => x.ok),
  mode: "local-tools-only",
  providerAuthenticationChecked: false,
  providerCalls: 0,
  renderQualified: false,
  checks,
};
if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
else {
  for (const c of checks)
    console.log(
      `${c.ok ? "PASS" : "FAIL"} ${c.name}${c.ok ? "" : ": " + c.error + "\n  Fix: " + c.fix}`,
    );
  console.log(
    "Local tooling only: this does not qualify provider access, browser rendering, rights or perceptual review.",
  );
}
process.exitCode = result.ok ? 0 : 1;
