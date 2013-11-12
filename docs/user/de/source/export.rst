Export von Rasterdaten
======================

Sie haben die Möglichkeit Rasterdaten aus Ihrem GeoBox-Client zu exportieren. Der Export unterteilt sich in eine Übersicht und einen Editor.


Übersicht
---------

In der Übersicht sind alle gespeicherten Exportvorgänge aufgelistet. Sie können hier einzelne bestehende Vorgänge bearbeiten oder entfernen. Fertig konfigurierte Exportvorgänge können aus der Übersicht oder aus dem Editor gestartet werden.

Um einen neuen Export zu erstellen wählen Sie "Neuer Export".

.. attention :: Das Löschen eines Exports kann nicht rückgängig gemacht werden.

Editor
------

Titel
#####

Jedes Rasterimport-Projekt wird durch einen Titel identifiziert. Bitte geben Sie hier eine kurze sprechende Bezeichnung ein.

Rasterlayer
###########

Beim Exportieren der Rasterdaten können Sie zwischen unterschiedlichen Formaten auswählen. Für jeden Rasterlayer der ausgewählt wird, wird ein entsprechender Export in dem oben ausgewählten Format erzeugt. Es können mehrere Datenquellen hinzugefügt werden. Für jede Datenquelle wird ein eigener Download erzeugt.

Welcher Bereich der Karten exportiert werden soll kann über die Zeichenfunktionen ausgewählt werden. Diese sind im Bereich :ref:`Rasterimport-Editor <import_editor>` näher beschrieben.

Das passende Format ist abhängig vom Einsatzgebiet des Exportes. Sie haben die Auswahl zwischen folgenden Formaten:

**TIFF**
Speichert ein georeferenziertes Rasterbild im TIFF-Format. Hierzu kann eine Projektion aus der Liste ausgewählt werden. Es ist nur der Export eines Levels möglich.

**JPEG**
Speichert ein georeferenziertes Rasterbild im JPEG-Format. Hierzu kann eine Projektion aus der Liste ausgewählt werden. Es ist nur der Export eines Levels möglich.

**MBTiles**
Die Daten werden in dem Datenbankformat MBTiles abgespeichert. Hierbei kann eine Spanne der Level angegeben werden die exportiert werden sollen. Die Daten werden im Koordinatensystem EPSG:3857 exportiert.

**CouchDB**
Die Daten werden in dem Datenbankformat CouchDB abgespeichert. Hierbei kann eine Spanne der Level angegeben werden die exportiert werden sollen. Die Daten werden im Koordinatensystem EPSG:3857 exportiert.

Speichern & Starten des Imports
###############################

Alle Einstellungen werden gespeichert und werden anschließend in der Rasterübersicht angezeigt. Neben dem Speichern besteht die Möglichkeit den Vorgang direkt zu Starten. Auch hierbei werden alle Änderungen gespeichert.

Informationen
#############
Die Datenmenge entspricht der ungefähren Menge an Daten die durch den Export auf Ihren PC erzeugt werden. Der freie Speicherplatz gibt den aktuellen freien Speicherplatz auf Ihrem System an. Achten Sie darauf das genügend Speicher zur Verfügung steht.
