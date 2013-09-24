Installation unter Linux
========================

System vorbereiten
------------------

Um den GeoBox-Client unter Linux auszuführen, werden die Packete GDAL in der Version 1.9.2 und CouchDB in der Version 1.3 benötigt.
Sollten diese Packete für Ihr System nicht zur Verfügung stehen, müssen Sie die folgenden Repositories Ihrem System hinzufügen:

::

    # GDAL 1.9.2
    sudo add-apt-repository http://ppa.launchpad.net/ubuntugis/ppa/ubuntu
    # CouchDB 1.3.1
    sudo add-apt-repository http://ppa.launchpad.net/nilya/couchdb-1.3/ubuntu
    sudo apt-get update


Abhängigkeiten installieren
---------------------------

::

    sudo apt-get install git virtualenvwrapper libgdal1-dev python-dev g++ python-gdal couchdb zlibc

System einrichten
-----------------

Lese- und Ausführrechte für die CouchDB-Konfigurationsdateien für alle Systembenutzer einrichten:

::

    sudo chmod 755 -R /etc/couchdb

Bibliotheken für die Verwendung in PIL verlinken:

::

    sudo ln -s /usr/lib/x86_64-linux-gnu/libjpeg.so /usr/lib
    sudo ln -s /usr/lib/x86_64-linux-gnu/libz.so /usr/lib


GeoBox-Client aus Quellcode installieren
----------------------------------------

Erstellen einer virtuellen Umgebung:

::

    mkvirtualenv geobox

Um Zugriff auf die im System installierten Packete zu erhalten, müssen die globalen Sitepackages aktiviert werden:

::

    toggleglobalsitepackages

Nun kann der Programmcode des GeoBox-Client ausgecheckt werden:

::

    git clone --recursive git@github.com:omniscale/gbi-client.git

Abschließend müssen die Python-Abhängigkeiten installiert werden:

::

    cd gbi-client
    pip install -r packaging/requirements.txt


GeoBox-Client starten
---------------------

Nach dem Wechsel in das ``app`` Verzeichnis des GeoBox-Client kann diese als Python-Modul ausgeführt werden.

::

    cd app
    python -m geobox.app

Nun ist der GeoBox-Client unter der URL ``http://127.0.0.1:8090`` verfügbar.
Durch den optionalen Parameter ``--open-webbrowser`` wird nach dem Start des GeoBox-Clients ein Browserfenster geöffnet und der GeoBox-Client aufgerufen
