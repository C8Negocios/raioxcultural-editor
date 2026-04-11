import paramiko
import json
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('157.180.122.109', username='root', password='jpfg9tgbVvLw')

# find running container
stdin, stdout, stderr = client.exec_command('docker ps --format "{{.Names}}" | grep xviyfx1zxvseeh2xvmzga091')
name = stdout.read().decode().strip()
print("NAME:", name)

# inspect and dump labels
if name:
    stdin, stdout, stderr = client.exec_command(f'docker inspect {name}')
    data = stdout.read().decode()
    c = json.loads(data)[0]
    for k, v in c['Config']['Labels'].items():
        if 'c8studio' in v or 'raiox' in v or 'traefik' in k:
            print(f"{k}={v}")

client.close()
