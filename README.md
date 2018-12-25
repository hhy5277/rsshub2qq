# Gbot

基于酷Q制作的 RSSHub QQ群推送机器人，用于订阅RSSHub的更新并转发到QQ群

## 使用

在根目录新建一个 `credentials.js` 文件，内容为

```javascript
module.exports = {
    accessToken: '123456', //cqhttp插件配置
    secret: '123456',
    baidu: { //百度翻译的信息
        appid: '123456',
        key: '123456'
    },
    list: [
        { name: 'Twitter-Ice_Hayzmoon', url: '/twitter/user/Ice_Hayzmoon', group_id: 57556801}, //订阅信息
    ]
}
```

## 其他

[https://imiku.me/2018/10/16/1230.html](https://imiku.me/2018/10/16/1230.html)
