#!/bin/sh
# ACR122U prove: SELECT, GET_PUB empty, GENERATE, GET_PUB match, GENERATE 6985,
# SIGN 32/64/200/512 with RFC 8032 host verify, then OwnerPIN SET/VERIFY/GET_STATUS.
set -e
ROOT="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
GP="${GP:-/tmp/gp.jar}"
CAP="$ROOT/build/heir.cap"
if [ ! -f "$GP" ]; then
  echo "Set GP to GlobalPlatformPro gp.jar (not the shell alias gp)." >&2
  exit 1
fi
if [ ! -f "$CAP" ]; then
  echo "Run sh card/build.sh first." >&2
  exit 1
fi

AID=F04559450201
export ROOT GP AID

python3 - "$CAP" <<'PY'
import os, re, subprocess, sys

gp_jar = os.environ["GP"]
root = os.environ["ROOT"]
aid = os.environ["AID"]

def gp(*apdus, extra=None):
    cmd = ["java", "-jar", gp_jar, "-d"]
    if extra:
        cmd.extend(extra)
    for a in apdus:
        cmd.extend(["--apdu", a])
    proc = subprocess.run(cmd, capture_output=True, text=True)
    out = proc.stdout + proc.stderr
    print(out)
    if "A<<" not in out and proc.returncode != 0:
        raise SystemExit(f"gp.jar exited {proc.returncode}")
    return out

def cmd_hex(line):
    tail = line.rsplit(")", 1)[-1].strip()
    return "".join(t for t in tail.split() if re.fullmatch(r"[0-9A-Fa-f]+", t)).upper()

def last_body_sw(text):
    pending = None
    hits = []
    for line in text.splitlines():
        if "A>>" in line:
            pending = cmd_hex(line)
            continue
        if "A<<" not in line or pending is None:
            continue
        cmd = pending
        pending = None
        if cmd.startswith("00A40400"):
            continue
        tail = line.rsplit(")", 1)[-1].strip()
        toks = [t for t in tail.split() if re.fullmatch(r"[0-9A-Fa-f]+", t) and len(t) % 2 == 0]
        blob = "".join(toks).upper()
        if len(blob) < 4:
            continue
        hits.append((blob[:-4], blob[-4:]))
    if not hits:
        raise SystemExit("no applet APDU response in gp output:\n" + text)
    return hits[-1]

def expect(sw, body, want_sw, want_len=None, label=""):
    if sw != want_sw:
        raise SystemExit(f"{label}: SW {sw} want {want_sw} body={body}")
    if want_len is not None and len(body) // 2 != want_len:
        raise SystemExit(f"{label}: body {len(body)//2} bytes want {want_len}: {body}")
    print(f"ok {label} SW={sw} len={len(body)//2}")

def sign_apdus(msg: bytes):
    apdus = []
    i = 0
    while i < len(msg):
        chunk = msg[i : i + 200]
        last = i + len(chunk) >= len(msg)
        p1 = "80" if last else "00"
        apdus.append(f"0003{p1}00{len(chunk):02X}{chunk.hex().upper()}")
        i += len(chunk)
    return apdus

def verify(pub, sig, msg):
    proc = subprocess.run(
        ["bun", os.path.join(root, "verify.mjs"), pub, sig, msg.hex()],
        capture_output=True,
        text=True,
    )
    print(proc.stdout + proc.stderr)
    if proc.returncode != 0:
        raise SystemExit("host verify failed")

select = f"00A40400{len(aid)//2:02X}{aid}00"

print("== GET_PUB before generate (expect 6A88) ==")
out = gp(select, "0002000020")
_, sw = last_body_sw(out)
expect(sw, "", "6A88", label="GET_PUB empty")

print("== GENERATE ==")
out = gp(select, "0001000020")
pub, sw = last_body_sw(out)
expect(sw, pub, "9000", 32, "GENERATE")

print("== GET_PUB match ==")
out = gp(select, "0002000020")
pub2, sw = last_body_sw(out)
expect(sw, pub2, "9000", 32, "GET_PUB")
if pub2 != pub:
    raise SystemExit(f"GET_PUB {pub2} != GENERATE {pub}")

print("== GENERATE occupied (expect 6985) ==")
out = gp(select, "0001000020")
_, sw = last_body_sw(out)
expect(sw, "", "6985", label="GENERATE full")

vectors = [
    (32, bytes([0x5A]) * 32),
    (64, bytes([0xA5]) * 64),
    (200, bytes([0x11]) * 200),
    (512, bytes([0x22]) * 512),
]
for n, msg in vectors:
    print(f"== SIGN {n} ==")
    out = gp(select, *sign_apdus(msg))
    sig, sw = last_body_sw(out)
    expect(sw, sig, "9000", 64, f"SIGN {n}")
    verify(pub, sig, msg)

pin = "31323334"
msg32 = bytes([0x5A]) * 32
print("== SET_PIN ==")
out = gp(select, f"0004000004{pin}")
_, sw = last_body_sw(out)
expect(sw, "", "9000", label="SET_PIN")

print("== GET_STATUS after SET_PIN ==")
out = gp(select, "0006000003")
body, sw = last_body_sw(out)
expect(sw, body, "9000", 3, "GET_STATUS")
if body != "010103":
    raise SystemExit(f"GET_STATUS {body} want 010103")

print("== SIGN without VERIFY (expect 6982) ==")
out = gp(select, *sign_apdus(msg32))
_, sw = last_body_sw(out)
expect(sw, "", "6982", label="SIGN no VERIFY")

print("== VERIFY + SIGN 32 ==")
out = gp(select, f"0005000004{pin}", *sign_apdus(msg32))
sig, sw = last_body_sw(out)
expect(sw, sig, "9000", 64, "VERIFY+SIGN 32")
verify(pub, sig, msg32)

print("== VERIFY wrong PIN (expect 63C2) ==")
out = gp(select, "000500000430303030")
_, sw = last_body_sw(out)
expect(sw, "", "63C2", label="VERIFY wrong")

print("prove passed")
print(f"pub={pub}")
PY
