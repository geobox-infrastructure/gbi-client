; Licensed under the Apache License, Version 2.0 (the "License"); you may not
; use this file except in compliance with the License. You may obtain a copy of
; the License at
;
;   http://www.apache.org/licenses/LICENSE-2.0
;
; Unless required by applicable law or agreed to in writing, software
; distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
; WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
; License for the specific language governing permissions and limitations under
; the License.

; CouchDB inno installer script

[Setup]
AppID=GeoBox
AppName=GeoBox
AppVerName=GeoBox ${version}
AppPublisher=Omniscale
AppPublisherURL=http://github.org/omniscale/
; TODO license
; LicenseFile=../../LICENSE
DefaultDirName={pf}\GeoBox
DefaultGroupName=GeoBox
OutputBaseFilename=setup-geobox-${version}
OutputDir=${dist_dir}
; admin required for AutoStart
PrivilegesRequired=admin

[Languages]
Name: "de"; MessagesFile: "compiler:Languages\German.isl"

[Files]
Source: "${erl_dir}\*.*"; DestDir: "{app}\couchdb"; Flags: ignoreversion uninsrestartdelete restartreplace
; bin dir
Source: "${erl_dir}\bin\*.*"; DestDir: "{app}\couchdb\bin"; Flags: ignoreversion uninsrestartdelete restartreplace recursesubdirs
; other dirs copied '*.*'
Source: "${erl_dir}\erts-5.8.5\*.*"; DestDir: "{app}\couchdb\erts-5.8.5"; Flags: ignoreversion uninsrestartdelete restartreplace recursesubdirs
Source: "${erl_dir}\lib\*.*"; DestDir: "{app}\couchdb\lib"; Flags: ignoreversion uninsrestartdelete restartreplace recursesubdirs
Source: "${erl_dir}\share\*.*"; DestDir: "{app}\couchdb\share"; Flags: ignoreversion uninsrestartdelete restartreplace recursesubdirs
Source: "${erl_dir}\releases\*.*"; DestDir: "{app}\couchdb\releases"; Flags: ignoreversion uninsrestartdelete restartreplace recursesubdirs
; skip ./usr, ./var

Source: "${gdal_dir}\bin\*.*"; DestDir: "{app}\osgeo\bin"; Flags: ignoreversion uninsrestartdelete restartreplace recursesubdirs
Source: "${gdal_dir}\data\coordinate_axis.csv"; DestDir: "{app}\osgeo\data"; Flags: ignoreversion uninsrestartdelete restartreplace recursesubdirs
Source: "${gdal_dir}\data\ellipsoid.csv"; DestDir: "{app}\osgeo\data"; Flags: ignoreversion uninsrestartdelete restartreplace recursesubdirs
Source: "${gdal_dir}\data\gcs.csv"; DestDir: "{app}\osgeo\data"; Flags: ignoreversion uninsrestartdelete restartreplace recursesubdirs
Source: "${gdal_dir}\data\pcs.csv"; DestDir: "{app}\osgeo\data"; Flags: ignoreversion uninsrestartdelete restartreplace recursesubdirs
Source: "${geos_dir}\*.*"; DestDir: "{app}\osgeo\bin"; Flags: ignoreversion uninsrestartdelete restartreplace recursesubdirs
Source: "${proj4_dir}\data\epsg"; DestDir: "{app}\osgeo\data"; Flags: ignoreversion uninsrestartdelete restartreplace recursesubdirs
Source: "${proj4_dir}\lib\*.*"; DestDir: "{app}\osgeo\bin"; Flags: ignoreversion uninsrestartdelete restartreplace recursesubdirs
Source: "${dist_dir}\geobox\*.*"; DestDir: "{app}\geobox"; Flags: ignoreversion uninsrestartdelete restartreplace recursesubdirs

Source: "${geocouch_dir}\ebin\*.*"; DestDir: "{app}\couchdb\lib\geocouch\ebin"; Flags: ignoreversion uninsrestartdelete restartreplace recursesubdirs
Source: "${geocouch_dir}\etc\*.*"; DestDir: "{app}\couchdb\etc"; Flags: ignoreversion uninsrestartdelete restartreplace recursesubdirs

Source: "${mapproxy_templates_dir}\*.*"; DestDir: "{app}\geobox\mapproxy_templates"; Flags: ignoreversion uninsrestartdelete restartreplace recursesubdirs


; custom stuff...
; ./etc/default.ini is unconditional
Source: "${erl_dir}\etc\couchdb\default.ini"; DestDir: "{app}\couchdb\etc\couchdb"; Flags: ignoreversion uninsrestartdelete restartreplace
; ./etc/local.ini is preserved and should not be updated if it exists
Source: "${erl_dir}\etc\couchdb\local.ini"; DestDir: "{app}\couchdb\etc\couchdb"; Flags: onlyifdoesntexist uninsneveruninstall
; TODO readme
; Source: "README.txt"; DestDir: "{app}\couchdb"; Flags: isreadme

; msvc redists - see comments in configure.ac for notes about these...
; ( deleteafterinstall - not needed - {tmp} auto cleaned????
Source: "${msvc_redist_dir}\${msvc_redist_name}"; DestDir: "{tmp}"; Flags: deleteafterinstall

; These are erlang requirements and not copied by our makefiles.
Source: "${openssl_dir}\bin\ssleay32.dll"; DestDir: "{app}\couchdb\bin"; Flags: ignoreversion uninsrestartdelete restartreplace
Source: "${openssl_dir}\bin\libeay32.dll"; DestDir: "{app}\couchdb\bin"; Flags: ignoreversion uninsrestartdelete restartreplace

; TODO Py_Installer result

[Dirs]
Name: "{app}\couchdb\var\lib\couchdb"; Permissions: authusers-modify
Name: "{app}\couchdb\var\log\couchdb"; Permissions: authusers-modify
Name: "{app}\couchdb\var\run\couchdb"; Permissions: authusers-modify
Name: "{app}\couchdb\etc\couchdb"; Permissions: authusers-modify

[Icons]
Name: "{group}\Start GeoBox"; Filename: "{app}\geobox\geobox.exe"; Parameters: "--open-webbrowser"
Name: "{commonstartup}\GeoBox"; Filename: "{app}\geobox\geobox.exe"

[Run]
Filename: "{tmp}\${msvc_redist_name}"; Parameters: "/q"
; This is erlang's Install.exe which updates erl.ini correctly.
Filename: "{app}\couchdb\Install.exe"; Parameters: "-s"; Flags: runhidden
