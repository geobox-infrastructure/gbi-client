Translation
===========

GeoBox-Client uses `Babel <http://babel.edgewall.org/>`_ for i18n support. The default language of the application is German.

Babel uses ``babel.cfg`` as configuration file.

To initalize, update or compile the tranlsation files you have to use the :ref:`manage tool <manage_script>` from the GeoBox-Client.

To initialize a new language use this command, where ``en`` is the language code::

	python manage.py babel-init-lang en


If strings changed you have to extract and update the translation file with::

	python manage.py babel_refresh


Afterwards some strings might be marked as `fuzzy`. Babel tried to figure out if a translation matched a changed key. If you have entries flaged with `fuzzy`, make sure to check them and remove the `fuzzy` flag before compiling. Finally you have to compile the translation for use::

	python manage.py babel_compile

For using another language you have to change `app.local` in the :doc:`configuration file <configuration>`.