#!/bin/bash

if [ -z "$2" ]; then
    echo "usage: $0 count url" >&2
    exit 1
fi

COUNT="$1"
URL="$2"
SUM=0

for ((i=0; i < COUNT; i++)); do
    MS=$( (time curl "$URL") 2>&1 | grep real | sed 's/.*,\([0-9]*\)s/\1/')
    echo "$MS ms"
    ((SUM += MS))
done

AVG=$((SUM / COUNT))

echo "Average: $AVG ms"
