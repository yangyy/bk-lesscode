<template>
    <monaco
        :value="form.funcBody"
        :height="height"
        :proposals="proposals"
        ref="monaco"
        @change="change">
        <template v-slot:tools>
            <i class="bk-drag-icon bk-drag-fix icon-style" @click="fixMethod" v-bk-tooltips="fixMethodTips"></i>
            <slot name="tools"></slot>
        </template>
    </monaco>
</template>

<script>
    import { camelCase, camelCaseTransformMerge } from 'change-case'
    import monaco from '@/components/monaco'
    import mixins from './form-item-mixins'
    import { mapActions } from 'vuex'
    import { FUNCTION_TIPS } from 'shared'
    import LC from '@/element-materials/core'
    import {
        determineShowPropInnerVariable,
        determineShowSlotInnerVariable
    } from 'shared/variable'

    export default {
        components: {
            monaco
        },

        mixins: [mixins],

        props: {
            height: {
                type: [Number, String],
                default: 458
            },
            functionList: {
                type: Array,
                default: () => ([])
            },
            variableList: {
                type: Array,
                default: () => ([])
            }
        },

        data () {
            return {
                fixMethodTips: {
                    content: '自动修复 Eslint',
                    theme: 'light',
                    placements: ['top'],
                    appendTo: 'parent',
                    boundary: 'window'
                },
                multVal: {
                    ...FUNCTION_TIPS
                },
                proposals: []
            }
        },

        watch: {
            'form.funcBody' (val) {
                // 由于函数市场选择函数或者切换函数导致的函数体不一致，需要重置状态
                if (this.multVal[this.form.funcType] !== val) {
                    this.initMultVal()
                }
            },
            'form.funcType' (type) {
                if (this.multVal[type] !== this.form.funcBody) {
                    this.change(this.multVal[type])
                }
            }
        },

        created () {
            this.initMultVal()
            this.initProposals()
        },

        methods: {
            ...mapActions('functions', ['fixFunByEslint']),

            initMultVal (func = this.form) {
                this.multVal = {
                    ...FUNCTION_TIPS,
                    [func.funcType]: func.funcBody
                }
            },

            initProposals () {
                // 获取页面中使用到的函数和变量
                const relatedMethodCodeMap = {}
                const relatedVariableCodeMap = {}
                const recTree = node => {
                    if (!node) {
                        return
                    }
                    Object.keys(node.method).forEach(methodPathKey => {
                        const methodNode = node.method[methodPathKey]
                        if (!Reflect.has(relatedMethodCodeMap, methodNode.code)) {
                            relatedMethodCodeMap[methodNode.code] = []
                        }
                        relatedMethodCodeMap[methodNode.code].push({
                            ...methodNode,
                            componentId: node.componentId
                        })
                    })
                    Object.keys(node.variable).forEach(variablePathKey => {
                        const variableNode = node.variable[variablePathKey]
                        if (!Reflect.has(relatedVariableCodeMap, variableNode.code)) {
                            relatedVariableCodeMap[variableNode.code] = []
                        }
                        relatedVariableCodeMap[variableNode.code].push({
                            ...variableNode,
                            componentId: node.componentId
                        })
                    })
                    // 获取页面中自带的变量，可以配置远程函数和数据源的需要使用内置变量
                    const material = node.material
                    const perVariableName = camelCase(node.componentId, { transform: camelCaseTransformMerge })
                    // 属性中需要展示内置变量
                    Object.keys(material.props || {}).forEach(propKey => {
                        const prop = material.props[propKey]
                        const needShowInnerVariable = determineShowPropInnerVariable(prop.type, propKey, node.type)
                        if (needShowInnerVariable) {
                            const isChart = node.type === 'chart'
                            if (isChart) {
                                this.proposals.push({
                                    label: `lesscode.${node.componentId}.${propKey}`,
                                    kind: window.monaco.languages.CompletionItemKind.Property,
                                    documentation: `组件【${node.componentId}】的【${propKey}】属性的内置变量`,
                                    insertText: `this.${perVariableName}`
                                })
                            } else {
                                this.proposals.push({
                                    label: `lesscode.${node.componentId}.${propKey}`,
                                    kind: window.monaco.languages.CompletionItemKind.Property,
                                    documentation: `组件【${node.componentId}】的【${propKey}】属性的内置变量`,
                                    insertText: `this.${perVariableName}${camelCase(propKey, { transform: camelCaseTransformMerge })}`
                                })
                            }
                        }
                    })
                    // slots 中需要展示内置变量
                    Object.keys(material.slots || {}).forEach(slotKey => {
                        const config = material.slots[slotKey]
                        const needShowInnerVariable = determineShowSlotInnerVariable(config.type)
                        if (needShowInnerVariable) {
                            this.proposals.push({
                                label: `lesscode.${node.componentId}.${config.displayName}`,
                                kind: window.monaco.languages.CompletionItemKind.Property,
                                documentation: `组件【${node.componentId}】的【${config.displayName}】的内置变量`,
                                insertText: `this.${perVariableName}Slot${slotKey}`
                            })
                        }
                    })
                    node.children.forEach(childNode => recTree(childNode))
                }
                recTree(LC.getRoot())
                // 组装提示数据
                const sourceNameMap = {
                    prop: '属性',
                    event: '事件',
                    slot: '内容配置'
                }
                this.functionList.forEach((functionData) => {
                    const usageArray = relatedMethodCodeMap[functionData.funcCode] || []
                    let documentation = ''
                    // 函数简介
                    if (functionData.funcSummary) {
                        documentation = '函数简介：\n' + functionData.funcSummary + '\n'
                    }
                    // 函数使用情况
                    if (usageArray.length) {
                        documentation = '函数使用情况：\n' + documentation
                        usageArray.forEach((usage) => {
                            documentation += `组件ID【${usage.componentId}】的【${usage.key}】【${sourceNameMap[usage.source] || usage.source}】`
                        })
                    }
                    this.proposals.push({
                        label: `lesscode.${functionData.funcName}`,
                        kind: window.monaco.languages.CompletionItemKind.Function,
                        documentation,
                        insertText: `lesscode['\${func:${functionData.funcCode}}'](${(functionData.funcParams || []).join(', ')})`
                    })
                })
                this.variableList.forEach((variableData) => {
                    const usageArray = relatedVariableCodeMap[variableData.variableCode] || []
                    let documentation = ''
                    // 变量简介
                    if (variableData.description) {
                        documentation = '变量简介：\n' + variableData.description + '\n'
                    }
                    // 变量使用情况
                    if (usageArray.length) {
                        documentation = '变量使用情况：\n' + documentation
                        usageArray.forEach((usage) => {
                            documentation += `组件ID【${usage.componentId}】的【${usage.key}】【${sourceNameMap[usage.source] || usage.source}】`
                        })
                    }
                    this.proposals.push({
                        label: `lesscode.${variableData.variableCode}`,
                        kind: window.monaco.languages.CompletionItemKind.Property,
                        documentation,
                        insertText: `lesscode['\$\{prop:${variableData.variableCode}\}']`
                    })
                })
            },

            fixMethod () {
                this.fixFunByEslint(this.form).then((code) => {
                    if (code) {
                        this.change(code)
                        this.messageSuccess('函数修复成功')
                    } else {
                        this.messageWarn('暂无可修复内容')
                    }
                }).catch((err) => {
                    if (err?.code === 499) {
                        this.messageHtmlError(err.message || err)
                    } else {
                        this.messageError(err.message || err)
                    }
                })
            },

            change (funcBody) {
                this.multVal[this.form.funcType] = funcBody
                this.updateValue({ funcBody })
                this.$emit('change', funcBody)
            }
        }
    }
</script>
