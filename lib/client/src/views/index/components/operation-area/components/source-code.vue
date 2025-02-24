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
    <section class="vue-code" v-bkloading="{ isLoading: isLoading, color: '#313238' }">
        <code-viewer
            ref="codeView"
            v-show="!isLoading"
            :code="formatCode"
            :filename="filename"
            :with-nav="withNav"
            @change-with-nav="getFormatCode" />
    </section>
</template>

<script>
    import { circleJSON } from '@/common/util.js'
    import CodeViewer from '@/components/code-viewer'
    import LC from '@/element-materials/core'
    import { mapGetters } from 'vuex'

    export default {
        name: 'vue-code',
        components: {
            CodeViewer
        },
        props: {},
        data () {
            return {
                pageType: 'vueCode',
                formatCode: '',
                withNav: false,
                isLoading: true
            }
        },
        computed: {
            ...mapGetters('page', ['pageDetail']),
            ...mapGetters('projectVersion', { versionId: 'currentVersionId', currentVersion: 'currentVersion' }),
            projectId () {
                return this.$route.params.projectId || ''
            },
            pageId () {
                return this.$route.params.pageId || ''
            },
            filename () {
                return `bklesscode-${this.pageId}.vue`
            }
        },
        mounted () {
            this.getFormatCode(this.withNav)
        },
        methods: {
            getFormatCode (withNav) {
                this.isLoading = true
                const { pageType, projectId, pageId } = this
                const targetData = JSON.parse(circleJSON(LC.getRoot().toJSON().renderSlots.default))
                this.$store.dispatch('vueCode/getPageCode', {
                    targetData,
                    pageType,
                    projectId,
                    versionId: this.versionId,
                    pageId,
                    withNav
                }).then(res => {
                    this.formatCode = res
                }).finally(() => {
                    this.isLoading = false
                })
            }
        }
    }
</script>

<style lang="postcss">
    .vue-code {
        /* height: 100%; */
        /* border: 1px solid #DCDEE5; */
        .hljs-attr {
            color: #a6e22e;
        }
    }
</style>
