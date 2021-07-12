#!/bin/bash
sed -e 's/<\/head>/\nINSERT_ANALYTICS\n&/' $1 | sed -e '/INSERT_ANALYTICS/{r misc/ganalytics-tracking.html' -e 'd}' > /tmp/index.html
mv /tmp/index.html $1
