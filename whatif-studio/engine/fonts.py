"""폰트 서브셋 + woff2 변환 (build.mjs 가 호출).

입력: JSON 작업 목록 파일 경로. 각 작업 {"in", "out", "text", "wght"(가변 폰트일 때 고정할 굵기)}
필요: pip install fonttools brotli
"""
import json
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer


def run(job):
    font = TTFont(job["in"])
    opts = subset.Options()
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(text=job["text"])
    sub.subset(font)
    if job.get("wght") and "fvar" in font:
        font = instancer.instantiateVariableFont(font, {"wght": job["wght"]})
    font.flavor = "woff2"
    font.save(job["out"])


if __name__ == "__main__":
    with open(sys.argv[1], encoding="utf-8") as f:
        for job in json.load(f):
            run(job)
