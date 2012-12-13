Export von Raster- und Vektordaten
==================================

Sie haben die Möglichkeit Raster- und Vektordaten aus Ihrer GeoBox-Infrastruktur zu exportieren. Der Export unterteilt sich in eine Exportübersicht und einen Exporteditor.


Exportübersicht
---------------

In der Übersicht sind alle gespeicherten Exportvorgänge aufgelistet. Sie können hier einzelne Vorgänge editieren oder direkt entfernen. Wenn Exportvorgänge fertig konfiguriert sind, können diese aus der Übersicht oder aus dem Editermodus gestartet werden. 

Um einen neuen Export zu erstellen wählen Sie "Neuer Export" - dieser öffnet den Exporteditor.

.. attention :: Das Löschen eines Exports kann nicht rückgängig gemacht werden.

Exporteditor
------------

Der Exporteditor unterteilt sich in die Bereiche Raster und Vektor.

Titel
#####

Jedes Rasterimport-Projekt wird durch einen Titel identifiziert. Bitte geben Sie hier eine kurze sprechende Bezeichnung ein.

Rasterlayer
###########

Beim Exportieren der Rasterdaten können Sie zwischen unterschiedlichen Formaten auswählen wie die Daten gespeichert werden sollen. Für jeden Rasterlayer der ausgewählt wird, wird ein entsprechender Export in dem oben ausgewählten Format erzeugt. Es können über den Button "Rasterlayer hinzufügen" mehrere Datenquellen hinzugefügt werden. Für jede Datenquelle wird ein eigener Download erzeugt.

Welcher Bereich der Karten exportiert werden soll kann mittels der Zeichenfunktionen ausgewählt werden. Diese sind im Bereich Import näher beschrieben.

Das passende Format ist abhängig vom Einsatzgebiet de Exportes. Sie haben die Auswahl zwischen folgenden Formaten:

**TIFF**
Speichert ein georeferenziertes Rasterbild im TIFF-Format. Hierzu kann eine Projektion aus der Liste ausgewählt werden. Es ist nur der Export eines Levels möglich.

**JPEG**
Speichert ein georeferenziertes Rasterbild im JPEG-Format. Hierzu kann eine Projektion aus der Liste ausgewählt werden. Es ist nur der Export eines Levels möglich.

**MBTiles**
Die Daten werden in dem Datenbankformat MBTiles abgespeichert. Hierbei kann eine Spanne der Level angegeben werden die exportiert werden sollen. Die Daten werden im Koordinatensystem EPSG:3857 exportiert.

**CouchDB**
Die Daten werden in dem Datenbankformat CouchDB abgespeichert. Hierbei kann eine Spanne der Level angegeben werden die exportiert werden sollen. Die Daten werden fest im Koordinatensystem EPSG:3857 exportiert.

Vektorlayer
###########
In jedem Exportprojekt kann nur ein Vektorlayer erzeugt werden. Hierbei werden alle Elemente vom ausgewählten Typ in einer Shapedatei ausgeliefert.


Speichern & Starten des Imports
###############################

Alle Einstellungen können gespeichert werden und werden anschließend in der Rasterübersicht angezeigt. Neben dem Speichern besteht die Möglichkeit den Vorgang direkt zu Starten. Hierbei werden auch alle Änderungen gespeichert.

Informationen
#############
Die Datenmenge entspricht der ungefähren Menge an Daten die durch den Export auf Ihren PC erzeugt werden. Der freie Speicherplatz gibt den aktuellen Speicherplatz auf Ihrem System. an Achten Sie darauf das genügend Speicher zur Verfügung steht.
