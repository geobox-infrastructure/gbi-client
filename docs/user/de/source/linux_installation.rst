Installation unter Linux
========================

System vorbereiten
------------------

Um GeoBox unter Linux auszuführen, werden die Packete GDAL in der Version 1.9.2 und CouchDB in der Version 1.3 benötigt.
Sollten diese Packete für Ihr System nicht zur verfügung stehen, müssen Sie die folgenden Repositories Ihrem System hinzufügen:

::

    sudo add-apt-repository http://ppa.launchpad.net/ubuntugis/ppa/ubuntu
    sudo add-apt-repository http://ppa.launchpad.net/nilya/couchdb-1.3/ubuntu
    sudo apt-get update


Abhängigkeiten instalieren
--------------------------

::

    sudo apt-get install git virtualenvwrapper libgdal1-dev python-dev g++ python-gdal couchdb zlibc

System einrichten
-----------------

Lese- und Ausführrechte für CouchDB Konfigurationsdatei für alle Systembenutzer einrichten

::

    sudo chmod 755 -R /etc/couchdb

Bibliotheken für die Verwendung in PIL verlinken

::

    sudo ln -s /usr/lib/x86_64-linux-gnu/libjpeg.so /usr/lib
    sudo ln -s /usr/lib/x86_64-linux-gnu/libz.so /usr/lib


GeoBox aus Quellcode installieren
---------------------------------

Erstellen einer virtuellen Umgebung

::

    mkvirtualenv geobox

Um Zugriff auf die im System installierten Packete zu erhalten, müssen die globalen Sitepackages aktiviert werden.

::

    toggleglobalsitepackages

Nun kann der Programmcode der GeoBox ausgecheckt werden.

::

    git clone --recursive git@bitbucket.org:Omniscale/gbi-client.git

Anschließend müssen weitere Python-Abhängigkeiten installiert werden.

::

    cd gbi-client
    pip install -r packaging/requirements.txt


GeoBox starten
--------------

Nach dem Wechsel in das app Verzeichnis der GeoBox kann diese als Python-Modul ausgeführt werden.

::

    cd app
    python -m geobox.app
