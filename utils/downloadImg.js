const Agent = require('socks5-http-client/lib/Agent');
const Agent_s = require('socks5-https-client/lib/Agent');
const rp = require('request-promise');
const credentials = require('../credentials');
const fileType = require('file-type');
const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const tmpDir = path.join(__dirname, '../tmp');

module.exports = function (imgarr) {
    return new Promise((resolve, reject) => {
        let promises = new Array();
        let files = new Array();
        imgarr.forEach(src => {
            let agentClass;
            if (/https/.test(src)) {
                agentClass = Agent_s;
            } else if (/http/.test(src)) {
                agentClass = Agent;
            } else {
                return false;
            }
            let rpconfig = {
                method: 'GET',
                url: src,
                timeout: 1000 * 60,
                encoding: null
            }
            if (credentials.proxy) {
                rpconfig.agentClass = agentClass;
                rpconfig.agentOptions = {
                    socksHost: credentials.proxyConfig.socksHost,
                    socksPort: credentials.proxyConfig.socksPort
                }
            }
            promises.push(rp(rpconfig))
        });
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
        Promise.all(promises).then(e => {
            e.forEach(response => {
                const imgType = fileType(response).ext;
                const imgPath = path.join(__dirname, `../tmp/${_.random(0, 999999)}.${imgType}`);
                fs.writeFileSync(imgPath, response);
                files.push(imgPath);
            });
            resolve(files);
        }).catch(err => {
            reject(err);
        })
    })
}