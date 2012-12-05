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

import threading

from contextlib import contextmanager

from geobox.model.tasks import Task
from geobox.utils import join_threads

import logging
logging.basicConfig(level=logging.DEBUG)
log = logging.getLogger(__name__)

class ProcessThread(threading.Thread):
    def __init__(self, app_state, task_class_mapping, task_process_mapping):
        threading.Thread.__init__(self)
        self.daemon = True
        self.app_state = app_state
        self.background_threads = {}
        self.task_process_mapping = task_process_mapping
        self.task_classes = task_class_mapping.values()
        self.concurrency = 2

    def run(self):
        self.cleanup_old_tasks()
        while not self.app_state.wait_for_app_shutdown(timeout=2):
            self.check_running_tasks()
            self.check_new_tasks()

        self.stop_running_tasks()

    def shutdown(self):
        pass

    def cleanup_old_tasks(self):
        session = self.app_state.user_db_session()
        query = session.query(Task).with_polymorphic(self.task_classes)
        query = query.filter(Task.is_running == True)
        for task in query:
            task.is_running = False
        session.commit()

    def check_new_tasks(self):
        free_task_slots = self.concurrency - len(self.background_threads)
        if free_task_slots <= 0:
            return

        session = self.app_state.user_db_session()
        query = session.query(Task).with_polymorphic(self.task_classes)
        query = query.filter(Task.is_active == True).filter(Task.is_running == False).filter(Task.is_paused == False)
        query = query.order_by(Task.time_created)
        query = query.limit(free_task_slots)
        for task in query:
            log.debug('starting %s', task)
            self.start_task_process(task)
            task.is_running = True
            session.commit()
        session.close()

    def start_task_process(self, task):
        log.debug('starting new process for %s', task)
        process_class = self.task_process_mapping[task.type]
        p = process_class(self.app_state, task)
        self.background_threads[task.id] = p
        p.start()

    def check_running_tasks(self):
        log.debug('checking tasks')
        session = self.app_state.user_db_session()
        for task_id, t in self.background_threads.items():
            if not t.is_alive():
                log.debug('process %s terminated', t)
                del self.background_threads[task_id]
                task = session.query(Task).with_polymorphic('*').get(task_id)
                task.is_running = False
                session.commit()

        for task_id, t in self.background_threads.items():
            task = session.query(Task).with_polymorphic('*').get(task_id)
            if task.is_paused:
                log.debug('task %s paused', t)
                t.terminate()

    def stop_running_tasks(self):
        log.debug('stopping task')
        for t in self.background_threads.itervalues():
            log.debug('stopping task %s', t)
            t.terminate()

        join_threads(self.background_threads.values(), max_wait_time=5)
        self.background_threads.clear()


class ProcessBase(threading.Thread):
    def __init__(self, app_state, task):
        threading.Thread.__init__(self)
        # store only task id, we don't want to keep task object
        # around in other thread
        self.task_id = task.id
        self.app_state = app_state

    @contextmanager
    def task(self):
        """
        Contextmanager for task object. Changes on object will
        be saved when no exception is raised.
        """
        session = self.app_state.user_db_session()
        query = session.query(Task).with_polymorphic('*')
        task = query.filter(Task.id == self.task_id).one()
        try:
            yield task
        except Exception:
            session.rollback()
            raise
        else:
            session.commit()

    def task_done(self):
        """
        Mark task as done.
        """
        with self.task() as task:
            task.refresh_time_updated()
            task.is_running = False
            task.is_active = False
            task.progress = 1.0
            log.debug('Task %d done' % self.task_id)

    def task_failed(self, e):
        """
        Mark task as failed
        """
        with self.task() as task:
            task.is_running = False
            task.is_active = True
            task.is_paused = True
            task.error = str(e)
            log.error('Task %d failed' % self.task_id)
            log.exception(e)

    def update_task_status(self):
        with self.task() as task:
            task.refresh_time_updated()

    def process(self):
        raise NotImplementedError()

    def run(self):
        self.process()

    def terminate(self):
        pass