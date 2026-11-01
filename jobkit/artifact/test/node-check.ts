import fs from 'node:fs';
import path from 'node:path';
import { parsePosting } from '../../lib/parser';
import { analyze } from '../../lib/analyze';
import { composeLetter, composeResume } from '../../lib/render/compose';
import { layoutLetter, layoutResume, loadFonts, toPdf } from '../src/pdfdoc';
import { DEFAULT_BLOCKS, DEFAULT_QUALS, DEFAULT_PREFS } from '../src/defaults';

const root = process.argv[2];
const out = process.argv[3];
const fonts = loadFonts(fs.readFileSync(path.join(root, 'artifact/fonts/kr-Regular.ttf')), fs.readFileSync(path.join(root, 'artifact/fonts/kr-Bold.ttf')));
const seed = JSON.parse(fs.readFileSync(path.join(root, 'seed/profile.json'), 'utf8')).profile;
const profile = { ...seed, photo_file: null };
(async () => {
  for (const f of ['F1_donam3.txt', 'F2_donam2.txt', 'F3_chilgok.txt', 'F4_suseong.txt']) {
    const text = fs.readFileSync(path.join(root, 'tests/fixtures', f), 'utf8');
    const parsed = parsePosting(text, '2026-10-24');
    const analysis = analyze(text, parsed, { qualifications: DEFAULT_QUALS, settings: DEFAULT_PREFS, today: '2026-10-24' });
    const input = { profile, blocks: DEFAULT_BLOCKS, parsed, analysis, today: '2026-10-24' };
    const r = layoutResume(fonts, composeResume(input), false);
    const l = layoutLetter(fonts, composeLetter(input));
    fs.writeFileSync(path.join(out, f + '.resume.pdf'), await toPdf(fonts, r.pages, '이력서', null));
    fs.writeFileSync(path.join(out, f + '.letter.pdf'), await toPdf(fonts, l.pages, '자기소개서', null));
    console.log(f, 'resume', r.pages.length, r.level.fs, r.overflow, '| letter', l.pages.length, l.level.fs, l.overflow);
  }
})();
