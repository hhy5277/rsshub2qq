"use strict";
const CQHttp = require('cqhttp');
const credentials = require('./credentials');
const rp = require('request-promise');
const cheerio = require('cheerio');
const MD5 = require('js-md5');
const Parser = require('rss-parser');
const Agent = require('socks5-https-client/lib/Agent');
const clc = require("cli-color");
const dayjs = require('dayjs');

const bot = new CQHttp({
    apiRoot: 'http://127.0.0.1:5700/',
    accessToken: credentials.accessToken,
    secret: credentials.secret
});

const baiduTranslate = async (str) => {
    const appid = credentials.baidu.appid;
    const key = credentials.baidu.key;
    const salt = (new Date).getTime();
    const query = str;
    const from = 'auto';
    const to = 'zh';
    const str1 = appid + query + salt + key;
    const sign = MD5(str1);

    const data = await rp.get('http://api.fanyi.baidu.com/api/trans/vip/translate', {
        qs: {
            q: query,
            appid: appid,
            salt: salt,
            from: from,
            to: to,
            sign: sign
        },
        json: true
    });
    return data.trans_result[0].dst;
}

const log = (log) => {
    let date = dayjs(new Date()).format('YY年M月D日HH:mm:ss');
    console.log(clc.cyan(date + '：') + log);
}

let upTime = new Object(); // 保存rss每次拉取的时间
const baseURL = 'https://rsshub.app';

function grss(config, timeout) {
    if (!timeout) timeout = 1000 * 60 * 5;
    if (!upTime[config.name]) timeout = 0;
    setTimeout(() => {
        rp.get(baseURL + config.url, {
            json: true,
            timeout: 1000 * 60,
            qs: {
                limit: 1
            }
        })
            .then(async e => {
                // 解析RSS
                const parser = new Parser();
                let feed = await parser.parseString(e);

                const date_published = dayjs(feed.items[0].date_published).unix();
                if (!upTime[config.name]) { // 如果不存在说明是第一次请求
                    log('首次请求' + config.name);
                    upTime[config.name] = date_published;
                    grss(config);
                    return false;
                }

                if (upTime[config.name] < date_published) { //有更新
                    log('发现更新' + config.name)

                    if (feed.items[0].title.search('Re') !== -1) { // 如果是回复类型的推文则不推送
                        log('回复推文，不推送');
                        grss(config);
                        return false;
                    }

                    // 解析HTML
                    const $ = cheerio.load(feed.items[0].content);

                    let imgArr = '';

                    if ($('img').length > 0){ // 如果有图片，请求并转换为base64编码
                        let promises = new Array();
                        $('img').each(function () {
                            const src = $(this).attr('src');

                            // 把http链接转换成https
                            if(/https?/.test(src)){
                                src = src.replace(/https?/, 'https');
                            }
                            
                            promises.push(rp({
                                method: 'GET',
                                url: src,
                                timeout: 1000 * 60,
                                agentClass: Agent,
                                agentOptions: {
                                    socksHost: '127.0.0.1',
                                    socksPort: 1080
                                },
                                encoding: null
                            }))

                        })
                        try {
                            let images = await Promise.all(promises);
                            images.forEach(response => {
                                const data = "base64://" + Buffer.from(response, 'utf-8').toString('base64');
                                imgArr += '[CQ:image,file=' + data + ']';
                            });
                        } catch (error) {
                            log(config.name + '：图片抓取失败' + error);
                            grss(config, 1000 * 60 * 1);
                            return false;
                        }
                    }


                    
                    const message = {
                        text: '【@' + config.name.split('-')[1] + '】的' + config.name.split('-')[0] + '更新了！',
                        title: feed.items[0].title === '' ? '' : `标题：${feed.items[0].title}\n`,
                        content: feed.items[0].contentSnippet,
                        translateText: (await baiduTranslate(feed.items[0].contentSnippet)),
                        imgs: imgArr === '' ? '' : ('媒体：\n' + imgArr + '\n'),
                        url: feed.items[0].link,
                        date: dayjs(feed.items[0].pubDate).format('YY年M月D日HH:mm:ss')
                    }
                    bot('send_group_msg', {
                        group_id: config.group_id,
                        message: 
                            `${message.text}\n` + 
                            '-------------------------------------------\n' + 
                            `${message.title}` + 
                            `内容：${message.content}\n` + 
                            `${message.translateText}` + 
                            `${message.imgs}` + 
                            '-------------------------------------------\n' + 
                            `原链接：${message.url}\n` + 
                            `日期：${message.date}`
                    })
                        .then(() => {
                            log(config.name + '更新发送成功');
                            upTime[config.name] = date_published;
                            grss(config);
                        })
                        .catch(error => {
                            log(config.name + ' 更新发送失败：' + error);
                            grss(config, 1000 * 60 * 1);
                        })
                } else { //没有更新
                    log(config.name + ' 没有更新  最后更新于：' + dayjs(feed.items[0].pubDate).format('YY年M月D日HH:mm:ss'));
                    grss(config);
                }
            })
            .catch(error => {
                log(config.name + '请求RSSHub失败' + error);
                grss(config, 1000 * 60 * 1);
            })
    }, timeout);
};

credentials.list.forEach((config, index) => {
    setTimeout(() => {
        grss(config)
    }, 1000 * 10 * index);
})

bot.listen(8989, '127.0.0.1');
