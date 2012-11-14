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

from flask import Blueprint, render_template, abort, g, flash
from flaskext.babel import _

from ..helper import redirect_back
from ...model.tasks import Task

tasks_view = Blueprint('tasks', __name__)


@tasks_view.route('/tasks')
def list():
    query = g.db.query(Task).with_polymorphic('*').group_by(Task.project)
    tasks = query.all()
    unprojected_tasks = []
    projects = []

    for task in tasks:
        if task.project_id:
            if task.project not in projects:
                projects.append(task.project)
        else:
            unprojected_tasks.append(task)
    return render_template('tasks/task_list.html', tasks=unprojected_tasks, projects=projects)


@tasks_view.route('/task/<int:id>')
def detail(id):
    query = g.db.query(Task).with_polymorphic('*')
    task = query.get(id)
    if not task:
        abort(404)
    return render_template('tasks/detail.html', task=task)


@tasks_view.route('/task/<int:id>/pause', methods=['POST'])
def pause(id):
    query = g.db.query(Task)
    task = query.get(id)
    if not task:
        abort(404)
    # the task process handles is_active/is_running
    task.is_paused = True
    g.db.commit()
    flash(_('paused task successful'))
    return redirect_back('.list')

@tasks_view.route('/task/<int:id>/start', methods=['POST'])
def start(id):
    query = g.db.query(Task)
    task = query.get(id)
    if not task:
        abort(404)
    task.is_paused = False
    g.db.commit()
    flash(_('start task successful'))
    return redirect_back('.list')

@tasks_view.route('/task/<int:id>/remove', methods=['POST'])
def remove(id):
    task = g.db.query(Task).with_polymorphic('*').filter_by(id = id).first()
    if not task:
        abort(404)
    g.db.delete(task)
    g.db.commit()
    flash(_('delete task successful'))
    return redirect_back('.list')
