// 전역 네임스페이스. 브라우저(단일 HTML)와 node(테스트) 양쪽에서 같은 파일을 그대로 쓴다.
(function (root) {
  'use strict';
  const G = (root.GISA = root.GISA || {});
  G.version = '1.0.0';
  G.subjects = [];
  G.concepts = [];
  G.conceptMap = {};
  G.templates = {};
  G.templateList = [];
  G.staticBank = [];
  G.staticMap = {};
})(typeof globalThis !== 'undefined' ? globalThis : this);
