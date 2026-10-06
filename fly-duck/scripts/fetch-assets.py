"""Recreate pinned assets and sensory/descending metadata (Python stdlib only)."""
import csv
import gzip
import hashlib
import io
import json
import pathlib
import struct
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
PROVENANCE = json.loads((ROOT / 'provenance.json').read_text())
BRAIN = f"https://raw.githubusercontent.com/snedea/flybrain/{PROVENANCE['brain_commit']}"
ROBOT = f"https://huggingface.co/spaces/pollen-robotics/microduck-simulator/resolve/{PROVENANCE['robot_commit']}/app"

def fetch(url):
    with urllib.request.urlopen(url) as response:
        return response.read()

def write(path, data):
    dest = ROOT / path
    dest.parent.mkdir(parents=True, exist_ok=True)
    expected = PROVENANCE['files'].get(path)
    if expected and hashlib.sha256(data).hexdigest() != expected:
        raise ValueError(f'Hash mismatch: {path}')
    dest.write_bytes(data)
    print(path)

write('public/brain/connectome.bin.gz', fetch(f'{BRAIN}/data/connectome.bin.gz'))
for path in PROVENANCE['files']:
    if path.startswith(('public/robot/', 'public/policies/')):
        write(path, fetch(f'{ROBOT}/{path}'))

def rows(name):
    return csv.DictReader(io.StringIO(gzip.decompress(fetch(f'{BRAIN}/data/{name}.csv.gz')).decode()))

ids = [row['root_id'] for row in rows('neurons')]
index = {root_id: i for i, root_id in enumerate(ids)}
channels, display = {}, []
classification = list(rows('classification'))
for row in classification:
    i = index[row['root_id']]
    side, super_class, cls = row['side'], row['super_class'], row['class']
    if super_class == 'sensory' and cls in ('visual', 'olfactory', 'mechanosensory') and side in ('left', 'right'):
        channels.setdefault(f'{cls}_{side}', []).append(i)
    if super_class == 'descending' and side in ('left', 'right'):
        channels.setdefault(f'descending_{side}', []).append(i)
    group = {'sensory': 1, 'optic': 2, 'descending': 4}.get(super_class, 3)
    display.append([i, group])
for row in classification:
    if row['class'] in ('ALPN', 'LHCENT', 'LHLN', 'CX') and row['side'] in ('left', 'right'):
        channels.setdefault(f"{row['class']}_{row['side']}", []).append(index[row['root_id']])
metadata = {'channels': channels, 'displayGroups': [group for _, group in sorted(display)]}
write('public/brain/channels.json', json.dumps(metadata, separators=(',', ':')).encode())

# Keep the first anatomical point for each root ID, in binary graph order.
coordinates = {}
for row in rows('coordinates'):
    coordinates.setdefault(row['root_id'], tuple(float(x) for x in row['position'].strip('[]').split()))
assert len(coordinates) == len(ids) == 139255
write('public/brain/anatomy/positions.bin', b''.join(struct.pack('<3f', *coordinates[root]) for root in ids))
ANATOMY = f"https://raw.githubusercontent.com/navis-org/navis-flybrains/{PROVENANCE['anatomy']['commit']}"
write('public/brain/anatomy/tissue.ply', fetch(f'{ANATOMY}/flybrains/meshes/FLYWIRE_whole_brain.ply'))
write('public/brain/anatomy/tissue-source.md', fetch(f'{ANATOMY}/flybrains/meshes/FLYWIRE_whole_brain.md'))
write('licenses/navis-flybrains-GPL-3.0.txt', fetch(f'{ANATOMY}/LICENSE'))
