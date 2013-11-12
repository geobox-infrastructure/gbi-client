Importieren von Rasterdaten
---------------------------

Der Rasterimport unterteilt sich in eine Übersicht und einen Editor in dem Importvorgänge angelegt und bearbeitet werden können.

Übersicht
'''''''''

In der Übersicht sind alle gespeicherten Rasterimportvorgänge aufgelistet. Sie können hier einzelne bestehende Vorgänge bearbeiten oder entfernen. Fertig konfigurierte Rasterimportvorgänge können aus der Übersicht oder aus dem Editor gestartet werden.

Um einen neuen Rasterimport zu erstellen wählen Sie "Neuer Import".

.. attention :: Das Löschen eines Imports kann nicht rückgängig gemacht werden.

.. _import_editor:

Editor
''''''

Der Rasterimport-Editor ist eine interaktive Karte, in der Sie den zu importierenden Bereich durch das Zeichnen von Geometrien definieren können. Über das Menü auf der linken Seite können Sie die Rasterdatenquelle auswählen und festlegen, zwischen welchem Start- und Endzoomlevel die Rasterdaten gespeichert werden sollen. Im folgenden werden die möglichen Einstellungen erläutert:


Titel
#####

Jedes Rasterimport-Projekt wird durch einen Titel identifiziert. Bitte geben Sie hier eine kurze sprechende Bezeichnung ein.


Zeichenfunktionen
#################

Mit Hilfe der Zeichenfunktionen können Sie den Bereich definieren der auf Ihrem PC gespeichert werden soll. Neben dem Erstellen von neuen Geometrien können Sie auch bestehende Geometrien bearbeiten oder löschen.

Um die jeweilige Funktionen zu aktivieren oder zu deaktivieren klicken Sie auf das entsprechenden Symbol. Eine aktive Funktion wird hervorgehoben dargestellt.

**Rechteck zeichnen:**
Für das Zeichnen eines Rechteckes klicken Sie auf die Karte und halten Sie die Maustaste dabei gedrückt. Ziehen Sie nun mit weiterhin gedrückter Maustaste ein Kästchen auf. Lösen Sie die Maustaste um das Rechteck fertig zustellen.

**Polygon zeichnen:**
Erstellen Sie durch einfaches Klicken von mehreren Punkten auf der Karte ein Polygon. Durch einen Doppelklick beenden Sie das Zeichnen des Polygons.

**Editier-Modus:**
Um eine Geometrie editieren zu können, müssen Sie diese auswählen. Klicken Sie hierzu, nach dem Aktivieren des Editier-Modus, auf die gewünschte Geometrie. Die Geometrie wird dann als markiert dargestellt. Über die angezeigten Punkte können Sie die Geometrie nun verschieben oder verändern.

**Löschen:**
Gelöscht wird die ausgewählte Geometrie. Wählen Sie diese über den Editier-Modus aus. Ein Wiederherstellen der Geometrie nach dem Löschen ist nicht möglich.

**Alle Geometrien löschen:**
Alle Geometrien werden gelöscht. Ein Wiederherstellen der Geometrie nach dem Löschen ist nicht möglich.

**Geometrie laden:**
Neben dem Zeichnen können Sie Geometrien aus bereits bestehenden Projekten oder aus einem Vektorlayer übernehmen. Wählen Sie hierfür das Projekt oder den Layer aus und klicken Sie auf "Laden".

.. attention:: Ohne Auswahl eines Bereichs ist kein Import möglich.

Rasterdatenquelle
#################

Die Rasterdatenquellen werden von dem GeoBox-Server bereitgestellt. Zudem haben Sie die Möglichkeit eigene Rasterquellen im Bereich Datenquellen zu definieren und im Editor zu verarbeiten. Wählen Sie die Quelle aus welche Sie auf Ihrem PC speichern möchten.

Die ausgewählte Rasterquelle wird in der Kartenanwendung dargestellt. Wenn Sie keine Karten sehen, kann es sein, dass die Quelle nur in einer bestimmten Region und/oder Zoomlevelbereich gültig ist. Das Start- und Endzoomlevel definiert den Bereich in dem die Rasterdaten heruntergeladen werden sollen. Das aktuelle Level der Karte wird Ihnen unterhalb des Navigationselements in der Karte angezeigt.

Kachel aktualisieren
####################

Wenn bereits bestehende Karten auf Ihrem PC gespeichert sind besteht die Möglichkeit durch Aktivieren dieses Feldes die Karten zu aktualisieren.

Speichern & Starten des Imports
###############################

Alle Einstellungen werden gespeichert und der Import wird in der Übersicht angezeigt. Neben dem Speichern besteht die Möglichkeit den Vorgang direkt zu Starten. Auch hierbei werden alle Änderungen gespeichert.

Informationen
#############
Die Datenmenge entspricht der ungefähren Menge an Daten die durch den Import auf Ihren PC gespeichert werden. Der freie Speicherplatz gibt den aktuellen, freien Speicherplatz auf Ihrem System an. Achten Sie darauf das genügend Speicherplatz zur Verfügung steht.

Für einige Dienste kann der Download vom GBI-Server aus beschränkt sein. Diese Dienste haben eine maximale Kachelanzahl, die Sie pro Importvorgang nicht überschreiten dürfen.

