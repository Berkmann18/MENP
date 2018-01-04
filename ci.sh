#!/usr/bin/env bash

function chart {
    ./js2chart.sh app
    ./js2chart.sh -p bin/ w3
    routes=('generic' 'index')
    for i in "${routes[@]}"; do
        ./js2chart.sh -p routes/ $i
    done
    pub=('faHdl' 'pageChg' 'utils')
    for i in "${pub[@]}"; do
        ./js2chart.sh -p public/js/ $i
    done
}

function cc {
    files=('app' 'w3' 'generic' 'index' 'faHdl' 'pageChg' 'utils')
    paths=('.' 'bin' 'routes' 'routes' 'public/js' 'public/js' 'public/js')
    j=0
    for i in "${files[@]}"; do
        npm run cc ${paths[$j]}\/${i}.js > logs/${i}.md
        ((j++))
    done
}

npm run fmt && npm run stylelint && npm run doc && chart && cc && git commit -ae
