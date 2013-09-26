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

import os
import sys
import ConfigParser as _ConfigParser

import logging
log = logging.getLogger(__name__)

class ConfigParser(object):
    """
    Utility class for parsing ini-style configurations with
    predefined default values..
    """

    """Default values, set by subclass"""
    defaults = {}

    def __init__(self, parser, fname):
        self.parser = parser
        self.fname = fname

    @classmethod
    def from_file(cls, fname):
        parser = _ConfigParser.ConfigParser()
        try:
            with open(fname) as fp:
                parser.readfp(fp)
        except Exception, ex:
            log.warn('Unable to read configuration: %s', ex)
        return cls(parser, fname)

    def has_option(self, section, name):
        if self.parser.has_option(section, name):
            return True
        return name in self.defaults.get(section, {})

    def get(self, section, name):
        if self.parser.has_option(section, name):
            return self.parser.get(section, name)
        else:
            return self.defaults[section][name]

    def get_bool(self, section, name):
        if self.parser.has_option(section, name):
            return self.parser.getboolean(section, name)
        else:
            return self.defaults[section][name]

    def get_int(self, section, name):
        if self.parser.has_option(section, name):
            return self.parser.getint(section, name)
        else:
            return self.defaults[section][name]

    def set(self, section, name, value):
        if not self.defaults.has_key(section):
            raise _ConfigParser.NoSectionError(section)
        if not self.parser.has_section(section):
            self.parser.add_section(section)
        self.parser.set(section, name, value)

    def write(self):
        self.parser.write(open(self.fname, 'w'))

def path(default=(), dev=(), test=(), frozen=(), cmd=None):
    """
    Get path depending on the runtime.

    When executed from PyInstaller .exe, return first
    existing path from the `frozen` list, then from the `test` list.

    Otherwise it returns the first path from the `dev` list.
    Returns ``None`` if no path was found.
    """
    if getattr(sys, 'frozen', None):
        basedir = sys._MEIPASS
        for p in frozen:
            p = os.path.join(basedir, p)
            if os.path.exists(p):
                return p
        for p in test:
            p = os.path.join(basedir, p)
            if os.path.exists(p):
                return p
        for p in default:
            p = os.path.join(basedir, p)
            if os.path.exists(p):
                return p
    else:
        if cmd:
            for p in dev:
                if os.path.exists(os.path.join(p, cmd)):
                    return p
            for p in default:
                if os.path.exists(os.path.join(p, cmd)):
                    return p
        for p in dev:
            if os.path.exists(p):
                return p
        for p in default:
            if os.path.exists(p):
                return p

def env(key, value, platform=None):
    if platform and not sys.platform.startswith(platform):
        return

    os.environ[key] = value
