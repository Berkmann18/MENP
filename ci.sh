#!/usr/bin/env bash

inf="\e[1;36;40m"
clrE="\e[0m"

function lint {
  echo -e "${inf}ES linting${clrE}" && npm run fmt && echo -e "${inf}CSS linting${clrE}" && npm run stylelint
}

function doc {
  echo -e "${inf}Running JSDoc${clrE}" && npm run doc
}

function sec {
    echo -e "${inf}Scanning vulnerabilities${clrE}" && nsp check
}

function chart {
  echo -e "${inf}Building charts${clrE}"
  ./js2chart.sh app
  ./js2chart.sh -p bin/ w3
  routes=('generic' 'index')
  for i in "${routes[@]}"; do
    ./js2chart.sh -p routes/ ${i}
  done
  pub=('faHdl' 'pageChg')
  for i in "${pub[@]}"; do
    ./js2chart.sh -p public/js/ ${i}
  done
}

function test {
  echo -e "${inf}Testing${clrE}" && npm test
}
function cc {
  echo -e "${inf}Checking the complexity of the code${clrE}"
  files=('app' 'w3' 'generic' 'index' 'faHdl' 'pageChg')
  paths=('.' 'bin' 'routes' 'routes' 'public/js' 'public/js')
  j=0
  for i in "${files[@]}"; do
    npm run cc ${paths[$j]}\/${i}.js > logs/${i}.md
    ((j++))
  done
}

function installing {
  echo -e "${inf}Fixing/Updating NPM modules${clrE}"
  ./fixNodeModules.sh
}

function finish {
  echo -e "${inf}Press any keys to commit${clrE}"
  read -n 1 -s
  git commit -ae
}

lint && doc && sec && test && chart && cc && finish
