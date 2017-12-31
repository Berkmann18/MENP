#!/bin/bash
# This script will fix package issues I encountered so far
rm -rf node_modules/ 
#rm -rf node_modules/express/node_modules/qs #Security vulnerability in v0.0.6
#rm -rf node_modules/request/node_modules/ #Dedup conflict with node_modules/uuid 
npm i --no-optional
npm dedupe
npm up
