const credentials = require('../credentials');
const MD5 = require('js-md5');
const rp = require('request-promise');
const appid = credentials.baidu.appid;
const key = credentials.baidu.key;
const from = 'auto';
const to = 'zh';

module.exports = async (str) => {
    const salt = (new Date).getTime();
    const query = str.replace(/(http|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&:/~\+#]*[\w\-\@?^=%&/~\+#])?/g, '');
    const str1 = appid + query + salt + key;
    const sign = MD5(str1);
    try {
        let data = await rp.get('http://api.fanyi.baidu.com/api/trans/vip/translate', {
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
    } catch (error) {
        return '翻译出错';
    }
}
