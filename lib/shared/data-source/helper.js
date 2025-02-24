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
import {
    DataParse,
    DataJsonParser,
    DataSqlParser,
    DataCsvParser,
    StructJsonParser,
    StructSqlParser,
    StructCsvParser
} from './index'

/**
 * 导出表结构
 * @param {*} tables 表结构
 * @param {*} fileType 打出类型  csv | sql
 * @param {*} name 导出文件名
 * @returns 返回导出内容 [{ name, conent }]
 */
export const generateExportStruct = (tables, fileType, name) => {
    const dataParse = new DataParse()
    const structJsonParser = new StructJsonParser(tables)
    if (fileType === 'sql') {
        const structSqlParser = new StructSqlParser()
        const content = dataParse.import(structJsonParser).export(structSqlParser)
        return [{ content, name }]
    } else {
        const structCsvParser = new StructCsvParser()
        const fileContents = dataParse.import(structJsonParser).export(structCsvParser)
        return fileContents.map(({ tableName, content }) => {
            return {
                name: name || `${tableName}.csv`,
                content
            }
        })
    }
}

/**
 * 导出表数据
 * @param {*} datas 表数据
 * @param {*} fileType 打出类型  csv | sql
 * @param {*} name 导出文件名
 * @returns 返回导出内容 [{ name, conent }]
 */
export const generateExportDatas = (datas, fileType, name) => {
    const dataParse = new DataParse()
    const dataJsonParser = new DataJsonParser(datas)
    if (fileType === 'sql') {
        const dataSqlParser = new DataSqlParser()
        const content = dataParse.import(dataJsonParser).export(dataSqlParser)
        return [{ content, name }]
    } else {
        const dataCsvParser = new DataCsvParser()
        const fileContents = dataParse.import(dataJsonParser).export(dataCsvParser)
        return fileContents.map(({ tableName, content }) => {
            return {
                name: name || `${tableName}.csv`,
                content
            }
        })
    }
}
