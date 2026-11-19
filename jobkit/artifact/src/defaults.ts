// 앱 기본값(개인정보 아님): 자격 목록, 문구 블록, 설정.
// 인적사항은 페이지 코드에 넣지 않는다. 프로필 화면에서 입력하거나 비공개 저장소에 따로 넣는다.
import seed from '../../seed.example/profile.json';
import blocks from '../../seed.example/blocks.json';
import type { Blocks, Qualification, Settings } from '../../lib/types';

export const DEFAULT_QUALS: Qualification[] = (seed.qualifications as Omit<Qualification, 'id'>[]).map((q, i) => ({ ...q, id: i + 1 }) as Qualification);
export const DEFAULT_BLOCKS: Blocks = blocks as Blocks;
export const DEFAULT_PREFS: Settings = seed.settings as Settings;
