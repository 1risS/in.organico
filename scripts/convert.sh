#!/bin/bash
set -xe

input=$1
output=$2

w=512
h=512

ffmpeg -i $input -vf scale=$w:$h -an $output
