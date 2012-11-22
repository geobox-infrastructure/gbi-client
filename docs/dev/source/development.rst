Development
===========

.. _manage_script:

Manage Script
-------------

The application includes a small commandline tool that are helpful when working with GBI-Client. This commandline tools includes running a development server, scripts to set up the database and scripts to create and update the translation files.

:: 

	# start the testserver
	python manage.py webserver


:: 

	# create a clear db
	python manage.py init-db



Source
------

GBI-Client uses `Git`_ as a source control management tool. If you are new to distributed SCMs or Git we recommend to read `Pro Git <http://git-scm.com/book>`_. 

The main (authoritative) repository is hosted at http://github.com/omniscale/gbi-client

To get a copy of the repository call::

  git clone https://github.com/omniscale/gbi-client


If you want to contribute a patch, please consider `creating a "fork"`__ instead. This makes life easier for all of us.

.. _`Git`: http://git-scm.com/
.. _`fork`: http://help.github.com/fork-a-repo/

__ fork_