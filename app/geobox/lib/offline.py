import sys
import json
import requests
import os
import mimetypes
from flask import render_template
from requests.sessions import InvalidSchema
from requests.models import MissingSchema
from geobox.appstate import GeoBoxState
from geobox.defaults import GeoBoxConfig
from geobox.web import create_app

import logging
log = logging.getLogger(__name__)

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


def push_couchapp(attachments, couchurl, appname):
    try:
        resp = requests.put(couchurl)
    except (MissingSchema, InvalidSchema), ex:
        log.exception(ex)
        return False
    if not resp.status_code in [201, 412]:
        log.warn('faild to create database %s', couchurl)
        return False

    doc = {
        '_attachments': attachments,
        'rewrites': [
            {'from': '/', 'to': '/index.html'},
            {'from': '/*', 'to': '*'},
        ],
    }

    resp = requests.head(couchurl + '/_design/' + appname,
        headers={'Accept': 'application/json'},
    )

    if resp.status_code == 200:
        doc['_rev'] = resp.headers['etag'].strip('"')

    app_url = couchurl + '/_design/' + appname
    resp = requests.put(app_url,
        headers={
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        data=json.dumps(doc),
    )
    if resp.status_code != 201:
        log.warn('failed to push app to %s: %s %s', app_url, resp, resp.content)
        return False

    return True

def create_offline_editor(app, couchurl, dbname, appname):
    log.info('collecting files for couchapp')
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

    root_dir = os.path.split(os.path.abspath(os.path.dirname(__file__)))[0]
    basedir = os.path.join(root_dir, 'web', 'static')
    basedir = os.path.abspath(basedir)

    static_files(basedir, attachments)

    couchurl = couchurl.rstrip('/') + '/' + dbname
    log.info('pushing app to %s/_design/%s', couchurl, appname)
    if push_couchapp(attachments, couchurl, appname):
        log.info('done. see %s/_design/%s/_rewrite', couchurl, appname)
        return True
    else:
        log.warn('failed to create couchapp on %s in database %s with name %s', couchurl, dbname, appname)
        return False

def main(config_filename=None):
    import optparse

    requests_log = logging.getLogger("requests")
    requests_log.setLevel(logging.WARNING)
    logging.basicConfig(level=logging.DEBUG)

    parser = optparse.OptionParser()
    parser.description = 'Deploy the GBI-Client CouchApp to a CouchDB.'
    parser.add_option('--couchurl', help='url of couchdb', default='http://localhost:5984')
    parser.add_option('--dbname', help='database name')
    parser.add_option('--appname', help='name of couchapp, as in /dbname/_design/appname')
    options, args = parser.parse_args()

    if not options.dbname or not options.appname:
        parser.print_help()
        print >>sys.stderr, '\nERROR: --dbname and --appname required'
        sys.exit(1)

    if config_filename:
        config = GeoBoxConfig.from_file(config_filename)
        if not config:
            sys.exit(1)
        app_state = GeoBoxState(config)
    else:
        app_state = GeoBoxState()

    app = create_app(app_state)
    create_offline_editor(app, options.couchurl, options.dbname, options.appname)


if __name__ == '__main__':
    main()
