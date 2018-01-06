#!/bin/bash
# This script will fix package issues I encountered so far
inf="\e[1;36;40m"
clrE="\e[0m"
echo -e "${inf}Re-installing node modules${clrE}"
rm -rf ~/.node-gyp/
rm -rf node_modules/
npm i --no-optional
echo -e "${inf}Deduplicating modules${clrE}"
npm dedupe
echo -e "${inf}Updating modules${clrE}"
npm up