"use strict";
const rp = require('request-promise');
const cheerio = require('cheerio');
const Parser = require('rss-parser');
const dayjs = require('dayjs');
const _ = require('lodash');
const del = require('del');
const db = require('./utils/db');
const log = require('./utils/log');
const downloadImtg = require('./utils/downloadImg');
const translate = require('./utils/translate');
const send = require('./utils/send');
const credentials = require('./credentials');

// RSSHUB链接
const baseURL = 'https://mikurss.arukascloud.io';

function grss(config) {
    rp.get(baseURL + config.url, {
            qs: {
                limit: 5
            },
            transform: async function (body, response, resolveWithFullResponse) {
                if (response.headers['content-type'] === 'application/xml; charset=utf-8') {
                    const parser = new Parser();
                    const feed = await parser.parseString(body);
                    return feed;
                } else {
                    return body;
                }
            }
        })
        .then(async function (feed) {
            const oldFeed = db.get(`grss[${config.name}]`).value();

            if (!oldFeed) { // 如果不存在说明是第一次请求
                log('首次请求' + config.name);
                db.set(`grss[${config.name}]`, feed.items).write();
                return false;
            }

            let items = _.chain(feed.items).differenceBy(oldFeed, 'guid');

            // 过滤回复和转发推文
            items = items.filter(function (o) {
                let title = o.title;
                let flag = title.search('Re') !== -1 || title.search('转发了') !== -1;
                return !flag;
            }).value();

            let mediaArr = '';
            if(items.length){
                log(`发现了 ${items.length} 条更新`);
            }else{
                log(`没有发现更新`);
            }
            for (let index = 0; index < items.length; index++) {
                const item = items[index];
                const content = item.content.replace(/<br><video.+?><\/video>|<br><img.+?>/g, e => {
                    return e.replace(/<br>/, '');
                })
                // 解析HTML
                const $ = cheerio.load(content.replace(/<br>/g, '\n'));
                if ($('img').length || $('video').length) {
                    let imgs = new Array();

                    $('img').each(function () {
                        const src = $(this).attr('src');
                        if (src) imgs.push(src);
                    })

                    $('video').each(function () {
                        const src = $(this).attr('poster');
                        if (src) imgs.push(src);
                    })

                    try {
                        _.chain(await downloadImtg(imgs)).each(e => {
                            mediaArr += '[CQ:image,file=' + e + ']';
                        }).value();
                    } catch (error) {
                        log(config.name + '：图片抓取失败', error.stack);
                        return false;
                    }
                }

                const message = {
                    text: `【${feed.title}】更新了！`,
                    title: config.title ? `标题：${item.title}\n` : '',
                    content: $('video').length ? `${$.text()}\n${$('video').length}个视频，点击原链接查看` : $.text(),
                    translateText: config.translate ? `翻译：${(await translate($.text()))}\n` : '',
                    images: mediaArr === '' ? '' : ('媒体：\n' + mediaArr + '\n'),
                    url: item.link,
                    date: dayjs(item.pubDate).format('YY年M月D日HH:mm:ss'),
                }

                send(message, config.group_id).then(() => {
                    log(`${config.name} 更新发送成功`);
                    del.sync('./tmp');
                }).catch(err => {
                    log(config.name + '更新发送失败', err.stack);
                    del.sync('./tmp');
                })
            }
        })
        .catch(err => {
            if (err.statusCode) {
                log(config.name + '请求RSSHub失败', err.statusCode);
            } else {
                log(config.name + '请求RSSHub失败', err.stack);
            }
        })
};

credentials.rss.forEach((config, index) => {
    setTimeout(() => {
        grss(config);
        setInterval(() => {
            grss(config);
        }, 1000 * 60 * 5);
    }, 1000 * 10 * index);
})