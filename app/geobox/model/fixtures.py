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

from geobox import model


def add_fixtures(session):

    source = model.ExternalWMTSSource(name='osm2', title='OpenStreetMap', url='http://a.tile.openstreetmap.org/', format='png', download_level_start=8, download_level_end=18, layer='osm2')
    session.add(source)

    source = model.LocalWMTSSource(name='testLocalWMTSSource', layer='test_layer', format='png', is_base_layer=False, is_overlay=True, download_level_start=3, download_level_end=15)
    session.add(source)

    project = model.ExportProject(
        title='Export Project 1',
        export_format='JPEG',
        export_raster_layers=[
            model.ExportRasterLayer(
                start_level=5, end_level=12, source=model.LocalWMTSSource(
                    name='testLocalWMTSSource3', layer='test_layer3',
                    format='png', is_base_layer=False, is_overlay=True,
                    download_level_start=4, download_level_end=18)
            )
        ],
        export_vector_layers=[
            model.ExportVectorLayer(
                file_name="bar.shp", mapping_name='Lines'
            )
        ],
        tasks=[
            model.RasterExportTask(
                layer=model.LocalWMTSSource(name='testLocalWMTSSource2', layer='test_layer2', format='png', is_base_layer=False, is_overlay=True, download_level_start=6, download_level_end=18),
                export_format='TIFF'
            )
        ]
    )
    session.add(project)

    project = model.ImportProject(
        title='Import Project 1',
        import_raster_layers=[
            model.ImportRasterLayer(
                start_level=6, end_level=10, source=model.ExternalWMTSSource(
                    name='osm', title='OSM',
                    url='http://a.tile.openstreetmap.org/',
                    format='png', download_level_start=4, download_level_end=18,
                    layer='osm'
                )
            )
        ]
    )
    session.add(project)
