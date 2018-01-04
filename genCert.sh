#!/usr/bin/env bash
mkdir keys
cd keys

echo Generating server key
openssl genrsa -out server-key.pem 4096
echo Generating server certificate request
openssl req -new -key server-key.pem -out server.csr
echo Generating certificate and signing
openssl x509 -req -in server.csr -signkey server-key.pem -out server-cert.pem