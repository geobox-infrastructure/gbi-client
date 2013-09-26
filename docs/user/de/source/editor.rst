Editor
======

Im Editor können Vektorlayer neu erstellt, bearbeitet und gelöscht werden.

Der Editor unterteilt sich in die Kartenansicht und dem Kontrollbereich. Der Kontrollbereich stellt über Register unterschiedliche Funktionen bereit.

Kartenebenen
------------

Hier können Sie auswählen welche Kartenebenen dargestellt werden.

Hintergundkarte:
    Hier können Sie die Hintergrundkarte der Anwendung ein- und ausschalten.

Lokale Rasterkarte:
    Hier können Sie bereits heruntergeladene Rasterkarten ein- und ausschalten. Wenn Sie unterschiedliche Karten heruntergeladen haben, können Sie über die Pfeil-Symbol die Darstellungsreihenfolge ändern.


Vektorkarte:
    Hier können Sie Ihre erstellten Vektorkarten ein- und ausschalten. Wenn Sie unterschiedliche Vektorebenen haben, können Sie über die Pfeil-Symbol die Darstellungsreihenfolge ändern.
    Durch klicken auf den Ebenennamen können Sie diesen aktivieren. Aktivierte Layer können über die Register `Aussehen`, `Editieren`, `Filtern` und `Thematische Karte` weiter bearbeitet werden. Ausserdem bezieht sich das Register `Speichern & Laden` auf den jeweils aktiven Layer.

    Durch das Lupen-Symbol können Sie die Karte auf die Geometrien des Layers zoomen.

Aussehen
--------

Hier können Sie das Aussehen der aktivierten Vektorebene verändern. Damit die Änderungen dauerhaft übernommen werden, müssen Sie hierfür die Änderungen unter dem Register `Speichern & Laden` speichern.


Editieren
---------

Hier können Sie Vektorgeometrien zur aktivierten Vektorebene hinzufügen und bestehende Geometrien verändern und löschen.


Bearbeitungsmöglichkeiten
'''''''''''''''''''''''''

Zeichnen
""""""""

Wählen Sie das entsprechende Symbol um Punkte, Linien oder Polygone zu zeichnen. Zeichenvorgänge von Linien und Polygon können mit einem Doppelklick in der Karte beendet werden.

Selektieren
"""""""""""

Mit der Selektieren-Funktion können Sie eine Geometrie auswählen. Durch gedrückthalten der Shift-Taste können Sie mehrere Geometrien auswählen.

Bearbeiten
""""""""""

Über die Bearbeiten-Funktion können Sie einzelne Geometrien bearbeiten, in dem Sie die Eckpunkte der Geometrie verschieben.

Löschen
"""""""

Entfernen Sie die selektierten Geometrien aus der Vektorebene.

Kopieren
""""""""

Wenn Sie Geometrien aus anderen Vektorebenen selektiert haben, können Sie mit der Kopieren-Funktion die Geometrien in die aktivierte Vektorebenen kopieren.


Zerschneiden
""""""""""""

Mit der Zerschneiden-Funktion können Sie eine selektierte Geometrie an einer Linie teilen. Nach Auswahl der Zerschneiden-Funktion können Sie in der Karte die Schneidelinie zeichnen. Zum Durchführen müssen Sie ein Doppelklick in der Karte durchführen.

Vereinen
""""""""

Wenn Sie mehrere sich sich berührende oder überlappende Geometrien selektiert haben, können Sie diese über die Vereinen-Funktion zu einer Geometrie zusammenfassen.


Eigenschaften
'''''''''''''

Zu jeder selektierten Geometrie können Sie Eigenschaften in Form von Schlüssel-Werte-Paaren speichern. Dieses kann z.B. Schlüssel: Jahr und Wert: 2013 sein. Alle im aktiven Layer vorhandenen Schlüssel werden zu jeder Geometrie angezeigt.

Neben den Eigenschaften findet sich ein Button mit Auge-Symbol. Dieser Button dient dazu, alle Geometrien in der Karte mit dem entsprechenden Schlüssel-Wert-Paar zu beschriften. Diese Beschriftung ist nicht dauerhaft und kann auch nicht gespeichert werden.

Der Button mit dem X-Symbol löscht das Schlüssel-Wert-Paar von jeder selektierten Geometrie. Das Eingabefeld für dieses Schlüssel-Wert-Paar verschwindet, sobald keine der Geometrien des Layers dieses Schlüssel-Wert-Paar mehr als Eigenschaft besitzt.

