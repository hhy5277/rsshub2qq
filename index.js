"use strict";
const CQHttp = require('cqhttp');
const credentials = require('./credentials');
const rp = require('request-promise');
const cheerio = require('cheerio');
const MD5 = require('js-md5');
const Agent = require('socks5-https-client/lib/Agent');
const clc = require("cli-color");
const fs = require('fs').promises;

let bot = new CQHttp({
    apiRoot: 'http://127.0.0.1:5700/',
    accessToken: credentials.accessToken,
    secret: credentials.secret
});

function htmlDecode(str) {
    // 一般可以先转换为标准 unicode 格式（有需要就添加：当返回的数据呈现太多\\\u 之类的时）
    str = unescape(str.replace(/\\u/g, "%u"));
    // 再对实体符进行转义
    // 有 x 则表示是16进制，$1 就是匹配是否有 x，$2 就是匹配出的第二个括号捕获到的内容，将 $2 以对应进制表示转换
    str = str.replace(/&#(x)?(\w+);/g, function ($, $1, $2) {
        return String.fromCharCode(parseInt($2, $1 ? 16 : 10));
    });
    return str;
}

async function fanyi(str) {
    const appid = credentials.baidu.appid;
    const key = credentials.baidu.key;
    const salt = (new Date).getTime();
    const query = str;
    const from = 'auto';
    const to = 'zh';
    const str1 = appid + query + salt + key;
    const sign = MD5(str1);

    let data = await rp.get('http://api.fanyi.baidu.com/api/trans/vip/translate', {
        qs: {
            q: query,
            appid: appid,
            salt: salt,
            from: from,
            to: to,
            sign: sign
        }
    });
    return JSON.parse(data);
}

let v = new Object(); // 保存rss每次拉取的时间
let baseURL = 'https://rsshub.app';
function h(config, timeout) {
    if (!timeout) timeout = 1000 * 60 * 5;
    if (!v[config.name]) timeout = 0;
    setTimeout(() => {
        rp.get(baseURL + config.url, {
            json: true,
            qs: {
                limit: 1
            }
        }).then(async e => {
            const date_published = (new Date(e.items[0].date_published)).getTime();
            if (!v[config.name]) { // 如果不存在说明是第一次请求
                console.log(clc.cyan(new Date() + '：') + '首次请求 ' + clc.magenta(config.name));
                v[config.name] = date_published;
                h(config);
                return false;
            }
            if (v[config.name] < date_published) { //有更新
                console.log(clc.cyan(new Date() + '：') + '发现更新 ' + clc.magenta(config.name));
                const $ = cheerio.load('<div class="_x">' + htmlDecode(e.items[0].summary) + '</div>');
                let imgArr = '';
                if ($('img').length !== 0){
                    let promises = new Array();
                    $('img').each(function (item) {
                        const src = $(this).attr('src');
                        promises.push(rp({
                            method: 'GET',
                            url: src,
                            agentClass: Agent,
                            agentOptions: {
                                socksHost: '127.0.0.1',
                                socksPort: 1080
                            },
                            encoding: null
                        }))
                    })
                    try {
                        let miao = await Promise.all(promises);
                        miao.forEach(response => {
                            const data = "base64://" + Buffer.from(response, 'utf-8').toString('base64');
                            imgArr += '[CQ:image,file=' + data + ']';
                        });
                    } catch (error) {
                        console.log(clc.cyan(new Date() + '：') + clc.magenta(config.name) + '：图片抓取失败\n' + clc.blackBright(error));
                        h(config, 1000 * 60 * 1);
                        return false;
                    }
                }
                const text = '【@' + config.name.split('-')[1] + '】的' + config.name.split('-')[0] + '更新了！';
                const title = e.items[0].title === '' ? '' : ('\n标题：' + e.items[0].title);
                const content = $('._x').text();
                const fanyiText = (await fanyi(content)).trans_result[0].dst;
                const imgs = imgArr === '' ? '暂无' : imgArr;
                const url = e.items[0].url;
                bot('send_group_msg', {
                    group_id: 57556801,
                    message: text +
                        '\n-------------------------------------------' +
                        title +
                        '\n内容：' + content +
                        '\n翻译：' + fanyiText +
                        '\n媒体：\n' + imgs +
                        '\n-------------------------------------------' +
                        '\n原链接：' + url +
                        '\n日期：' + date_published +
                        '\n来自————月月的机器人' +
                        '\n问题反馈群内联系：[CQ:at,qq=1733708055]'
                }).then(() => {
                    console.log(clc.cyan(new Date() + '：') + clc.magenta(config.name) + ' 更新发送成功');
                    v[config.name] = date_published;
                    h(config);
                }).catch(err => {
                    console.log(clc.cyan(new Date() + '：') + '更新发送失败\n' + clc.blackBright(err));
                    h(config, 1000 * 60 * 1);
                })
            } else { //没有更新
                console.log(clc.cyan(new Date() + '：') + clc.magenta(config.name) + ' 没有更新  最后更新于：' + clc.cyan(new Date(e.items[0].date_published)));
                h(config);
            }
        }).catch(error => {
            console.log(clc.cyan(new Date() + '：') + clc.magenta(config.name) + '  请求RSSHub失败\n' + clc.blackBright(error));
            h(config, 1000 * 60 * 1);
        })
    }, timeout);
};

// // Twitter
h({ name: 'Twitter-GARNIDELIA', url: '/twitter/user/GARNiDELiA.json'});
h({ name: 'Twitter-toku_grnd', url: '/twitter/user/toku_grnd.json'});
h({ name: 'Twitter-MARiA_GRND', url: '/twitter/user/MARiA_GRND.json'});
// // Weibo
h({ name: 'Weibo-MARiA_GARNiDELiA', url: '/weibo/user2/2060888642.json'});
// // Bilibili
h({ name: 'Bilibili-GARNiDELiA', url: '/bilibili/user/dynamic/111939335.json'});
// // Instagram
h({ name: 'Instagram-maria_grnd', url: '/instagram/user/maria_grnd.json'});
h({ name: 'Instagram-toku_grnd', url: '/instagram/user/toku_grnd.json'});
// // YouTube
h({ name: 'YouTube-HeadphoneTokyo', url: '/youtube/user/HeadphoneTokyo.json'});

bot.listen(8989, '127.0.0.1');
