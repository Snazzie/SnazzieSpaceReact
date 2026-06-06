#!/usr/bin/env bash
# Finish CosyVoice 2 deps in the WSL `cosy` conda env, then download the model.
set -e
PY=/home/acoop/miniconda3/envs/cosy/bin/python
COSY=/home/acoop/CosyVoice
cd "$COSY"

echo "=== upgrade pip + pin build tools ==="
"$PY" -m pip install -U pip
"$PY" -m pip install 'setuptools<81' wheel 'numpy==1.26.4' cython

echo "=== install requirements (no build isolation) ==="
"$PY" -m pip install --no-build-isolation -r /tmp/req-trim.txt

echo "=== download CosyVoice2-0.5B ==="
"$PY" - <<'PYEOF'
from modelscope import snapshot_download
snapshot_download('iic/CosyVoice2-0.5B', local_dir='/home/acoop/CosyVoice/pretrained_models/CosyVoice2-0.5B')
print("MODEL_OK")
PYEOF
echo ALL_OK
