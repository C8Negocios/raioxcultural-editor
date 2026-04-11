import urllib.request, json
import time

VS = "http://157.180.122.109:8000"
KEY = "c8club-editor-2026"
FUNNEL = "raiox-cultural"

def get(path):
    req = urllib.request.Request(f"{VS}{path}", headers={"x-editor-key": KEY})
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read().decode())

def post(path, body):
    req = urllib.request.Request(
        f"{VS}{path}",
        data=json.dumps(body).encode("utf-8"),
        headers={"x-editor-key": KEY, "Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode())

print("Testing Preview directly...")
try:
    res = post("/api/config/preview", {
        "funnel_id": FUNNEL,
        "payload": {
            "name": "TEST", "company": "TEST", "cargo": "TEST",
            "score": 50, "employees": "11 a 25"
        }
    })
    job_id = res['job_id']
    print("Job:", job_id)
    
    last_status = None
    for _ in range(60):
        time.sleep(2)
        st = get(f"/api/config/preview/{job_id}")
        if st.get('status') != last_status:
            print("Status:", st.get('status'), st.get('elapsed'))
            last_status = st.get('status')
        if st.get('status') in ['done', 'error']:
            print("FINAL:", st)
            break
except Exception as e:
    import traceback
    traceback.print_exc()
