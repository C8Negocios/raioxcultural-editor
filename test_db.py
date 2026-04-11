import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("157.180.122.109", username="root", password="jpfg9tgbVvLw")
cmd = 'docker exec coolify-db psql -U coolify -d coolify -t -c "UPDATE applications SET fqdn=\'https://c8studio.codigooito.com.br\' WHERE uuid=\'xviyfx1zxvseeh2xvmzga091\';"'
stdin, stdout, stderr = client.exec_command(cmd)
print("DB VALUE:", stdout.read().decode().strip())
client.close()
