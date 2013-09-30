#! /bin/sh
DEST=../app/geobox/web/static/js/gbi-editor
echo "unlinking ${DEST}..."
cd $(dirname $0)
rm -r ${DEST}
