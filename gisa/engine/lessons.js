// 배우기(읽기) 레슨 등록. 레슨 순서 = 커리큘럼 순서.
// 형식: { id, part, concept|null, title, goal, sections:[{h, p:[...], list:[...]}], how:[...], example:'템플릿#시드'|null, points:[...] }
(function (G) {
  'use strict';
  G.lessons = [];
  G.lessonMap = {};
  G.lessonParts = [];

  G.defineLesson = function (l) {
    if (G.lessonMap[l.id]) throw new Error('레슨 id 중복: ' + l.id);
    if (G.lessonParts.indexOf(l.part) === -1) G.lessonParts.push(l.part);
    G.lessons.push(l);
    G.lessonMap[l.id] = l;
  };

  G.lessonFor = function (conceptId) {
    return G.lessons.find((l) => l.concept === conceptId) || null;
  };
})(globalThis.GISA);