Weiterhin kann unter diesem Register dem Layer ein JSON Schema zugewiesen werden. Nach laden des JSON Schema wird automatisch eine Überprüfung der Eigenschaften der Geometrien gestartet. Alle Geometrien mit nicht gültigen Eigenschaften lassen sich danach durchgehen und deren Eigenschaften entsprechend ändern.

Sollte im JSON Schema angegeben sein, dass nur im Schema definierte Eigenschaften gültig sind, werden alle Eigenschaften einer Geometrie, die nicht im JSON Schema definiert sind, gesondert aufgeführt und Sie zum löschen dieser aufgefordert.

Ist einem Layer ein JSON Schema zugewiesen, wird die URL, von der Sie das JSON Schema hinzugefügt haben, angezeigt. Daneben befinden sich Button um das JSON Schema von der URL zu aktualisieren oder das JSON Schema aus dem Layer zu löschen.


Filter
------

Hier können Sie Geometrien der aktivierten Vektorebene, abhängig von Eigenschaft und Wert, auswählen.


Messen
------

Hier können Sie in der Karte messen.


Koordinate
''''''''''

Durch klicken in der Karten können Sie einen Punkt setzen, zu dem die Koordinate dargestellt wird. Über die Auswahlliste können Sie die Projektion in der die Koordinate dargestellt werden soll auswählen.


Linien
''''''

Durch klicken in der Karte können Sie einen Linienzug zeichnen. Die Gesamtlänge wird als Messergebnis in Metern oder Kilometern dargestellt.
Den Messvorgang können Sie mit Doppelklick in der Karte beenden.


Flächen
'''''''

Durch klicken in der Karte können Sie einen Polygon zeichnen. Die Gesamtfläche wird als Messergebnis in Quadratmetern oder Quadratkilometern dargestellt.
Den Messvorgang können Sie mit Doppelklick in der Karte beenden.

Suche
-----

Wenn ein oder mehrere Suchdienste von der GeoBox-Infrastruktur bereitgestellt werden, können Sie hier den Dienst, in dem Sie suchen möchten auswählen. Die Eigenschaft, nachdem Sie im Dienst suchen können, wird in Klammern hinter dem Namen Suchdienst angezeigt.

Im Feld `Suchanfrage` können Sie Werte für die Eigenschaft angeben, nach denen Sie suchen möchten. Wenn Sie nach mehr als einem Wert suchen möchten, sind die einzelnen Werte Zeilenweise anzugeben. Falls Sie nur den Anfang Ihres Suchbegriffes kennen, können Sie ihn durch ein * ergänzen. So finden Sie mit der Suchanfrage `Grün*` sowohl `Grünfläche` als auch `Grünland`.

Geometrien, auf deren Eigenschaften die Suchanfrage zutrifft, werden in der Karte dargestellt und können über den Register `Editieren`_ in den aktiven Layer kopiert werden.

Thematische Karte
-----------------

Die `Thematische Karte` bietet Ihnen die Möglichkeit, Geometrien zu klassifizieren, Eigenschaften als Listen anzuzeigen und Geometrien Eigenschaftswerte zuzuweisen.

Nach Aktivieren der `Thematischen Karte` erscheinen die Register `Legende`, `Liste` und `Einstellungen`.

Die `Thematische Karte` ist beim Aufruf der Seite deaktiviert, unabhängig davon, ob der aktive Layer thematische Karteneinstellungen besitzt oder nicht. Sobald das Register `Thematische Karte` verlassen wird, wird die thematische Karte deaktiviert.

Legende
'''''''

Hier sehen Sie die Legende der thematischen Karte. Es werden `Farbe`, `Wert` und `Fläche` angezeigt, sowie ein Button, durch dessen Betätigung Sie zu einer Liste alle Geometrien gelangen, deren Werte für die thematisierte Eigenschaft denen des Legendeneintrags entsprechen.

Ist die thematische Karte im `Exakte Werte`-Modus, können Sie auf die Farbe und anschließend auf eine Geometrie klicken, der Sie den der Farbe entsprechenden Wert für die thematisierte Eigenschaft zuweisen wollen.

Liste
'''''

In dem Register Liste können Sie die Eigenschaften aller Geometrien des aktiven Layers betrachten. Ihnen stehen zwei Arten von Listen zur verfügung:

Kurze Liste
  In dieser Liste werden nur Eigenschaften angezeigt, die Sie vorher in den Einstellungen festgelegt haben.

Komplette Liste
  In dieser Liste werden alle Eigenschaften angezeigt.

Am Ende jeder Zeile befindet sich ein Button, mit dem Sie die zum dem Listeneintrag gehörige Geometrie in der Karte zentrieren können.

