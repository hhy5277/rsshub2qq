"use strict";
const CQHttp = require('cqhttp');
const credentials = require('./credentials');
const rp = require('request-promise');
const cheerio = require('cheerio');
const MD5 = require('js-md5');
const Agent = require('socks5-https-client/lib/Agent');
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
    const from = 'jp';
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

async function h(_name, _rssUrl, _title, _rss_version) {
    let _RSS_VERSION = _rss_version;
    try {
        let e = await rp(_rssUrl, {
            json: true
        })
        let date = (new Date(e.items[0].date_published)).getTime();
        if (_RSS_VERSION === null) {
            console.log(new Date() + ':首次请求' + _name);
            _RSS_VERSION = date;
            setTimeout(() =>{
                h(_name, _rssUrl, _title, _RSS_VERSION);
            }, 1000 * 60 * 1)
            return false;
        }
        if (_RSS_VERSION < date) {
            console.log(new Date() + ':' + _name + '有更新');
            const $ = cheerio.load('<div class="_x">' + htmlDecode(e.items[0].summary) + '</div>');
            let imgArr = '';
            for (let index = 0; index < $('img').length; index++) {
                const element = $('img')[index];
                let src = $(element).attr('src');
                async function _(){
                    if (src) {
                        try {
                            let response = await rp({
                                method: 'GET',
                                url: src,
                                agentClass: Agent,
                                agentOptions: {
                                    socksHost: '127.0.0.1',
                                    socksPort: 1080
                                },
                                encoding: null
                            })
                            const data = "base64://" + Buffer.from(response, 'utf-8').toString('base64');
                            imgArr += '[CQ:image,file=' + data + ']';
                        } catch (error) {
                            console.log(new Date() + ':' + _name + '图片抓取失败\n' + error);
                        }
                    };
                }
                await _();
            }

            let text = $('._x').text();
            let fanyiText = await fanyi(text);
            let img = imgArr === '' ? '暂无' : imgArr;
            let title = e.items[0].title === '' ? '' : ('\n标题：' + e.items[0].title);
            bot('send_group_msg', {
                group_id: 57556801,
                message: _title +
                '\n-------------------------------------------' +
                title +
                '\n内容：' + text +
                '\n翻译：' + fanyiText.trans_result[0].dst +
                '\n媒体：\n' + img +
                '\n-------------------------------------------' +
                '\n原链接：' + e.items[0].url +
                '\n日期：' + e.items[0].date_published +
                '\n来自————月月的机器人' +
                '\n问题反馈群内联系：1733708055'
            }).then(() => {
                _RSS_VERSION = date;
                console.log(new Date() + ':' + _name + '更新发送成功');
            }).catch(err => {
                console.log(new Date() + ':' + _name + '更新发送失败\n' + err);
            })
        }else{
            console.log(new Date() + ':' + _name + '没有更新，最后更新于：' + new Date(e.items[0].date_published))
        }
        setTimeout(() => {
            h(_name, _rssUrl, _title, _RSS_VERSION);
        }, 1000 * 60 * 5);
    } catch (error) {
        console.log(new Date() + ':' + _name + '请求RSSHub失败\n' + error);
        setTimeout(() => {
            h(_name, _rssUrl, _title, _RSS_VERSION);
        }, 1000 * 5);
    }
};

// Twitter
h('Twitter_GARNIDELIA', 'https://rsshub.app/twitter/user/GARNiDELiA.json?limit=1', '【@GARNIDELIA】的Twitter更新了！！', null);
h('Twitter_toku_grnd', 'https://rsshub.app/twitter/user/toku_grnd.json?limit=1', '【@toku_grnd】的Twitter更新了！！', null);
h('Twitter_MARiA_GRND', 'https://rsshub.app/twitter/user/MARiA_GRND.json?limit=1', '【@MARiA_GRND】的Twitter更新了！！', null);

// Weibo
h('Weibo_MARiA_GARNiDELiA', 'https://rsshub.app/weibo/user2/2060888642.json?limit=1', '【@MARiA_GARNiDELiA】的Weibo更新了！！', null);

// Bilibili
h('Bilibili_GARNiDELiA', 'https://rsshub.app/bilibili/user/dynamic/111939335.json?limit=1', '【@GARNiDELiA】的Bilibili更新了！！', null);

// Instagram
h('Instagram_maria_grnd', 'https://rsshub.app/instagram/user/maria_grnd.json?limit=1', '【@maria_grnd】的Instagram更新了！！', null);
h('Instagram_toku_grnd', 'https://rsshub.app/instagram/user/toku_grnd.json?limit=1', '【@toku_grnd】的Instagram更新了！！', null);

bot.listen(8989, '127.0.0.1');
