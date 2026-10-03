#!/usr/bin/env bash
# Pull the image published by cd-dockerhub.yml and run it on the LOCAL Docker Engine.
# Usage: DOCKERHUB_USERNAME=<user> [IMAGE_TAG=latest] ./scripts/deploy-local.sh
set -euo pipefail

: "${DOCKERHUB_USERNAME:?Set DOCKERHUB_USERNAME}"
export IMAGE_TAG="${IMAGE_TAG:-latest}"

docker compose -f docker-compose-prod.yaml pull
docker compose -f docker-compose-prod.yaml up -d

echo "Waiting for product-api to become healthy..."
for i in $(seq 1 30); do
  status=$(docker inspect --format '{{.State.Health.Status}}' product-api 2>/dev/null || echo "starting")
  if [ "$status" = "healthy" ]; then
    echo "Deployed. http://localhost:3000/api/health"
    exit 0
  fi
  sleep 2
done
echo "product-api did not become healthy" >&2
docker compose -f docker-compose-prod.yaml logs product-api >&2
exit 1
