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

import win32gui
import win32con
import win32gui_struct

import threading
import timer

import webbrowser

from geobox.config import path

import logging
log = logging.getLogger(__name__)

EXIT_COMMAND = 1000
OPEN_COMMAND = 1001

class TrayIcon(object):

    def __init__(self, app_state, target_url='', icon_path='icon.ico'):
        self.app_state = app_state
        self.target_url = target_url
        self.message_id = win32con.WM_USER+20
        self.window_id = self.create_window()
        # load the icon

        self.icon = win32gui.LoadImage(
            None,
            icon_path,
            win32con.IMAGE_ICON,
            0,
            0,
            win32con.LR_LOADFROMFILE
        )
        # set tray icon properties
        self.notify_id = (
            self.window_id,
            0,
            win32gui.NIF_ICON | win32gui.NIF_MESSAGE | win32gui.NIF_TIP,
            self.message_id,
            self.icon,
            # NOTE: This is a comment about `GeoBox`
            self.app_state.gettext('GeoBox'),
        )
        win32gui.Shell_NotifyIcon(
            win32gui.NIM_ADD,
            self.notify_id
        )
        log.debug('Tray icon attached')
        self.timer_id = timer.set_timer(1000, self.check_for_shutdown)

    def check_for_shutdown(self, id, time):
        if self.app_state.wait_for_app_shutdown(None):
            timer.kill_timer(self.timer_id)
            self.destroy(self.window_id, None, None, None)

    def create_window(self, window_name='Dummy Window'):
        message_map = {
            win32gui.RegisterWindowMessage("TaskbarCreated"): self.restart,
            win32con.WM_DESTROY: self.destroy,
            win32con.WM_COMMAND: self.command,
            self.message_id : self.notify,
        }

        # Register the Window class.
        window_class = win32gui.WNDCLASS()
        window_class.lpszClassName = 'geobox_client_tray_icon'
        window_class.style = win32con.CS_VREDRAW | win32con.CS_HREDRAW
        window_class.hCursor = win32gui.LoadCursor(
            0,
            win32con.IDC_ARROW
        )
        window_class.hbrBackground = win32con.COLOR_WINDOW
        window_class.lpfnWndProc = message_map
        class_atom = win32gui.RegisterClass(window_class)
        style = win32con.WS_OVERLAPPED | win32con.WS_SYSMENU

        window_id = win32gui.CreateWindow(
            class_atom,
            window_name,
            style,
            0, 0,
            0, 0,
            0,
            0,
            None,
            None
        )
        log.debug('Dummy window created')
        win32gui.UpdateWindow(window_id)
        return window_id


    def create_menu(self):
        menu = win32gui.CreatePopupMenu()
        item, extras = win32gui_struct.PackMENUITEMINFO(
            text = self.app_state.gettext('Close'),
            hbmpItem=win32con.HBMMENU_MBAR_CLOSE,
            wID=EXIT_COMMAND
        )
        win32gui.InsertMenuItem(
            menu,
            0,
            1,
            item
        )
        win32gui.SetMenuDefaultItem(
            menu,
            EXIT_COMMAND,
            0
        )
        item, extras = win32gui_struct.PackMENUITEMINFO(
            text = self.app_state.gettext('Open'),
            hbmpChecked = None,
            hbmpUnchecked = None,
            wID=OPEN_COMMAND
            )
        win32gui.InsertMenuItem(
            menu,
            0,
            1,
            item
        )

        win32gui.SetForegroundWindow(self.window_id)
        x, y = win32gui.GetCursorPos()
        win32gui.TrackPopupMenu(
            menu,
            win32con.TPM_LEFTALIGN,
            x, y,
            0,
            self.window_id,
            None
        )
        win32gui.PostMessage(
            self.window_id,
            win32con.WM_NULL,
            0,
            0
        )

    #
    def restart(self, window_id, msg, wparam, lparam):
        self.notify_id = (
            self.window_id,
            0,
            win32gui.NIF_ICON | win32gui.NIF_MESSAGE | win32gui.NIF_TIP,
            self.message_id,
            self.icon,
            self.icon_hover_text
        )
        win32gui.Shell_NotifyIcon(
            win32gui.NIM_ADD,
            self.notify_id
        )

    # close application
    def destroy(self, window_id, msg, wparam, lparam):
        nid = (self.window_id, 0)
        win32gui.Shell_NotifyIcon(win32gui.NIM_DELETE, nid) # delete the icon
        self.app_state.shutdown_app()
        log.debug('Closing application')
        win32gui.PostQuitMessage(0) # close the app

    # process selected menu action
    def command(self, window_id, msg, wparam, lparam):
        id = win32gui.LOWORD(wparam)
        if id == EXIT_COMMAND:
            self.destroy(window_id, msg, wparam, lparam)
        if id == OPEN_COMMAND:
            webbrowser.open(self.target_url)

    # notify about user action
    def notify(self, window_id, msg, wparam, lparam):
        if lparam==win32con.WM_RBUTTONUP: # on rightclick
            self.create_menu()

class TrayIconThread(threading.Thread):
    def __init__(self, app_state, host, port):
        threading.Thread.__init__(self)
        self.app_state = app_state
        self.host = host
        self.port = port

    def run(self):
        self.tray_icon = TrayIcon(
            self.app_state,
            'http://%s:%d' % (self.host, self.port),
            path(['geobox/lib/icon.ico'])
        )
        win32gui.PumpMessages()
        while not self.app_state.wait_for_app_shutdown(timeout=60):
            pass

    def shutdown(self):
        pass