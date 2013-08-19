import os
import sys
import scriptine
from scriptine.shell import sh

from geobox.web import create_app

def babel_init_lang_command(lang):
    "Initialize new language."
    sh('pybabel init -i geobox/web/translations/messages.pot -d geobox/web/translations -l %s' % (lang,))

def babel_refresh_command():
    "Extract messages and update translation files."

    # get directory of all extension that also use translations
    import wtforms
    wtforms_dir = os.path.dirname(wtforms.__file__)
    extensions = ' '.join([wtforms_dir])

    sh('pybabel extract -F babel.cfg -k lazy_gettext -k _l -o geobox/web/translations/messages.pot geobox/web geobox/model geobox/lib ' + extensions)
    sh('pybabel update -i geobox/web/translations/messages.pot -d geobox/web/translations')

def babel_compile_command():
    "Compile translations."
    sh('pybabel compile -d geobox/web/translations')


def fixtures_command():
    from geobox.appstate import GeoBoxState
    from geobox.model.fixtures import add_fixtures
    app_state = GeoBoxState.initialize()
    if os.path.exists(app_state.db_filename):
        os.remove(app_state.db_filename)

    app_state = GeoBoxState.initialize()
    session = app_state.user_db_session()


    add_fixtures(session)
    session.commit()

def init_db_command():
    from geobox.appstate import GeoBoxState
    from geobox.model.fixtures import add_fixtures
    app_state = GeoBoxState.initialize()
    if os.path.exists(app_state.db_filename):
        os.remove(app_state.db_filename)

    app_state = GeoBoxState.initialize()
    session = app_state.user_db_session()

    session.commit()

def webserver_command(config='./geobox.ini'):
    from geobox.appstate import GeoBoxState
    from geobox.defaults import GeoBoxConfig

    config = GeoBoxConfig.from_file(config)
    if not config:
        sys.exit(1)

    app_state = GeoBoxState(config)
    app = create_app(app_state)

    # scriptine removed sub-command from argv,
    # but Flask reloader needs complete sys.argv
    sys.argv[1:1] = ['webserver']
    app.run(port=config.get('web', 'port'), threaded=True)

runserver_command = webserver_command

if __name__ == '__main__':
    scriptine.run()