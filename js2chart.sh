#!/usr/bin/env bash
path="./"
format="js"
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--path)
            path=$2
            shift 1
        ;;
        -f|--format)
            format=$2
            shift 1
        ;;
        -h|--help)
            echo "Generate an SVG representation of a JS code"
            echo -e "Usage: ./js2chart.sh [-p|-f] name\n"
            echo "  -h, --help                  Display this help section."
            echo "  name                        Name of the file (without the relevant extension"
            echo "  -p, --path                  Path where the file is (default: ./)"
            echo -e "  -f, --format                Format of the script (default: js)\n"
            echo "Example: ./js2chart.sh -p route/ index"
            shift
        ;;
        *)
            name=$1
            fname=${path}${name}
            npm run flowchart ${fname}.${format} && mv ${fname}.${format}.svg charts/${name}.svg
            echo And available as ${fname}.svg in charts
        ;;
    esac
    shift
done