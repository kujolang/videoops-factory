"""Measure an empty Ubuntu container without mounting host dependency caches.

Requires a running Docker engine. This harness installs tools only in its own
container. Its timed installer uses public downloads and never imports auth.
"""
import argparse
import json
import pathlib
import re
import subprocess
import time

parser = argparse.ArgumentParser()
parser.add_argument('trial', help='Unique evidence name, for example cold-1')
parser.add_argument('--context', help='Optional Docker context')
parser.add_argument('--keep', action='store_true', help='Keep this trial container for follow-up checks')
args = parser.parse_args()
if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,48}', args.trial):
    parser.error('Use a lowercase, hyphenated trial name')
source = pathlib.Path(__file__).resolve().parent
root = source.parent.parent
evidence = root / '.runtime' / 'onboarding' / args.trial
evidence.mkdir(parents=True, exist_ok=False)
name = 'videoops-onboarding-' + args.trial
image = 'ubuntu@sha256:2198e4c65076e9cb0b3d695219df667c0e3b0072da64ca3c2648aca17dcecaf5'
docker = ['docker'] + (['--context', args.context] if args.context else [])

def call(arguments, **kwargs):
    return subprocess.run(docker + arguments, check=True, **kwargs)

# Provisioning the OS is separate from installing on an already-running OS.
with (evidence / 'provision.log').open('w') as log:
    before = time.monotonic()
    call(['pull', image], stdout=log, stderr=subprocess.STDOUT)
    provision_seconds = time.monotonic() - before
call(['create', '--name', name, '--cpus', '4', '--memory', '3g',
      '--shm-size', '1g', image, 'sleep', 'infinity'], stdout=subprocess.DEVNULL)
call(['start', name], stdout=subprocess.DEVNULL)
try:
    with (evidence / 'baseline.txt').open('w') as log:
        call(['exec', name, 'bash', '-c',
              'cat /etc/os-release; for x in node npm git ffmpeg python3; do command -v "$x" || true; done; ls -la /root; df -h /'], stdout=log)
    call(['cp', str(source / 'install.sh'), name + ':/install.sh'])
    call(['cp', str(source / 'probe.mjs'), name + ':/probe.mjs'])
    started_epoch = time.time()
    started = time.monotonic()
    with (evidence / 'console.log').open('w') as log:
        result = subprocess.run(docker + ['exec', name, 'bash', '/install.sh'],
                                stdout=log, stderr=subprocess.STDOUT)
    receipt = dict(trial=args.trial, image=image, container=name,
                   startedAtEpoch=started_epoch, elapsedSeconds=time.monotonic()-started,
                   exitCode=result.returncode, cpuLimit=4, memoryGiB=3,
                   hostCacheMounts=False, authIncluded=False,
                   provisionSecondsExcluded=provision_seconds)
    (evidence / 'result.json').write_text(json.dumps(receipt, indent=2) + '\n')
    call(['cp', name + ':/evidence', str(evidence)])
    print(json.dumps(receipt, indent=2))
finally:
    # The unique container belongs to this invocation; evidence stays on host.
    if not args.keep:
        call(['rm', '-f', name], stdout=subprocess.DEVNULL)
