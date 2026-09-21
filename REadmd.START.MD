cd ~/Documents/2027\ express/deliver-ethiopia

docker compose down -v

# Confirm no volumes remain
docker volume ls | grep -i deliver


docker compose up -d

# Wait 20 seconds
sleep 20

docker compose ps