/**
 * Tencent is pleased to support the open source community by making 蓝鲸智云PaaS平台社区版 (BlueKing PaaS Community Edition) available.
 * Copyright (C) 2017-2018 THL A29 Limited, a Tencent company. All rights reserved.
 * Licensed under the MIT License (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://opensource.org/licenses/MIT
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */

import { unique } from '../util'
import UserModel from '../model/user'
import { isPlatformAdmin } from '../model/perm'
const httpConf = require('../conf/http')
const axios = require('axios')
const querystring = require('querystring')
const https = require('https')

export const findUserByBk = async bkUsername => {
    const ret = await UserModel.findOneByBk(bkUsername)
    return ret
}

export const addUser = async userData => {
    const res = await UserModel.addUser(userData)
    return res.id
}

export const getUserInfo = ctx => {
    try {
        ctx.send({
            code: 0,
            message: 'success',
            data: ctx.session.userInfo
        })
    } catch (err) {
        ctx.throwError({
            message: err.message
        })
    }
}

export const getAllUser = async ctx => {
    try {
        const bkToken = ctx.cookies.get('bk_token')
        const params = querystring.stringify({
            bk_app_code: httpConf.appCode,
            bk_app_secret: httpConf.appSecret,
            bk_token: bkToken
        })
        const response = await axios({
            withCredentials: true,
            url: `${httpConf.hostUrl}/api/c/compapi/v2/bk_login/get_all_users/?${params}`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Cookie: ctx.cookies.request.headers.cookie || ''
            },
            responseType: 'json',
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        })
        const { data } = response.data
        const userList = data.map((item) => {
            item.id = item.bk_username || item.english_name
            item.name = item.bk_username || item.english_name
            return item
        })
        ctx.send({
            code: 0,
            message: 'success',
            data: userList
        })
    } catch (err) {
        ctx.throwError({
            message: err.message
        })
    }
}

export const getMember = async ctx => {
    try {
        const query = ctx.request.query || {}
        const projectId = query.projectId
        const name = query.name
        let data = await UserModel.getMember(projectId, name)
        data = unique(data, 'username') || []
        ctx.send({
            code: 0,
            message: 'success',
            data
        })
    } catch (err) {
        ctx.throwError({
            message: err.message
        })
    }
}

export const addMembers = async ctx => {
    try {
        const postData = ctx.request.body
        await UserModel.addMembers(postData)
        ctx.send({
            code: 0,
            message: 'success'
        })
    } catch (err) {
        ctx.throwError({
            message: err.message
        })
    }
}

export const editMember = async ctx => {
    try {
        const postData = ctx.request.body
        await UserModel.editMember(postData)
        ctx.send({
            code: 0,
            message: 'success'
        })
    } catch (err) {
        ctx.throwError({
            message: err.message
        })
    }
}

export const deleteMember = async ctx => {
    try {
        const query = ctx.request.query || {}
        const id = query.id
        await UserModel.deleteMember(id)
        ctx.send({
            code: 0,
            message: 'success'
        })
    } catch (err) {
        ctx.throwError({
            message: err.message
        })
    }
}

export const deleteMultipleMember = async ctx => {
    try {
        const query = ctx.request.query || {}
        const ids = query.ids.split(',')
        await UserModel.deleteMultipleMember(ids)
        ctx.send({
            code: 0,
            message: 'success'
        })
    } catch (err) {
        ctx.throwError({
            message: err.message
        })
    }
}

export const setCurUserPermInfo = async ctx => {
    try {
        const project = ctx.request.body || {}
        const projectId = project.id
        const userInfo = ctx.session.userInfo || {}
        const needCheckAdmin = project.needCheckAdmin // 是否需要校验平台管理员
        const permsInfo = await UserModel.getMemberPermInfo(projectId, userInfo.id)
        const data = {
            permCodes: []
        }
        permsInfo.forEach((perm) => {
            data.roleName = perm.roleName
            data.roleId = perm.roleId
            data.permCodes.push(perm.permCode)
        })
        if (needCheckAdmin) {
            const platFormAdminDatas = await isPlatformAdmin(userInfo.username) || []
            if (platFormAdminDatas.length) {
                if (!data.permCodes.includes('add_member')) data.permCodes.push('add_member')
                if (!data.permCodes.includes('delete_member')) data.permCodes.push('delete_member')
            }
        }
        ctx.session.permsInfo = data
        ctx.send({
            code: 0,
            message: 'success',
            data
        })
    } catch (err) {
        ctx.throwError({
            message: err.message
        })
    }
}
