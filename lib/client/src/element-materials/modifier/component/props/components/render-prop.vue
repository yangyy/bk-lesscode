<!--
  Tencent is pleased to support the open source community by making 蓝鲸智云PaaS平台社区版 (BlueKing PaaS Community Edition) available.
  Copyright (C) 2017-2019 THL A29 Limited, a Tencent company. All rights reserved.
  Licensed under the MIT License (the "License"); you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
  http://opensource.org/licenses/MIT
  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
-->

<template>
    <div class="modifier-prop">
        <variable-select
            :show="!isReadOnly && variableSelectEnable"
            :options="variableSelectOptions"
            :value="formData"
            @change="handleVariableFormatChange">
            <template v-slot:title>
                <div class="prop-name">
                    <span
                        :class="{ label: describe.tips }"
                        v-bk-tooltips="introTips">
                        {{ displayName }}
                    </span>
                    <div
                        v-if="showInnerVariable"
                        v-bk-tooltips="{
                            content: innerVariableTips,
                            width: '300',
                            placements: ['left-start'],
                            boundary: 'window'
                        }"
                        class="inner-variable"
                    >
                        <i class="bk-icon icon-info"></i>
                        内置变量：{{innerVariableCode}}
                    </div>
                </div>
            </template>
            <bk-radio-group
                v-if="renderComponentList.length > 1"
                :value="selectValueType"
                style="margin-bottom: 10px;"
                @change="handleValueTypeChange">
                <bk-radio-button
                    v-for="item in renderComponentList"
                    :key="item.type"
                    :value="item.type">
                    {{ item.type | valueTypeTextFormat }}
                </bk-radio-button>
            </bk-radio-group>
            <div
                v-if="isRenderValueCom"
                class="prop-action">
                <template v-for="(renderCom, index) in renderComponentList">
                    <!-- 控件类型或者值的类型匹配都将展示，如：控制类型为 src 值的类型为 string(支持src输入加选择模式之前) 都需展示 -->
                    <template v-if="selectValueType === renderCom.type || selectValueType === renderCom.valueType">
                        <component
                            :is="renderCom.component"
                            :name="name"
                            :type="renderCom.type"
                            :describe="describe"
                            :default-value="propTypeValueMemo[selectValueType].val"
                            :payload="propTypeValueMemo[selectValueType].payload"
                            :remote-validate="describe.remoteValidate"
                            :key="`${renderCom.type}_${index}`"
                            :readonly="isReadOnly"
                            :change="handleCodeChange" />
                    </template>
                </template>
            </div>
        </variable-select>
    </div>
