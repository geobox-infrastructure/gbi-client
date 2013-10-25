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
    Hier können Sie Ihre erstellten Vektorkarten ein- und ausschalten. Wenn Sie unterschiedliche Ebenen haben, können Sie diese über die Pfeil-Symbol die Darstellungsreihenfolge ändern.
    Durch Anklicken des Ebenennamens können Sie den gewünschten Layer aktivieren. Aktivierte Layer können über die Register `Aussehen`, `Editieren`, `Filtern` und `Thematische Karte` weiter bearbeitet werden. Das Register `Speichern & Laden` bezieht sich immer auf den jeweils aktiven Layer. Der Titel des aktiven Layers wird Ihnen oben rechts in der Karte angezeigt.

    Durch das Lupen-Symbol können Sie die Karte auf die Ausdehnung der Geometrien des Layers zoomen.

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

Mit der Selektieren-Funktion können Sie eine Geometrie auswählen. Durch gedrückt halten der Shift-Taste können mehrere Geometrien ausgewählt werden.

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

Mit der Zerschneiden-Funktion können Sie eine selektierte Geometrie an einer Linie teilen. Nach Auswahl der Zerschneiden-Funktion können Sie in der Karte die Schneidelinie zeichnen. Zum Durchführen muss diese Aktion mit einem Doppelklick in der Karte bestätigt werden.

Zusammenfügen
"""""""""""""

Wenn Sie mehrere sich sich berührende oder überlappende Geometrien selektiert haben, können Sie diese über die Zusammenfügen-Funktion zu einer Geometrie zusammenfassen.


Eigenschaften
'''''''''''''

Zu jeder selektierten Geometrie können Sie Eigenschaften in Form von Schlüssel-Werte-Paaren speichern. Dieses kann z.B. Schlüssel: Jahr und Wert: 2013 sein. Alle im aktiven Layer vorhandenen Schlüssel werden zu jeder Geometrie angezeigt.

Neben den Eigenschaften findet sich ein Button mit Auge-Symbol. Dieser Button dient dazu, alle Geometrien in der Karte mit dem entsprechenden Schlüssel-Wert-Paar zu beschriften. Diese Beschriftung ist nicht dauerhaft und wird nicht gespeichert.

Über das X-Symbol löschen Sie das Schlüssel-Wert-Paar von der selektierten Geometrie. Das Eingabefeld für dieses Schlüssel-Wert-Paar verschwindet, sobald keine der Geometrien des Layers dieses Schlüssel-Wert-Paar mehr als Eigenschaft besitzt.

Weiterhin kann unter diesem Register dem Layer ein JSON Schema zugewiesen werden. Nach laden des JSON Schema wird automatisch eine Überprüfung der Eigenschaften der Geometrien gestartet. Alle Geometrien mit nicht gültigen Eigenschaften lassen sich bearbeiten und entsprechend ändern.

Sollte im JSON Schema angegeben sein, dass nur im Schema definierte Eigenschaften gültig sind, werden alle Eigenschaften einer Geometrie, die nicht im JSON Schema definiert sind gesondert aufgeführt und Sie werden zum Löschen dieser aufgefordert.

Ist einem Layer ein JSON Schema zugewiesen, wird die URL, von der Sie das JSON Schema hinzugefügt haben, angezeigt. Daneben befinden sich Button um das JSON Schema von der URL zu aktualisieren oder das JSON Schema aus dem Layer zu löschen.


Filter
------

Hier können Sie Geometrien der aktivierten Vektorebene, abhängig von Eigenschaft und Wert, auswählen. Die Geometrien, auf die Ihr Filter passt werden ausgewählt. Die Geometrien bleiben solange ausgewählt, bis Sie die Auswahl im `Editieren` Register aufheben.


Messen
------

Messen Sie Linien oder Flächen in der Karte. Zudem besteht die Möglichkeit eine Koordinate zu bestimmen.


