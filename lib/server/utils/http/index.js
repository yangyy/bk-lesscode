import axios from 'axios'

const instance = axios.create({
    // 请求超时时间
    timeout: 10000,
    // 每次请求携带cookie
    withCredentials: true
})

// 解析错误
instance.interceptors.response.use(
    // API 响应成功
    response => response.data,
    // 解析 http status code (非 200)
    error => {
        const { response } = error
        if (response) {
            // 默认提示 http 状态码错误标记
            let message = response.statusText
            // 兼容接口响应时通过body返回错误信息
            if (response.data && response.data.message) {
                message = response.data.message
            }
            if (response.data && response.data.detail) {
                message = response.data.detail
            }
            // 默认给出的 code
            let code = response.status || -1
            if (response.data && response.data.code) {
                code = response.data.code
            }
            return Promise.reject(new global.BusinessError(message, code))
        }
        return Promise.reject(new global.BusinessError('接口访问异常', -1))
    }
)

// 处理错误
instance.interceptors.response.use(undefined, error => Promise.reject(error))

export default instance
