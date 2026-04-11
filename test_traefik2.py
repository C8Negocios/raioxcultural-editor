import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("157.180.122.109", username="root", password="jpfg9tgbVvLw")
cmd = 'curl -s http://localhost:8080/api/http/routers | grep raioxcultural'
stdin, stdout, stderr = client.exec_command(cmd)
print("ROUTERS:", stdout.read().decode().strip())
client.close()
