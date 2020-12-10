#!/bin/bash -eu

SHA=$(git rev-parse --short HEAD)
npm run build
tar -zcvf $SHA.tar.gz build/
