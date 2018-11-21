docker rm -f task-microservice-worker
# docker run -e "PORT=7700" -e "LOGGING_LEVEL=verbose" -p 7700:7700 --rm -d --name task-microservice-worker task-microservice-worker
docker run -e "PORT=7700" -p 7700:7700 --rm -d --name task-microservice-worker task-microservice-worker
docker logs --tail 1000 -f -t task-microservice-worker