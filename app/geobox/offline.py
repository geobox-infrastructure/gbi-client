import sys
import json
import requests
import os
import mimetypes
from flask import render_template
from .appstate import GeoBoxState
from .defaults import GeoBoxConfig
from geobox.web import create_app

def static_files(basedir, attachments=None):
    if attachments is None:
        attachments = {}
    for subdir in ['css', 'js', 'img']:
        for root, _dirs, files in os.walk(os.path.join(basedir, subdir), followlinks=True):
            targetdir = root[len(basedir)+1:]
            for fname in files:
                source = os.path.join(root, fname)
                content_type = mimetypes.guess_type(source)[0]
                target = os.path.join(targetdir, fname)
                attachments[target] = {
                    'content_type': content_type,
                    'data': open(source, 'rb').read().encode('base64')
                }

    return attachments


def push_couchapp(attachments):
    doc = {
        '_attachments': attachments,
        'rewrites': [
            {'from': '/', 'to': '/index.html'},
            {'from': '/*', 'to': '*'},
        ],
    }

    resp = requests.head('http://localhost:5984/default/_design/test_app',
        headers={'Accept': 'application/json'},
    )

    if resp.status_code == 200:
        doc['_rev'] = resp.headers['etag'].strip('"')

    resp = requests.put('http://localhost:5984/default/_design/test_app',
        headers={
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        data=json.dumps(doc),
    )
    if resp.status_code != 201:
        print resp, resp.content

def main(config_filename=None):
    if config_filename:
        config = GeoBoxConfig.from_file(config_filename)
        if not config:
            sys.exit(1)
        app_state = GeoBoxState(config)
    else:
        app_state = GeoBoxState()

    app = create_app(app_state)

    attachments = {}
    with app.test_request_context('/'):
        editorhtml = render_template('editor.html', with_server=False)
        editorhtml = editorhtml.replace('"/static/', '"')
        editorhtml = editorhtml.replace('"/translations.js', '"translations.js')
        attachments['index.html'] = {
            'content_type': 'text/html',
            'data': editorhtml.encode('utf8').encode('base64')
        }

        translations = render_template('js/translation.js')
        attachments['translations.js'] = {
            'content_type': 'application/javascript',
            'data': translations.encode('utf8').encode('base64')
        }

    basedir = os.path.join(os.path.dirname(__file__), 'web', 'static')
    basedir = os.path.abspath(basedir)
    static_files(basedir, attachments)

    push_couchapp(attachments)


if __name__ == '__main__':
    main()