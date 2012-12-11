import string
import tarfile
import scriptine
import stat
from scriptine import path, log
from scriptine.shell import call

from ConfigParser import ConfigParser

def load_build_conf():
    parser = ConfigParser()
    parser.readfp(open(path(__file__).dirname() + 'build.ini'))
    config = {}
    for key, value in parser.items('build'):
        if value.startswith(('./', '/')) or value[1:3] == ':\\':
            config[key.lower()] = path(value).abspath()
        else:
            config[key.lower()] = value

    # modify version for console builds
    if config['build_with_console'] == 'True':
        config['version'] += '-console'

    return config

config = load_build_conf()
log.debug(config)

def no_repo(members):
    rw_mode = stat.S_IWUSR | stat.S_IRUSR | stat.S_IWGRP | stat.S_IRGRP | stat.S_IROTH
    rw_dir_mode = stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH
    for tar_info in members:
        tar_info.mode = tar_info.mode | rw_mode
        if tar_info.isdir():
            tar_info.mode = tar_info.mode | rw_dir_mode
        name = tar_info.name
        if not '\\.git\\' in name and not '/.git/' in name:
            yield tar_info

def unpack_command():
    log.mark('unpacking packages')
    config['build_dir'].ensure_dir()
    with config['build_dir'].as_working_dir():
        for fname in [config['geocouch_pkg'], config['couchdb_pkg'],
            config['openssl_pkg'], config['gdal_pkg'], config['geos_pkg'],
            config['proj4_pkg'], config['mapproxy_templates_pkg']]:

            log.info('unpacking %s', fname)
            tar = tarfile.open(fname)
            tar.extractall(members=no_repo(tar))
            tar.close()

keep_erl_libs = [
    'common_test-*',
    'compiler-*',
    'couch-*',
    'crypto-*',
    'debugger-*',
    'ejson-*',
    'erlang-oauth*',
    'erts-*',
    'etap*',
    'eunit*',
    'hipe*',
    'ibrowse-*',
    'inets-*',
    'kernel-*',
    'mochiweb-*',
    'os_mon-*',
    'parsetools-*',
    'pman-*',
    'public_key-*',
    'reltool-*',
    'runtime_tools-*',
    'sasl-*',
    'snappy-*',
    'ssl-*',
    'stdlib-*',
    'xmerl-*',
]

def prepare_command():
    prepare_couchdb_command()
    prepare_geocouch_command()

def prepare_couchdb_command():
    log.mark('preparing couchdb')
    log.info('removing unneeded erlang packages')
    with config['couchdb_dir'].as_working_dir():
        dest = path('lib_new')
        dest.ensure_dir()
        lib_dir = path('lib')
        for lib_name in keep_erl_libs:
            lib = lib_dir.dirs(lib_name)
            if lib:
                lib[0].move(dest)
            else:
                log.warn('could not find %s' % lib_name)

        lib_dir.rmtree()
        dest.move(lib_dir)

        for rm in [
            'erts-*/src', 'erts-*/include', 'erts-*/man', 'erts-*/doc',
            'lib/*/src', 'lib/*/examples', 'lib/*/include',
            'share/doc', 'share/man',
        ]:
            for p in path('.').glob(rm):
                p.rmtree(ignore_errors=True)

def prepare_geocouch_command():
    log.mark('preparing geocouch')
    lib_geocouch_dir = config['couchdb_dir'] / 'lib' / 'geocouch'
    lib_geocouch_dir.ensure_dir()
    (config['geocouch_dir'] / 'ebin').copytree(lib_geocouch_dir / 'ebin')

def clean_command():
    config['build_dir'].rmtree()

def build_command():
    build_app_command()
    build_installer_command()

def all_command():
    unpack_command()
    prepare_command()
    build_app_command()
    build_installer_command()

def create_iss_config_command():
    iss_tpl = open(path('installer.iss.tpl')).read()
    template = string.Template(iss_tpl)
    (config['build_dir'] / 'installer.iss').write_text(template.substitute(config))

def build_installer_command():
    create_iss_config_command()
    config['dist_dir'].ensure_dir()
    call([config['inno_dir'] / 'iscc.exe', config['build_dir'] / 'installer.iss'])

def build_app_command():
    """Build GeoBox Python application as .exe"""
    pyinstaller_spec_tpl = open(path('geobox.spec.tpl')).read()
    template = string.Template(pyinstaller_spec_tpl)
    pyinstaller_spec = path('geobox.spec')
    pyinstaller_spec.write_text(template.substitute(config))
    call(['python', config['pyinstaller_dir'] / 'pyinstaller.py', pyinstaller_spec, '-y'])

if __name__ == '__main__':
    scriptine.run()