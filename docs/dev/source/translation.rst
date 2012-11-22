Translation
===========

GBI-Client use `Babel <http://babel.edgewall.org/>`_, an extension to Flask that adds i18n support to the application. The default language of the application is german. The dummy texts are in english. 

Babel uses ``babel.cfg`` as configuration file.

To initalize, update or compile the tranlsation files you have to use the The :ref:`commandline tool <manage_script>` a from the GBI-Client. 

Initialize a new language for example to translate to English use this command::

	python manage.py babel-init-lang en


If strings changed you have to extract and update the translation file. You have to use the following command for this::

	python manage.py babel_refresh


Afterwards some strings might be marked as `fuzzy`. Babel tried to figure out if a translation matched a changed key. If you have entries flaged with `fuzzy`, make sure to check them and remove the `fuzzy` flag before compiling. Finally you have to compile the translation for use:: 

	python manage.py babel_compile

For using another language you have to change `app.local` in the :doc:`configuration file <configuration>`.