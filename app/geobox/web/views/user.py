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

from flask import Blueprint, render_template, request, redirect, url_for, flash, session, current_app
from flaskext.babel import _

from geobox.lib.context import reload_context_document
from geobox.web.forms import LoginForm
from ..helper import get_redirect_target, redirect_back

user_view = Blueprint('user_view', __name__)

@user_view.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm(request.form);
    next = get_redirect_target()

    if next is None:
        next = url_for('main.index')

    if session.get('username', False):
        return redirect(url_for('main.index'))

    if form.validate_on_submit():
        user = request.form['username']
        password = request.form['password']

        if reload_context_document(current_app.config.geobox_state, user, password):
            session['username'] = user
            session.permanent = True
            current_app.config.geobox_state.config.set('user', 'name', user)
            current_app.config.geobox_state.config.write()
        else:
            flash(_('username or password not correct'), 'error')
            return redirect(url_for('user_view.login'))
        return redirect_back('main.index')

    return render_template('login.html', form=form, next=next)


@user_view.route('/logout')
def logout():
    session.pop('username', None)
    session.permanent = False
    return redirect(url_for('user_view.login'))
