#!/bin/bash


# Wait for docker daemon to be ready
while ! curl -sS localhost:2375 > /dev/null; do
    sleep 1;
done


docker run --rm -it --name ucp \
  -v /var/run/docker.sock:/var/run/docker.sock \
  docker/ucp:2.1.5 install --force-insecure-tcp \
  --san *.${PWD_HOST_FQDN} \
  --host-address eth0 \
  --admin-username admin \
  --admin-password admin1234