Die Reihenfolge der Eigenschaften kann unter Einstellungen gefiniert werden.

Sie können die Listen als `ODT` oder `CSV` herunterladen.

Einstellungen
'''''''''''''

In diesem Register können Sie Einstellungen für die thematische Karte, für Attributlisten und Popups vornehmen.
Die Einstellungen können für jeden Layer gespeichert werden.

Karte
"""""

Hier können Sie eine Eigenschaft des aktiven Layers wählen, für die Sie eine thematische Darstellung erzeugen möchten. Sie können beliebig vielen Werten der gewählten Eigenschaft Farben zuweisen. Bei den ersten 10 Werten werden Ihnen Farben vorgeschlagen, die Sie aber auch ändern können.

Für die Angabe der Werte stehen Ihnen zwei Arten zur Auswahl.

Exakte Werte
  In einer Auswahlliste werden Ihnen alle Werte der ausgewählten Eigenschaft angezeigt, aus denen Sie Eigenschaften auswählen können, die dann in der entsprechenden Farbe dargestellt werden.

Wertebereich
  Sie können einen Minimum- und/oder Maximum-Wert definieren. Wenn Sie sowohl Minimum- als auch Maximum-Wert angeben, werden alle Geometrien, deren Werte für die ausgewählte Eigenschaft größer oder gleich dem Minimum-Wert und kleiner als der Maximum-Wert, sind in der entsprechenden Farbe dargestellt.
  Wird nur ein Minimum-Wert angegeben, werden alle Geometrien, deren Werte für die ausgewählte Eigenschaft größer oder gleich dem Minimum-Wert sind, in der entsprechenden Farbe dargestellt.
  Wird nur ein Maximum-Wert angegeben, werden alle Geometrien, deren Werte für die ausgewählte Eigenschaft kleiner als der Maximum-Wert sind, in der entsprechenden Farbe dargestellt.

Über den Button `Auswahl hinzufügen` können Sie weitere Werte angeben.

Liste
"""""

In diesem Register können Sie bis zu 10 Eigenschaften des aktiven Layer auswählen, die Sie in der Kurzliste angezeigt haben möchten.

Ausserdem können Sie bis zu 10 Eigenschaften auswählen, die in einem Popup beim Überfahren der Maus über eine Geometrie in der Karte angezeigt werden.

Sie können die Reihenfolge der Eigenschaften verändern, indem Sie über einen Eintrag in der Liste die linke Maustaste gedrückt halten und den Eintrag an die von Ihnen gewünschte Stelle verschieben.
In der Kurzliste, der kompletten Liste und in den Popups werden die Eigenschaften in der Reihenfolge dargestellt, wie sie in der Liste definiert wurde.

Speichern & Laden
-----------------

Dieses Register wird grün hinterlegt, sobald Sie speicherbare Änderungen vorgenommen haben.

Speichern / Speichern unter
'''''''''''''''''''''''''''

Unter der Überschrift `Speichern` befinden sich die Button `Speichern`, mit dem Sie Ihre vorgenommenen Änderungen am aktiven Layer speichern, und `Abbruch`, mit dem Sie Ihre vorgenommenen Änderungen am aktiven Layer verwerfen.

Unter der Überschrift `Speichern unter` können Sie den aktuellen Stand des aktuellen Layers in einem neuen Layer speichern.

Export
''''''

Über den Button `Export` gelangen Sie zu einem Dialog, in dem Sie den aktuellen Stand des aktuellen Layers als Shapedatei oder GeoJSON exportieren können.

Hierzu geben Sie den `Dateinamen` an, der automatisch beim Exportvorgang mit der richtigen Endung ergänzt wird. Weiterhin können Sie das `Koordinatensystem` für den Export angeben.

Unter `Speicherort` stehen Ihnen zwei Möglichkeiten zur Verfügung:

Dateisystem
  Der Export wird als Datei in das Export-Verzeichnis des GeoBox-Client abgelegt. Über den Menüpunkt `Downloads` im Hauptmenü können Sie die exportierten Daten herunterladen.

Upload-Box
  Der Export wird direkt in Ihrer Upload-Box abgelegt.

Als weiter Exporttyp steht Ihnen OData zur Verfügung. Wenn Sie diesen Typ auswählen, wird Ihnen eine URL angezeigt, die Sie kopieren und in einem Programm, dass OData lesen kann (z.B. Microsoft Excel 2013), als Quelle angeben können.

Speicherpunkte
''''''''''''''

Unter der Überschrift `Speicherpunkte` können Sie für den aktuellen Stand des aktuellen Layers einen Speicherpunkt erstellen und erstellte Speicherpunkte wiederherstellen.