Development
===========

.. _manage_script:

Manage Script
-------------

The application includes a small commandline tool that is helpful when working with web application of the GeoBox-Client. This commandline tool includes running a development server, scripts to set up the database and scripts to create and update the translation files.

::

	# start the testserver
	python manage.py webserver


::

	# create a clear db
	python manage.py init-db



Source
------

GeoBox-Client uses `Git`_ as a source control management tool. If you are new to distributed SCMs or Git we recommend to read `Pro Git <http://git-scm.com/book>`_.

The main (authoritative) repository is hosted at http://github.com/omniscale/gbi-client

To get a copy of the repository call::

  git clone https://github.com/omniscale/gbi-client

.. _`Git`: http://git-scm.com/
