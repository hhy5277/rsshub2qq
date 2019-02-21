const CQHttp = require('cqhttp');
const credentials = require('../credentials');
const _ = require('lodash');

const bot = new CQHttp({
    apiRoot: 'http://127.0.0.1:5700/',
    accessToken: credentials.accessToken,
    secret: credentials.secret
});

bot.listen(8989, '127.0.0.1');

module.exports = function (msg, group) {
    return new Promise((resolve, reject) => {
        const message = `${msg.text}\n` +
            '----------------------------------\n' +
            `${msg.title}` +
            `内容：${msg.content}\n` +
            `${msg.translateText}` +
            `${msg.images}` +
            '----------------------------------\n' +
            `原链接：${msg.url}\n` +
            `日期：${msg.date}`

        if (_.isArray(group)) {
            let sendArr = [];
            group.forEach(group_id => {
                sendArr.push(
                    bot('send_group_msg', {
                        group_id: group_id,
                        message: message
                    })
                )
            });
            Promise.all(sendArr).then(resolve).catch(reject);
        } else {
            bot('send_group_msg', {
                group_id: group,
                message: message
            }).then(resolve).catch(reject);
        }
    })
}