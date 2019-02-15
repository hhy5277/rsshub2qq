# rsshub2qq

基于酷Q制作的 RSSHub QQ群推送机器人，用于订阅RSSHub的更新并转发到QQ群

## 使用

在根目录新建一个 `credentials.js` 文件，内容为

```javascript
module.exports = {
    accessToken: '', //CQhttp插件配置
    secret: '', //CQhttp插件配置
    proxy: true, //是否启用 SSR 代理
    proxyConfig: { //SSR 代理配置
        socksHost: '127.0.0.1',
        socksPort: 1080
    },
    baidu: { // 百度翻译的api信息
        appid: '',
        key: ''
    },
    rss: [
        {
            name: 'Twitter-GARNIDELIA', //rss名称
            url: '/twitter/user/GARNiDELiA', //RSSHub的路由
            group_id: [123456789], //可以是Array也可以是Number
            translate: true //是否启用内容翻译
        }, //订阅信息
    ]
}
```

## 其他

[https://imiku.me/2018/10/16/1230.html](https://imiku.me/2018/10/16/1230.html)
