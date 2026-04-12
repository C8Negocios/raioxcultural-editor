import urllib.request
import json

token = "1|12bkSkPcjHUu3Y60t08RvJvaDOu5UyhNZEt8FrG9e19e1dee"
url = "http://157.180.122.109:8000/api/v1/applications"

req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
with urllib.request.urlopen(req) as response:
    apps = json.loads(response.read().decode())

target_uuid = None
print("Aplicacoes:")
for app in apps:
    print("- " + str(app.get("name")) + " | UUID: " + str(app.get("uuid")) + " | fqdn: " + str(app.get("fqdn")))
    name = str(app.get("name")).lower()
    fqdn = str(app.get("fqdn")).lower()
    if "editor" in name or "studio" in name or "c8studio" in fqdn:
        target_uuid = app.get("uuid")

if target_uuid:
    print(f"\nTriggering deployment for uuid {target_uuid}...")
    deploy_url = f"http://157.180.122.109:8000/api/v1/deploy?uuid={target_uuid}&force=true"
    req_deploy = urllib.request.Request(deploy_url, headers={"Authorization": f"Bearer {token}"}, method="POST")
    try:
        with urllib.request.urlopen(req_deploy) as res:
            print(res.status, res.read().decode())
    except Exception as e:
        print("Erro:", str(e))
else:
    print("Could not find uuid.")
