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
import ctypes
import subprocess

import logging
log = logging.getLogger(__name__)

def diskspace_available(path):
    if sys.platform == 'win32':
        free_bytes = ctypes.c_ulonglong(0)
        # GetDiskFreeSpaceExW(lpDirectoryName, lpFreeBytesAvailable (w/ user quota),
            # lpTotalNumberOfBytes, lpTotalNumberOfFreeBytes)
        ctypes.windll.kernel32.GetDiskFreeSpaceExW(ctypes.c_wchar_p(path), ctypes.pointer(free_bytes), None, None)
        return free_bytes.value
    else:
        stats = os.statvfs(path)
        return stats.f_bavail * stats.f_frsize


def diskspace_available_in_mb(path):
    free_bytes = diskspace_available(path)
    return free_bytes / 1024 / 1024

def open_file_explorer(path):
    if sys.platform == 'win32':
        os.startfile(path)
    elif sys.platform == 'darwin':
        subprocess.Popen(['open', path])
    else:
        try:
            subprocess.Popen(['xdg-open', path])
        except OSError:
            log.warn('unable to open file explorer')

if __name__ == '__main__':
    print diskspace_available(sys.argv[1])