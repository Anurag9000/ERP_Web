#!/usr/bin/env python3
from __future__ import annotations
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/"artifacts"/"training_control"/"no_trainable_surface_v1.json"
EXTENSIONS={".py",".js",".jsx",".ts",".tsx",".mjs",".cjs"}
EXCLUDED={"node_modules","dist","build","vendor",".git",".training_control","scripts"}
PATTERNS={
 "torch_optimizer":r"torch\.optim",
 "torch_backward":r"\.backward\s*\(",
 "tensorflow":r"(?:@tensorflow/tfjs|tensorflow|tf\.sequential\s*\(|tf\.train\.)",
 "keras_fit":r"(?:model|estimator|classifier|regressor)\.fit\s*\(",
 "partial_fit":r"\.partial_fit\s*\(",
 "sklearn":r"sklearn\.(?:linear_model|ensemble|svm|neural_network)",
 "xgboost":r"xgboost|XGBClassifier|XGBRegressor",
 "lightgbm":r"lightgbm|LGBMClassifier|LGBMRegressor",
}
def main()->int:
 files=[];findings=[]
 for path in sorted(ROOT.rglob("*")):
  if not path.is_file() or path.suffix.lower() not in EXTENSIONS:continue
  relparts=path.relative_to(ROOT).parts
  if path.name=="run_all_training.py" or any(part in EXCLUDED for part in relparts):continue
  rel=path.relative_to(ROOT).as_posix();files.append(rel);text=path.read_text(encoding="utf-8",errors="replace")
  for kind,pattern in PATTERNS.items():
   if re.search(pattern,text,re.IGNORECASE):findings.append({"path":rel,"kind":kind,"pattern":pattern})
 unresolved=[] if not findings else [{"type":"retained_training_primitives_detected","values":findings}]
 payload={"schema_version":1,"repository":"Anurag9000/ERP_Web","classification":"web_application_no_authored_training" if not unresolved else "training_surface_detected","retained_code_files":files,"training_findings":findings,"unresolved":unresolved,"complete":not unresolved,"source_configuration_only":True,"training_executed_by_audit":False}
 OUTPUT.parent.mkdir(parents=True,exist_ok=True);tmp=OUTPUT.with_suffix(OUTPUT.suffix+".tmp");tmp.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8");tmp.replace(OUTPUT);print(json.dumps(payload,indent=2,sort_keys=True));return 0 if not unresolved else 2
if __name__=="__main__":raise SystemExit(main())
