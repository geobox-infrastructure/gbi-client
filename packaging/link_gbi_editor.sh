#! /bin/sh
DEST=../app/geobox/web/static/js/gbi-editor
echo "(re)-linking ${DEST} to gbi-editor submodule..."
cd $(dirname $0)
git checkout -- ${DEST}
