#!/bin/bash
set -xe

w=640
h=480

_size=${w}x${h}
convert $1 -resize ${_size}^ -gravity center -extent ${_size} $2
