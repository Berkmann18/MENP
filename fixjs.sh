#!/usr/bin/env bash

while (( "$#" )); do
  echo "- $1"
  eslint -c config/.eslintrc.js $1 --fix
  shift
done