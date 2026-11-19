// 통근시간 사전표: 태전역(대구 3호선) 근처 집에서 대중교통 편도 추정 시간(분).
// 집 → 태전역 도보·대기 약 8분 + 승차 + 하차 후 도보/버스를 더한 값. 오차 ±5분 정도의 추정이다.
// 정확한 시간은 공고마다 카카오맵 길찾기 링크로 확인한다. 설정 화면에서 고칠 수 있다.

export interface CommuteArea {
  /** 표시 이름 */
  area: string;
  /** 주소·단지명에서 찾을 말 (동 이름, 도로명, 지역 이름) */
  keys: string[];
  /** 편도 추정(분) */
  min: number;
  /** 대략적인 경로 */
  route: string;
}

export const COMMUTE_LIMIT = 30;
export const COMMUTE_MAX = 35;

export const DEFAULT_COMMUTE: CommuteArea[] = [
  // 북구 칠곡지구
  { area: '북구 태전동', keys: ['태전동', '태전로', '태전역', '태전'], min: 8, route: '도보·마을버스' },
  { area: '북구 구암동', keys: ['구암동', '구암로', '구암역', '구암'], min: 12, route: '3호선 태전→구암 1정거장' },
  { area: '북구 매천동', keys: ['매천동', '매천로', '매천역', '매천시장'], min: 12, route: '3호선 태전→매천' },
  { area: '북구 관음동', keys: ['관음동', '관음로', '관음중앙로', '관음'], min: 15, route: '버스 10분대' },
  { area: '북구 동천동', keys: ['동천동', '동천로', '동천역', '동천'], min: 15, route: '3호선 태전→동천 3정거장' },
  { area: '북구 읍내동', keys: ['읍내동', '팔거역', '팔거천', '읍내'], min: 16, route: '3호선 태전→팔거' },
  { area: '북구 팔달동', keys: ['팔달동', '팔달역'], min: 16, route: '3호선 태전→팔달' },
  { area: '북구 금호동', keys: ['금호동', '금호지구', '서변대로'], min: 18, route: '3호선 매천·팔달역 + 도보' },
  { area: '북구 학정동', keys: ['학정동', '학정로', '학정역', '칠곡경대병원', '학정'], min: 20, route: '3호선 태전→학정·칠곡경대병원' },
  { area: '북구 국우동', keys: ['국우동', '국우로', '국우'], min: 22, route: '버스 15~20분' },
  { area: '북구 노곡동', keys: ['노곡동'], min: 22, route: '3호선 팔달역 + 버스' },
  { area: '북구 노원동', keys: ['노원동', '노원로', '공단역', '만평역'], min: 22, route: '3호선 태전→공단·만평' },
  { area: '북구 원대동', keys: ['원대동', '원대로', '원대역'], min: 24, route: '3호선 태전→원대' },
  { area: '북구 사수동', keys: ['사수동', '사수로'], min: 25, route: '버스 20분 안팎' },
  { area: '북구 조야동', keys: ['조야동'], min: 25, route: '버스 20분 안팎' },
  { area: '북구 침산동', keys: ['침산동', '침산로', '오봉산', '침산'], min: 28, route: '3호선 팔달시장·원대역 + 도보·버스' },
  { area: '북구 도남동', keys: ['도남동', '도남길', '도남중앙로', '도남지구', '도남'], min: 28, route: '버스(국우동 경유) 20~25분' },
  { area: '북구 고성동', keys: ['고성동', '고성로', '북구청역'], min: 28, route: '3호선 태전→북구청' },
  { area: '북구 칠성동', keys: ['칠성동', '칠성시장', '대구역'], min: 33, route: '3호선 북구청역 + 도보·버스' },
  { area: '북구 산격동', keys: ['산격동', '산격로', '엑스코', '산격'], min: 34, route: '3호선 + 버스 환승' },
  { area: '북구 대현동', keys: ['대현동', '대현로', '대현'], min: 38, route: '지하철 환승 + 버스' },
  { area: '북구 복현동', keys: ['복현동', '복현로', '복현'], min: 40, route: '버스 환승' },
  { area: '북구 검단동', keys: ['검단동'], min: 42, route: '버스 환승' },
  { area: '북구 동변동', keys: ['동변동'], min: 40, route: '버스 환승' },
  { area: '북구 서변동', keys: ['서변동'], min: 40, route: '버스 환승' },
  { area: '북구 연경동', keys: ['연경동', '연경지구', '연경'], min: 45, route: '버스 환승' },
  // 북구 칠곡지구 도로명(동이 안 적힌 주소용)
  { area: '북구 칠곡 일대', keys: ['칠곡중앙대로', '팔거천동로', '팔거천서로', '칠곡지구', '칠곡3지구', '칠곡'], min: 15, route: '3호선·버스 15분 안팎' },
  // 서구·중구
  { area: '서구 비산동', keys: ['비산동', '북비산', '비산로', '비산'], min: 32, route: '3호선 원대·달성공원 + 도보·버스' },
  { area: '서구 이현동', keys: ['이현동'], min: 34, route: '3호선 + 버스' },
  { area: '서구 평리동', keys: ['평리동', '평리로', '평리'], min: 38, route: '3호선 + 버스 환승' },
  { area: '서구 내당동', keys: ['내당동'], min: 40, route: '3호선→2호선 환승' },
  { area: '서구 중리동', keys: ['중리동'], min: 42, route: '환승 2회' },
  { area: '중구 대신동', keys: ['대신동', '달성공원'], min: 32, route: '3호선 태전→달성공원' },
  { area: '중구 동산동', keys: ['동산동', '서문시장'], min: 34, route: '3호선 태전→서문시장' },
  { area: '중구 남산동', keys: ['남산동', '남산역'], min: 36, route: '3호선 태전→남산' },
  { area: '중구 시내', keys: ['동성로', '삼덕동', '성내동', '대봉동', '동인동', '반월당'], min: 38, route: '3호선 + 환승·도보' },
  // 칠곡군
  { area: '칠곡군 동명면', keys: ['동명면'], min: 32, route: '3호선 칠곡경대병원 + 버스' },
  { area: '칠곡군 지천면', keys: ['지천면'], min: 38, route: '버스 환승' },
  { area: '칠곡군 석적읍', keys: ['석적읍', '석적'], min: 45, route: '버스 환승' },
  { area: '칠곡군 북삼읍', keys: ['북삼읍', '북삼'], min: 50, route: '버스 환승' },
  { area: '칠곡군 왜관읍', keys: ['왜관읍', '왜관'], min: 55, route: '버스·기차' },
  { area: '칠곡군', keys: ['칠곡군'], min: 45, route: '버스 환승' },
  // 먼 곳 (구 단위)
  { area: '수성구', keys: ['수성구'], min: 50, route: '3호선 30분 이상 + 환승' },
  { area: '동구', keys: ['동구'], min: 50, route: '환승 2회 이상' },
  { area: '남구', keys: ['남구'], min: 45, route: '3호선→1호선 환승' },
  { area: '달서구', keys: ['달서구'], min: 55, route: '3호선→2호선 환승' },
  { area: '달성군', keys: ['달성군'], min: 65, route: '환승 2회 이상' },
  { area: '경산', keys: ['경산'], min: 70, route: '환승 2회 이상' },
];

