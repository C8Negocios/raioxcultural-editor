import paramiko
import json
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('157.180.122.109', username='root', password='jpfg9tgbVvLw')
stdin, stdout, stderr = client.exec_command('docker exec coolify-db psql -U coolify -d coolify -t -c "SELECT fqdn FROM applications WHERE uuid=\'xviyfx1zxvseeh2xvmzga091\';"')
print("DB_FQDN:", stdout.read().decode().strip())
client.close()