</template>
<script>
    import { camelCase, camelCaseTransformMerge } from 'change-case'
    import { transformTipsWidth } from '@/common/util'
    import safeStringify from '@/common/json-safe-stringify'
    import variableSelect from '@/components/variable/variable-select'
    import {
        determineShowPropInnerVariable
    } from 'shared/variable'

    import {
        getDefaultValueByType,
        isEmpty,
        toPascal
    } from '../../utils'

    import TypeSize from './strategy/size'
    import TypeRemote from './strategy/remote'
    import TypeFunction from './strategy/function'
    import TypeBoolean from './strategy/boolean'
    import TypeColumn from './strategy/column'
    import TypeNumber from './strategy/number'
    import TypeFloat from './strategy/float'
    import TypeSelect from './strategy/select'
    import TypeString from './strategy/string'
    import TypeTextarea from './strategy/textarea'
    import TypeText from './strategy/text'
    import TypeTableColumn from './strategy/table-column'
    import TypeCollapse from './strategy/collapse.vue'
    import TypeJson from './strategy/json-view.vue'
    import TypeSlot from './strategy/slot.vue'
    import TypeFreeLayoutItem from './strategy/free-layout-item.vue'
    import TypeSlotWrapper from './strategy/slot-wrapper'
    import TypeIcon from './strategy/icon'
    import TypeVanIcon from './strategy/van-icon'
    import TypeColor from './strategy/color'
    import TypleElProps from './strategy/el-props'
    import TypeDataSource from './strategy/data-source.vue'
    import TypeTableDataSource from './strategy/table-data-source.vue'
    import TypeSrc from './strategy/src.vue'

    const getRealValue = (type, target) => {
        if (type === 'object') {
            const FunctionCon = Function
            return (new FunctionCon(`return ${safeStringify(target)}`))()
        }
        return target
    }

    // 属性类型转为该变量接受的值类型
    const getPropValueType = (type) => {
        const valueMap = {
            'size': 'string',
            'text': 'string',
            'paragraph': 'string',
            'html': 'string',
            'json': 'object',
            'icon': 'string',
            'van-icon': 'string',
            'float': 'number',
            'src': 'string',
            'srcset': 'array',
            'object': 'hidden'
        }
        return valueMap[type] || type
    }

    export default {
        name: 'render-prop-modifier',
        components: {
            variableSelect
        },
        filters: {
            valueTypeTextFormat (valueType) {
                const textMap = {
                    'areatext': '文本',
                    'number': '数字',
                    'object': '对象',
                    'string': '字符串',
                    'array': '数组',
                    'remote': '远程函数',
                    'data-source': '数据源',
                    'table-data-source': '数据源',
                    'srcset': '图片列表'
                }
                return textMap[valueType] || toPascal(valueType)
            }
        },
        props: {
            componentType: String,
            componentId: {
                type: String
            },
            // prop 的 name
            name: {
                type: String,
                required: true
            },
            // prop 的 配置
            describe: {
                type: Object,
                required: true
            },
            // 用户的配置的值
            lastValue: {
                type: [Number, String, Boolean, Object, Array],
                default: () => ({})
            }
        },
        data () {
            return {
                selectValueType: '',
                formData: {},
                isRenderValueCom: false
            }
        },
        computed: {
            /**
             * @desc format 为 value 时 valueType 编辑组件
             * @returns { Object }
             */
            renderComponentList () {
                const config = this.describe
                const comMap = {
                    'areatext': TypeTextarea,
                    'boolean': TypeBoolean,
                    'size': TypeSize,
                    'column': TypeColumn,
                    'number': TypeNumber,
                    'float': TypeFloat,
                    'select': TypeSelect,
                    'string': TypeString,
                    'text': TypeText,
                    'table-column': TypeTableColumn,
                    'collapse': TypeCollapse,
                    'remote': TypeRemote,
                    'json': TypeJson,
                    'slot-html': TypeSlot,
                    'free-layout-item': TypeFreeLayoutItem,
                    'icon': TypeIcon,
                    'van-icon': TypeVanIcon,
                    'color': TypeColor,
                    'step': TypeSlotWrapper,
                    'function': TypeFunction,
                    'el-props': TypleElProps,
                    'data-source': TypeDataSource,
                    'table-data-source': TypeTableDataSource,
                    'src': TypeSrc,
                    'srcset': TypeSlotWrapper
                }

                const typeMap = {
                    'array': 'json',
                    'boolean': 'boolean',
                    'column': 'column',
                    'size': 'size',
                    'number': 'number',
                    'float': 'float',
                    'object': 'json',
                    'string': 'string',
                    'text': 'text',
                    'paragraph': 'text',
                    'tab-panel': 'tab-panel',
                    'radio': 'radio',
                    'radio-button': 'radio-button',
                    'checkbox': 'checkbox',
                    'table-column': 'table-column',
                    'option': 'option',
                    'collapse': 'collapse',
                    'remote': 'remote',
                    'json': 'json',
                    'html': 'slot-html',
                    'free-layout-item': 'free-layout-item',
                    'bread-crumb': 'bread-crumb',
                    'icon': 'icon',
                    'van-icon': 'van-icon',
                    'form-item': 'form-item',
                    'color': 'color',
                    'step': 'step',
                    'function': 'function',
                    'el-step': 'el-step',
                    'timeline': 'timeline',
                    'carousel': 'carousel',
                    'el-radio': 'el-radio',
                    'el-checkbox': 'el-checkbox',
                    'el-props': 'el-props',
                    'data-source': 'data-source',
                    'table-data-source': 'table-data-source',
                    'src': 'src',
                    'srcset': 'srcset'
                }

                let realType = config.type
                // 属性type支持配置数组，内部逻辑全部按数组处理
                if (typeof config.type === 'string') {
                    realType = [config.type]
                }

                return realType.reduce((res, propType) => {
                    if (typeMap.hasOwnProperty(propType)) {
                        const renderType = Array.isArray(config.options) ? 'select' : typeMap[propType]
                        res.push({
                            type: propType,
                            component: comMap[renderType],
                            valueType: getPropValueType(propType)
                        })
                    }
                    return res
                }, [])
            },
            /**
             * @desc prop name
             * @returns { String }
             */
            displayName () {
                if (this.renderComponentList.length > 1) {
                    return this.name
                }
                const [editCom] = this.renderComponentList
                return `${this.name}(${toPascal(editCom.valueType)})`
            },
            /**
             * @desc 不支持的变量切换类型(variable、expression)
             * @returns { Array }
             */
            disableVariableType () {
                return this.describe.disableVariableType ? this.describe.disableVariableType : []
            },
            /**
             * @desc prop 描述 tips
             * @returns { Object }
             */
            introTips () {
                const tip = transformTipsWidth(this.describe.tips)
                const commonOptions = {
                    disabled: !tip,
                    interactive: false,
                    placements: ['left-start'],
                    boundary: 'window'
                }
                return typeof tip === 'string'
                    ? {
                        ...commonOptions,
                        content: tip
                    }
                    : Object.assign(tip, commonOptions)
            },
            /**
             * @desc type 支持 remote 类型的不支持配置变量
             * @returns { Boolean }
             */
            variableSelectEnable () {
                return !this.renderComponentList.some(com => com.type === 'remote')
            },
            /**
             * @desc 是否展示内置变量
             * @returns { Boolean }
             */
            showInnerVariable () {
                return determineShowPropInnerVariable(this.describe.type, this.name, this.componentType)
            },
            /**
             * 内置变量提示
             */
            innerVariableTips () {
                return `${this.name} 属性有内置变量，可以在函数中使用【lesscode.${this.componentId}.${this.name}】关键字唤起自动补全功能来使用该变量。属性面板配置的值将作为变量的初始值。通过变量可以获取或者修改本属性的值`
            },
            /**
             * 内置变量名
             */
            innerVariableCode () {
                const perVariableName = camelCase(this.componentId, { transform: camelCaseTransformMerge })
                const isChart = this.componentType === 'chart'
                let innerVariableCode
                if (isChart) {
                    innerVariableCode = perVariableName
                } else {
                    innerVariableCode = `${perVariableName}${camelCase(this.name, { transform: camelCaseTransformMerge })}`
                }
                return innerVariableCode
            }
        },
        watch: {
            lastValue: {
                handler (lastValue) {
                    if (this.isInnerChange) {
                        this.isInnerChange = false
                        return
                    }
                    setTimeout(() => {
                        if (lastValue && lastValue.valueType) {
                            // fix: 旧数据存在 valueType 是数组的情况
                            const lastValueType = Array.isArray(lastValue.valueType)
                                ? lastValue.valueType[0]
                                : lastValue.valueType
                            
                            this.formData = Object.freeze({
                                ...this.formData,
                                format: lastValue.format,
                                code: lastValue.code,
                                valueType: lastValueType
                            })

                            this.propTypeValueMemo[this.formData.valueType] = {
                                val: lastValue.code,
                                payload: lastValue.payload || {}
                            }
                        }
                        this.selectValueType = this.formData.valueType
                        this.isRenderValueCom = true
                    })
                },
                immediate: true
            }
        },
        created () {
            this.isReadOnly = this.componentType === 'widget-form' && this.name === 'model'
            const {
                type,
                val
            } = this.describe

            const defaultValue = val !== undefined ? val : getDefaultValueByType(type)
            const valueTypes = (Array.isArray(type) ? type : [type]).map(getPropValueType)

            // 构造 variable-select 的配置
            this.variableSelectOptions = {
                type: 'v-bind',
                prop: this.name,
                format: 'value',
                formatInclude: ['value', 'variable', 'expression'],
                code: defaultValue,
                valueTypeInclude: valueTypes,
                limitTypes: valueTypes
            }

            // prop 的初始值
            this.formData = Object.freeze({
                format: 'value',
                code: defaultValue,
                valueType: valueTypes[0],
                renderValue: defaultValue,
                payload: this.lastValue.payload || {}
            })
            
            // 编辑状态缓存
            this.propTypeValueMemo = {
                [this.formData.valueType]: {
                    val: this.formData.renderValue,
                    payload: this.formData.payload
                }
            }
        },
        methods: {
            /**
             * @desc 同步更新用户操作
             */
            triggerChange (from) {
                this.isInnerChange = true
                // 缓存用户本地编辑值
                this.propTypeValueMemo[this.formData.valueType] = {
                    val: this.formData.code,
                    payload: this.formData.payload
                }

                // 如果切换 format 导致到时 code 为空，
                // 为了页面渲染效果将 propTypeValue 重置为默认
                if (from === 'format' && !this.formData.code) {
                    this.propTypeValueMemo[this.formData.valueType].val = this.formData.renderValue
                }

                this.$emit('on-change', this.name, {
                    ...this.formData,
                    modifiers: this.describe.modifiers || []
                })
            },
            /**
             * @desc 变量切换
             * @param { Object } variableSelectData
             */
            handleVariableFormatChange (variableSelectData) {
                const {
                    format,
                    renderValue
                } = variableSelectData
                let { code } = variableSelectData

                // format 切换为 value，这个时候 code 为空
                // 如果有缓存对应 valueType 的值切换后默认使用缓存值
                if (format === 'value'
                    && code === ''
                    && this.propTypeValueMemo[this.formData.valueType]) {
                    code = this.propTypeValueMemo[this.formData.valueType].val
                }
                this.formData = Object.freeze({
                    ...this.formData,
                    format,
                    code,
                    renderValue
                })
                this.triggerChange('format')
            },
            /**
             * @desc format 等于 value 时 value 的类型切换
             * @param { String } valueType
             */
            handleValueTypeChange (valueType) {
                this.selectValueType = valueType
                let code = null
                let payload = {}
                if (this.propTypeValueMemo.hasOwnProperty(valueType)) {
                    code = this.propTypeValueMemo[valueType].val
                    payload = this.propTypeValueMemo[valueType].payload
                } else if ([
                    'remote',
                    'data-source',
                    'table-data-source'
                ].includes(valueType)) {
                    // fix:
                    // 远程函数、数据源类型在没有获取数据前使用配置文件设置的默认值
                    code = this.describe.val
                } else {
                    // 切换值类型时，通过类型获取默认值
                    code = getDefaultValueByType(valueType)
                }

                this.formData = Object.freeze({
                    ...this.formData,
                    code,
                    payload,
                    valueType,
                    renderValue: code
                })

                this.triggerChange()
            },
            /**
             * @desc format 等于 value 时 编辑 code
             * @param { String } name
             * @param { Any } value
             * @param { String } type
             * @param { Object } payload prop 配置附带的额外信息(eq: type 为 remote 时接口函数相关的配置)
             */
            handleCodeChange (name, value, type, payload = {}) {
                try {
                    let code = null
                    let renderValue

                    const val = getRealValue(type, value)

                    if (this.formData.valueType === 'remote') {
                        // 配置的是远程函数、数据源
                        // code 此时无效，设置为 null
                        // api 返回数据不为空时在画布编辑区才应用 api 数据
                        if (!isEmpty(val)) {
                            renderValue = val
                        }
                    } else {
                        code = val
                        renderValue = val
                    }

                    this.formData = Object.freeze({
                        ...this.formData,
                        code,
                        payload,
                        renderValue
                    })
                    this.triggerChange()
                } catch {
                    this.$bkMessage({
                        theme: 'error',
                        message: `属性【${name}】的值设置不正确`
                    })
                }
            }
        }
    }
