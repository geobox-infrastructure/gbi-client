# This file is part of the GBI project.
# Copyright (C) 2012 Omniscale GmbH & Co. KG <http://omniscale.com>
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


"""Convert GeoJSON-like datastructures to tabular datasets"""


from io import BytesIO
import csv
from geobox.ext.odf import opendocument, style, table, text


class Tabular(object):
    """
    Collection dict-items into a list of rows.

    :param headers: expected headers. columns will be sorted
        in this order.
    """
    def __init__(self, headers=None):
        self.headers = headers or []
        self._actual_headers = set()
        self._row_dicts = []

    def add(self, item):
        """
        Add dictionary as a new row.
        """
        self._actual_headers.update(set(item.keys()))
        self._row_dicts.append(item)

    def as_rows(self, with_headers=False):
        """
        Return all rows. The first row contains the
        header, if with_headers is true.

        columns are sorted by Taular.headers first, then any additional
        keys that are found in the added row dicts.
        """
        headers = list(self.headers)
        for h in self._actual_headers:
            if h not in headers:
                headers.append(h)

        rows = []
        if with_headers:
            rows.append(headers)

        for row_dict in self._row_dicts:
            row = []
            for h in headers:
                row.append(row_dict.get(h))
            rows.append(row)
        return rows


def geojson_to_rows(doc, headers=None):
    """
    Collect properties of all GeoJSON Features as list of rows.

    :param doc: GeoJSON dictionary with FeatureCollection or Feature
    :param headers: List of expected property keys. Expected keys appear
        as the first columns in the output rows.
    :returns: list of rows, first row contains header names (property keys).
    """
    tabular = Tabular(headers)
    _add_geojson(tabular, doc)

    return tabular.as_rows(with_headers=True)

def _add_geojson(tabular, doc):
    if doc.get('type') == 'Feature':
        tabular.add(doc.get('properties', {}))
    elif doc.get('type') == 'FeatureCollection':
        for feature in doc.get('features', []):
            _add_geojson(tabular, feature)


odf_bold_style = style.Style(name="bold", family="paragraph")
odf_bold_style.addElement(style.TextProperties(fontweight="bold", fontweightasian="bold", fontweightcomplex="bold"))

def ods_export(rows, with_headers=False, name=None):
    """
    Export rows as OpenDocument spreadsheet.

    :params with_headers: If True, output first row as bold text.
    :params name: Name of the worksheet.
    :returns: ODS file content as string
        (use open(x, 'wb') when writing to a file).
    """
    # ODS export with code from tablib
    # (c) 2011 by Kenneth Reitz, MIT licensed

    wb = opendocument.OpenDocumentSpreadsheet()
    wb.automaticstyles.addElement(odf_bold_style)

    ws = table.Table(name=name or 'Export')
    wb.spreadsheet.addElement(ws)

    for i, row in enumerate(rows):
        row_number = i + 1
        odf_row = table.TableRow(stylename=odf_bold_style, defaultcellstylename='bold')
        for j, col in enumerate(row):
            try:
                col = unicode(col, errors='ignore')
            except TypeError:
                ## col is already unicode
                pass
            ws.addElement(table.TableColumn())

            # bold headers
            if (row_number == 1) and with_headers:
                odf_row.setAttribute('stylename', odf_bold_style)
                ws.addElement(odf_row)
                cell = table.TableCell()
                p = text.P()
                p.addElement(text.Span(text=col, stylename=odf_bold_style))
                cell.addElement(p)
                odf_row.addElement(cell)

            # wrap the rest
            else:
                ws.addElement(odf_row)
                if isinstance(col, (int, float)):
                    cell = table.TableCell(valuetype='float', value=str(col))
                else:
                    cell = table.TableCell()
                cell.addElement(text.P(text=col))
                odf_row.addElement(cell)

    stream = BytesIO()
    wb.save(stream)
    return stream.getvalue()


def csv_export(rows):
    """
    Export rows as CSV file.

    :returns: CSV file content as string
        (use open(x, 'wb') when writing to a file).
    """

    stream = BytesIO()
    writer = csv.writer(stream)

    for row in rows:
        for i, col in enumerate(row):
            if isinstance(col, basestring):
                col = col.encode('latin-1', errors='replace')
                row[i] = col

        writer.writerow(row)

    return stream.getvalue()


if __name__ == '__main__':
    import json
    doc = json.load(open('geobox/test/test.geojson'))
    rows = geojson_to_rows(doc, headers=['Name'])

    with open('/tmp/foo.ods', 'wb') as f:
        f.write(ods_export(rows, with_headers=True))

    with open('/tmp/foo.csv', 'wb') as f:
        f.write(csv_export(rows))
