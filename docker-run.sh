docker rm -f microservice-worker
# docker run -e "PORT=7000" -e "LOGGING_LEVEL=verbose" -p 7000:7000 --rm -d --name microservice-worker microservice-worker
docker run -e "PORT=7000" -p 7000:7000 --rm -d --name microservice-worker microservice-worker
docker logs --tail 1000 -f -t microservice-worker