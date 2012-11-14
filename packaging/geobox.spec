# -*- mode: python -*-

import os

def package_data_toc(path, extensions):
    def collect_package_data(path, extensions):
        path = path.rstrip('/\\')
        path = os.path.abspath(path)
        for root, dirs, files in os.walk(path):
            name_root = os.path.relpath(root, os.path.dirname(path))
            for f in files:
                if f.endswith(extensions):
                    toc_entry = os.path.join(name_root, f), os.path.join(root, f), 'DATA'
                    yield toc_entry
    return list(collect_package_data(path, extensions))

a = Analysis(['..\\app\\geobox\\app.py'],
             pathex=['..\\app'],
             hiddenimports=[
                'jinja2.ext',
                'fiona.ogrinit',
                'fiona.rfc3339',
            ],
             hookspath=None)

pyz = PYZ(a.pure)
exe = EXE(pyz,
          a.scripts,
          exclude_binaries=1,
          name=os.path.join('build\\pyi.win32\\geobox', 'geobox.exe'),
          debug=False,
          strip=None,
          upx=True,
          console=False)

package_data = (
      package_data_toc('..\\app\\geobox', ('.html', '.css', '.js', '.png', '.gif', '.mo', '.ini', '.ico'))
    + package_data_toc('data\\pyproj', ('epsg', ))
)

coll = COLLECT(exe,
               a.binaries,
               a.zipfiles,
               a.datas,
               package_data,
               strip=None,
               upx=True,
               name=os.path.join('dist', 'geobox'))
