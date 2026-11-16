#!/usr/bin/env python3
"""ElevenLabs Music API 로 3D 장면 배경음악 8곡을 만들어 gisa/app/anim-music-data.js 를 쓴다.
키는 환경변수 ELEVEN_KEY 에서만 읽는다. 사용: python3 gisa/tools/make-music.py [작업폴더]"""
import os, sys, json, base64, subprocess, urllib.request, urllib.error, time

KEY = os.environ['ELEVEN_KEY']
URL = 'https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128'
COMMON = (' Instrumental only, no vocals, about 45 seconds, understated luxury background music for studying, '
          'very soft drums, no big changes, seamless loop feel with a gentle start and end.')
TRACKS = {
  'ohm': 'warm minimal modern piano with soft ambient pads, calm and focused, 78 bpm, premium corporate lobby',
  'wire': 'dreamy airy celesta and glassy pads, elegant and spacious, 66 bpm, luxury hotel atrium',
  'fleming': 'light uplifting pizzicato strings and soft marimba, refined and gently rhythmic, 100 bpm, modern glass office tower morning',
  'induction': 'smooth flowing arpeggiated harp and warm synth pad, serene, 84 bpm, high-end spa lounge',
  'threephase': 'sophisticated deep-house-lite ambient with soft pulsing bass and shimmering keys, quiet and steady, 92 bpm, executive floor at night',
  'motor': 'understated downtempo groove with warm electric piano and brushed percussion, elegant, 100 bpm, penthouse bar',
  'transformer': 'slow cinematic ambient with warm strings and soft bell tones, twilight over a city skyline, 58 bpm, elegant and calm',
  'capacitor': 'gentle building piano and strings that slowly rise, hopeful and refined, 72 bpm, premium corporate presentation',
}
work = sys.argv[1] if len(sys.argv) > 1 else 'music-work'
os.makedirs(work, exist_ok=True)

def gen(name, prompt):
    raw = os.path.join(work, name + '.raw.mp3')
    if os.path.exists(raw) and os.path.getsize(raw) > 10000: return raw
    body = json.dumps({'prompt': prompt + COMMON, 'music_length_ms': 45000,
                       'force_instrumental': True, 'model_id': 'music_v1'}).encode()
    req = urllib.request.Request(URL, body, {'xi-api-key': KEY, 'Content-Type': 'application/json'})
    for t in range(3):
        try:
            with urllib.request.urlopen(req, timeout=300) as r: data = r.read()
            open(raw, 'wb').write(data); return raw
        except urllib.error.HTTPError as e:
            print(name, 'HTTP', e.code, e.read()[:300].decode('utf8', 'replace')); 
            if e.code < 500 and e.code != 429: raise
        except Exception as e:
            print(name, 'error', type(e).__name__)
        time.sleep(5 * (t + 1))
    raise RuntimeError(name + ' failed')

def duration(p):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                                          '-of', 'csv=p=0', p]).decode())

out = {}
for name, prompt in TRACKS.items():
    try:
        raw = gen(name, prompt)
        d = duration(raw)
        small = os.path.join(work, name + '.mp3')
        subprocess.check_call(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-ac', '1', '-ar', '22050',
                               '-b:a', '56k', '-af', 'afade=t=in:d=0.5,afade=t=out:st=%.2f:d=1.5' % (d - 1.5), small])
        out[name] = base64.b64encode(open(small, 'rb').read()).decode()
        print(name, '%.1fs' % duration(small), os.path.getsize(small) // 1024, 'KB')
    except Exception as e:
        print(name, 'FAILED', e)

lines = ["// ElevenLabs 로 만든 배경음악(가사 없는 연주곡). tools/make-music.py 로 생성.",
         "(function (G) {", "  'use strict';", "  G.animMusicData = {"]
items = ["    %s: 'data:audio/mpeg;base64,%s'" % (k, v) for k, v in out.items()]
lines.append(',\n'.join(items))
lines += ["  };", "})(globalThis.GISA);", ""]
path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'app', 'anim-music-data.js')
open(path, 'w', encoding='utf8').write('\n'.join(lines))
print('wrote', len(out), 'tracks')
