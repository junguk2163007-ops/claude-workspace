// Playwright Chromium 실행 공통부 (render.mjs, verify-reference.mjs)
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    throw new Error('playwright 가 없습니다 → npm install (package.json 의 playwright) 후 npx playwright install chromium');
  }
}

// WebGL 이 소프트웨어(SwiftShader)로라도 뜨도록 하는 인자
export const GL_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'];

export async function launch() {
  const { chromium } = loadPlaywright();
  const opts = { args: GL_ARGS };
  if (process.env.WHATIF_CHROMIUM) opts.executablePath = process.env.WHATIF_CHROMIUM;
  return chromium.launch(opts);
}

export async function checkWebGL(page) {
  return page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return null;
    const d = gl.getExtension('WEBGL_debug_renderer_info');
    return gl.getParameter(d ? d.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
  });
}
