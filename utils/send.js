const CQHttp = require('cqhttp');
const credentials = require('../credentials');
const _ = require('lodash');

const bot = new CQHttp({
    apiRoot: 'http://127.0.0.1:5700/',
    accessToken: credentials.accessToken,
    secret: credentials.secret
});

bot.listen(8989, '127.0.0.1');

module.exports = function(message, group){
    return new Promise((resolve, reject) => {
        let c = {
            message: `${message.text}\n` +
                '----------------------------------\n' +
                `${message.title}` +
                `内容：${message.content}\n` +
                `${message.translateText}` +
                `${message.images}` +
                '----------------------------------\n' +
                `原链接：${message.url}\n` +
                `日期：${message.date}`
        }
        if(_.isArray(group)){
            let sendArr = [];
            _.chain(group).each(group_id => {
                sendArr.push(
                    bot('send_group_msg', _.chain(c).assign({
                        group_id: group_id
                    }).value())
                )
            }).value();
            Promise.all(sendArr).then(resolve).catch(reject);
        } else {
            bot('send_group_msg', _.chain(c).assign({
                group_id: group
            }).value()).then(resolve).catch(reject);
        }
    })
}