Koordinate
''''''''''

Durch Klicken in der Karten können Sie einen Punkt setzen, zu dem die Koordinate bestimmt wird. Über die Auswahlliste können Sie die Projektion der Koordinate auswählen.


Linien
''''''

Durch Klicken in der Karte können Sie einen Linienzug zeichnen. Die Gesamtlänge wird als Messergebnis in Metern oder Kilometern dargestellt.
Den Messvorgang können Sie mit Doppelklick in der Karte beenden.


Flächen
'''''''

Durch Klicken in der Karte können Sie ein Polygon zeichnen. Die Gesamtfläche wird als Messergebnis in Quadratmetern oder Quadratkilometern dargestellt.
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

In der Legende der thematischen Karte werden `Farbe`, `Wert` und `Fläche` angezeigt. Zusätzlich besteht die Möglichkeit über den Listenbutton zu einer Übersichtsliste zu gelangen. Hier werden alle Geometrien aufgelistet die dem Wert der Legende entsprechen.

Ist die thematische Karte im Modus `Exakte Werte`, können Sie den Schnell-Editormodus verwenden. Dieser kann aktiviert werden in dem Sie auf die Farbe in der Legende Klicken. Anschließend haben Sie die Möglichkeit eine Geometrie anzuklicken um dieser den Wert – entsprechenden der Farbe – zuzuweisen.

Liste
'''''

In dem Register Liste können Sie die Eigenschaften aller Geometrien des aktiven Layers betrachten. Ihnen stehen zwei Arten von Listen zur Verfügung:

Kurze Liste
  In dieser Liste werden nur Eigenschaften angezeigt, die Sie vorher in den Einstellungen festgelegt haben.

Komplette Liste
  In dieser Liste werden alle Eigenschaften angezeigt.

Am Ende jeder Zeile befindet sich ein Button, mit dem Sie die zum dem Listeneintrag gehörige Geometrie in der Karte zentrieren können.

Die Reihenfolge der Eigenschaften kann unter Einstellungen definiert werden.

Sie können die Listen als `ODT` oder `CSV` herunterladen.

Einstellungen
'''''''''''''

In diesem Register können Sie Einstellungen für die thematische Karte für Attributlisten und Popups vornehmen.
Die Einstellungen können für jeden Layer gespeichert werden.

Karte
"""""

Hier können Sie eine Eigenschaft des aktiven Layers wählen, für die Sie eine thematische Darstellung erzeugen möchten. Sie können beliebig viele Werten eine  Farbe zuweisen. Bei den ersten 10 Werten werden Ihnen Farben vom System vorgeschlagen. Diese können von Ihnen verändert werden.

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

In diesem Register können Sie bis zu 10 Eigenschaften des aktiven Layer auswählen die in der Kurzliste angezeigt werden sollen.

Außerdem können Sie bis zu 10 Eigenschaften auswählen, die in einem Popup beim Überfahren der Maus über eine Geometrie in der Karte angezeigt werden.

Sie können die Reihenfolge der Eigenschaften verändern, indem Sie über einen Eintrag in der Liste die linke Maustaste gedrückt halten und den Eintrag an die von Ihnen gewünschte Stelle verschieben.
In der Kurzliste, der kompletten Liste und in den Popups werden die Eigenschaften in der Reihenfolge dargestellt, wie sie in der Liste definiert wurde.

Speichern & Laden
-----------------

Dieses Register wird grün hinterlegt, sobald speicherbare Änderungen vorliegen.

Speichern / Speichern unter
'''''''''''''''''''''''''''

Mittels `Speichern` können Sie vorgenommenen Änderungen am aktiven Layer speichern. Sollen die Änderungen verworfen werden wählen Sie `Abbruch`.

Mit `Speichern unter` können Sie den aktiven Layer in einem neuen Layer speichern. Geben Sie hier den gewünschten Namen ein.

Export
''''''

Über den Button `Export` gelangen Sie zu einem Dialog, in dem Sie den aktuellen Layer als Shapedatei oder GeoJSON exportieren können.

Hierzu geben Sie den `Dateinamen` an, der automatisch beim Exportvorgang mit der richtigen Endung ergänzt wird. Weiterhin können Sie das `Koordinatensystem` für den Export angeben.

Unter `Speicherort` stehen Ihnen zwei Möglichkeiten zur Verfügung:

Dateisystem
  Der Export wird als Datei in das Export-Verzeichnis des GeoBox-Client abgelegt. Über den Menüpunkt `Downloads` im Hauptmenü können Sie die exportierten Daten herunterladen.

Upload-Box
  Der Export wird direkt in Ihrer Upload-Box abgelegt.

Als weiter Exporttyp steht Ihnen ein OData-Feed zur Verfügung. Wenn Sie diesen Typ auswählen, wird Ihnen die benötigten URL angezeigt. Diese könne sie dann z.b. in Microsoft Excel 2013 als OData-Feed einbinden.

Speicherpunkte
''''''''''''''

Unter der Überschrift `Speicherpunkte` können Sie für den Stand des aktiven Layers einen Speicherpunkt erstellen und erstellte Speicherpunkte wiederherstellen.