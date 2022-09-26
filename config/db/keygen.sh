#!/bin/bash

openssl rand -base64 756 -out mongodb-keyfile
chmod 400 mongodb-keyfile
