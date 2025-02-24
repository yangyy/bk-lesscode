<template>
    <bk-form :label-width="110" :model="form" ref="funcForm" :form-type="formType" class="func-form-item">
        <bk-form-item label="函数类型" property="funcType">
            <bk-radio-group
                :value="form.funcType"
                @change="(funcType) => updateValue({ funcType })"
            >
                <bk-radio-button
                    v-for="temp in tempList"
                    :value="temp.id"
                    :key="temp.id"
                    :disabled="disabled && form.funcType !== temp.id"
                    class="func-temp"
                >
                    {{ temp.name }}
                    <i
                        class="bk-icon icon-info ml5"
                        v-if="temp.info"
                        v-bk-tooltips="{ content: `<pre class='component-method-tip'>${temp.info}</pre>` }"
                    ></i>
                </bk-radio-button>
            </bk-radio-group>
        </bk-form-item>
        <bk-form-item
            label="函数调用参数"
            ref="funcParams"
            property="funcParams"
            error-display-type="normal"
            :rules="[nameRule]"
            :desc="{ width: 350, content: '调用该函数传入的参数列表，如果函数用于组件事件，则这里是组件事件回调的参数，组件事件回调参数具体可见组件文档。' }">
            <dynamic-tag
                :disabled="disabled"
                v-model="form.funcParams"
                @change="(val) => tagChange('funcParams', val)">
            </dynamic-tag>
        </bk-form-item>
        <template v-if="form.funcType === 1">
            <bk-form-item
                label="Api Url"
                property="funcApiUrl"
                error-display-type="normal"
                :required="true"
                :rules="[requireRule('Api Url')]"
                :desc="`请输入接口 URL，例如：{{domain}}/api/data/getMockData`">
                <bk-input
                    :disabled="disabled"
                    :value="form.funcApiUrl"
                    @input="(funcApiUrl) => updateValue({ funcApiUrl })">
                </bk-input>
            </bk-form-item>
            <bk-form-item
                label="Api 返回数据"
                ref="remoteParams"
                property="remoteParams"
                error-display-type="normal"
                desc="该参数用于接收Api返回数据，在函数中直接可使用该参数获取Api返回数据"
                :rules="[nameRule]">
                <dynamic-tag
                    :disabled="disabled"
                    v-model="form.remoteParams"
                    @change="(val) => tagChange('remoteParams', val)">
                </dynamic-tag>
            </bk-form-item>
            <bk-form-item
                label="Method"
                property="funcMethod"
                error-display-type="normal"
                :required="true"
                :rules="[requireRule('Method')]">
                <bk-select
                    :value="form.funcMethod"
                    @selected="(funcMethod) => updateValue({ funcMethod })"
                    :clearable="false"
                    :popover-options="{ appendTo: 'parent' }"
                    :disabled="disabled">
                    <bk-option v-for="option in methodList"
                        :key="option.id"
                        :id="option.id"
                        :name="option.name">
                    </bk-option>
                </bk-select>
            </bk-form-item>
        </template>
    </bk-form>
</template>

<script>
    import mixins from './form-item-mixins'
    import dynamicTag from '@/components/dynamic-tag.vue'
    import {
        FUNCTION_TYPE,
        FUNCTION_METHOD
    } from 'shared/function/'

    export default {
        components: {
            dynamicTag
        },

        mixins: [mixins],

        props: {
            requireSummary: {
                type: Boolean,
                default: false
            }
        },

        data () {
            return {
                monacoHeight: 200,
                monacoWidth: 200,
                tempList: [
                    { id: FUNCTION_TYPE.EMPTY, name: '空白函数' },
                    { id: FUNCTION_TYPE.REMOTE, name: '远程函数', info: '建议以下几种情况使用 "远程函数":\n1、远程API需要携带用户登录态认证\n2、远程API无法跨域或纯前端访问' }
                ],
                methodList: Object.keys(FUNCTION_METHOD).map((key) => ({ name: key, id: FUNCTION_METHOD[key] })),
                nameRule: {
                    validator: (val) => (val.length <= 0 || val.every(x => /^[A-Za-z_0-9]+$/.test(x))),
                    message: '由大小写英文字母、下划线、数字组成',
                    trigger: 'blur'
                }
            }
        },

        methods: {
            tagChange (key, val) {
                this.updateValue({ [key]: val })
                this.$nextTick(() => {
                    this.$refs[key] && this.$refs[key].validate()
                })
            }
        }
    }
</script>

<style lang="postcss" scoped>
    .func-form-item .func-temp {
        width: 140px;
        max-width: calc(50% - 5px);
        /deep/ .bk-radio-button-text {
            width: 140px;
        }
        /deep/ .bk-radio-button-input:disabled+.bk-radio-button-text {
            border-left: 1px solid #dcdee5;
        }
    }
</style>