export type CommuteVerdict = 'ok' | 'edge' | 'far' | 'unknown';

export interface CommuteResult {
  verdict: CommuteVerdict;
  min: number | null;
  area: string | null;
  route: string | null;
  matched: string | null;
}

const compact = (s: string) => s.replace(/\s+/g, '');

const DISTRICTS = ['수성구', '달서구', '달성군', '칠곡군', '북구', '서구', '중구', '남구', '동구', '경산'];

/** 표 항목이 속한 구 (area 의 첫 단어) */
function districtOf(area: string): string {
  return area.split(' ')[0];
}

/** 주소(우선)와 단지명으로 표에서 가장 그럴듯한 지역을 찾는다.
 *  주소에 구가 적혀 있으면 그 구의 항목만 본다 (예: 서구 고성로 ≠ 북구 고성동). */
export function estimateCommute(address: string, site: string, table: CommuteArea[] = DEFAULT_COMMUTE): CommuteResult {
  const addr = compact(address || '');
  const district = DISTRICTS.find((d) => addr.includes(d)) ?? null;
  const pool = district ? table.filter((a) => districtOf(a.area) === district || a.area === district) : table;
  // 주소에 동·읍·면 이름이 직접 적혀 있으면 그것을 먼저 본다 (예: "도남중앙로7길 7(국우동)")
  const dongs = (address || '').match(/[가-힣]{1,6}(?:동|읍|면)(?=[\s,)]|$)/g) ?? [];
  for (const text of [...dongs.map(compact), addr, compact(site || '')]) {
    if (!text) continue;
    let best: { a: CommuteArea; k: string } | null = null;
    for (const a of pool)
      for (const k of a.keys) {
        const ck = compact(k);
        if (ck.length >= 2 && text.includes(ck) && (!best || ck.length > compact(best.k).length)) best = { a, k };
      }
    if (best) {
      const m = best.a.min;
      return {
        verdict: m <= COMMUTE_LIMIT ? 'ok' : m <= COMMUTE_MAX ? 'edge' : 'far',
        min: m,
        area: best.a.area,
        route: best.a.route,
        matched: best.k,
      };
    }
  }
  // 동을 모르면 판정 보류 (가까운 구만 "확인 필요"로 보여 준다)
  return { verdict: 'unknown', min: null, area: district ? `${district}(동 미상)` : null, route: null, matched: null };
}

