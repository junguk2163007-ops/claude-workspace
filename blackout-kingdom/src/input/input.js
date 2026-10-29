// 키보드와 터치 입력을 하나의 "의도(intent)"로 합친다.
// 규칙 코드는 이 의도만 받기 때문에 입력 방식이 바뀌어도 규칙은 그대로다.

const LEFT = ['ArrowLeft', 'KeyA'];
const RIGHT = ['ArrowRight', 'KeyD'];
const INVEST = ['ArrowDown', 'KeyS', 'Space'];

export function createInput() {
  const keys = new Set();
  const touch = { left: false, right: false, invest: false };

  window.addEventListener('keydown', (e) => {
    if ([...LEFT, ...RIGHT, ...INVEST, 'ArrowUp'].includes(e.code)) e.preventDefault();
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => {
    keys.clear();
    touch.left = touch.right = touch.invest = false;
  });

  // 화면 버튼: data-btn="left|right|invest"
  for (const el of document.querySelectorAll('[data-btn]')) {
    const name = el.dataset.btn;
    const on = (e) => {
      e.preventDefault();
      touch[name] = true;
      el.classList.add('pressed');
    };
    const off = (e) => {
      e.preventDefault();
      touch[name] = false;
      el.classList.remove('pressed');
    };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('pointerleave', off);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  const any = (codes) => codes.some((c) => keys.has(c));

  return {
    getIntent() {
      const left = any(LEFT) || touch.left;
      const right = any(RIGHT) || touch.right;
      return {
        move: (right ? 1 : 0) - (left ? 1 : 0),
        invest: any(INVEST) || touch.invest,
      };
    },
  };
}