</script>
<style lang="postcss">
    .item-ghost {
        border: 1px dashed #3a84ff;
        background: #fff !important;
        color: #fff !important;
        height: 32px;
        .bk-form-control, .bk-drag-icon, .bk-icon, .label {
            display: none;
        }
    }
    .block-item-ghost {
        border: 1px dashed #3a84ff;
        background: #fff !important;
        color: #fff !important;
        height: 100px;
        .bk-form-control, .bk-icon, .bk-drag-icon, .label, .bk-form-radio, .bk-select, .bk-form-checkbox {
            display: none;
        }
    }
    .option-col-operate {
        position: absolute;
        right: 12px;
        color: #979BA5;
        display: none;
        font-size: 24px;
        .option-col-del {
            cursor: pointer;
        }
        .option-col-drag {
            cursor: move;
            margin-right: -10px;
            padding-left: 220px;
        }
    }
    .modifier-prop {
        margin: 0 10px;
        .prop-name {
            line-height: 30px;
            font-size: 14px;
            color: #63656E;
            word-break: keep-all;
            width: 100%;
            .label {
                border-bottom: 1px dashed #979ba5;
                cursor: pointer;
                max-width: calc(100% - 65px);
                line-height: 19px;
                display: inline-block;
                margin-top: 6px;
            }
            span {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .inner-variable {
                font-size: 12px;
                line-height: 30px;
                display: block;
                cursor: pointer;
                width: 100%;
                background: #F5F7FA;
                padding: 0 6px;
                margin-bottom: 5px;
            }
            /* .icon-info-circle {
                padding: 4px;
                color: #979BA5;
                font-size: 16px;
                cursor: pointer;
            } */
        }
        .prop-action {
            width: 100%;
        }
        &.slots {
            border-top: 1px solid #ccc;
            margin-top: 20px;
        }
    }
</style>
