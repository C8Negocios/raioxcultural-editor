import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("157.180.122.109", username="root", password="jpfg9tgbVvLw")
cmd = 'docker exec coolify-db psql -U coolify -d coolify -t -c "SELECT name, fqdn FROM applications WHERE uuid=\'hbpj8kjq4obyzb2lkqmvpg9g\';"'
stdin, stdout, stderr = client.exec_command(cmd)
print("BACKEND FQDN:", stdout.read().decode().strip())
client.close()
