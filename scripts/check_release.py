from pathlib import Path
import subprocess,sys
root=Path(__file__).resolve().parents[1]
print('Version:',(root/'VERSION').read_text().strip())
r=subprocess.run([sys.executable,str(root/'tests/smoke_test.py')])
sys.exit(r.returncode)