export interface Geo {
  lat: number;
  lng: number;
}

/** 카카오맵 대중교통 길찾기. 두 좌표가 있으면 경로 결과 화면으로 바로 열고, 없으면 이름으로 검색 화면을 연다. */
export function kakaoRouteUrl(from: string, to: string, fromGeo?: Geo | null, toGeo?: Geo | null): string {
  // 이름 안의 쉼표·슬래시는 링크 구분자와 겹치므로 공백으로 바꾼다
  const nm = (s: string) => encodeURIComponent(s.replace(/[,/]/g, ' ').replace(/\s+/g, ' ').trim() || '위치');
  if (fromGeo && toGeo)
    return `https://map.kakao.com/link/by/traffic/${nm(from)},${fromGeo.lat},${fromGeo.lng}/${nm(to)},${toGeo.lat},${toGeo.lng}`;
  return `https://map.kakao.com/?sName=${encodeURIComponent(from)}&eName=${encodeURIComponent(to)}`;
}

/** 근거리 키워드(지원동기 거리 문장용): 30분 이내 지역의 키워드 */
/** 직선거리(km) */
export function distanceKm(a: Geo, b: Geo): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 집↔근무지 거리로 본 대중교통 편도 추정(분): 도보·대기 9분 + km당 약 4.2분 (대구 도심 버스·지하철 평균) */
export function minutesByDistance(home: Geo, work: Geo): number {
  return Math.round(9 + distanceKm(home, work) * 4.2);
}

/** 최종 추정: 동별 표와 거리 추정을 함께 본다 (둘 다 있으면 평균, 하나만 있으면 그것) */
export function finalMinutes(tableMin: number | null, home?: Geo | null, work?: Geo | null): { min: number | null; km: number | null } {
  const km = home && work ? distanceKm(home, work) : null;
  const g = home && work ? minutesByDistance(home, work) : null;
  if (tableMin !== null && g !== null) return { min: Math.round((tableMin + g) / 2), km };
  return { min: g ?? tableMin, km };
}

export function nearKeywordsFrom(table: CommuteArea[] = DEFAULT_COMMUTE): string[] {
  return Array.from(new Set(table.filter((a) => a.min <= COMMUTE_LIMIT).flatMap((a) => a.keys)));
}
