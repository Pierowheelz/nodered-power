const http = require('http');
const url = require('url');
const fs = require('fs');

const boolPath = '/mnt/user/appdata/scripts/';
let boolFile = 'prevent_shutdown.bool';

http.createServer(function (req, res) {
    let data = [];
    req.on('data', chunk => {
        data.push(chunk);
    });
    req.on('end', () => {
        if( data.length ){
            const key = JSON.parse(data).key;
            console.log('Got key: '+key);
        }
    });
    
    const parsedUrl = url.parse(req.url,true);
    const query = parsedUrl.query;
    const path = parsedUrl.pathname;
    
    if( typeof query.time == "undefined" || undefined == query.time || !query.time ){
        res.writeHead(401, {'Content-Type': 'text/plain'});
        res.end('Unauthorised');
        return;
    }
    
    //validate time
    let reqTime = query.time;
    if( !reqTime ){
        res.writeHead(401, {'Content-Type': 'text/plain'});
        res.end('Unauthorised');
        return;
    }
    const reqDateTime = new Date( parseInt(reqTime) );
    const hours = reqDateTime.getHours();
    const minutes = reqDateTime.getMinutes();
    
    if( isNaN(hours) ){
        res.writeHead(401, {'Content-Type': 'text/plain'});
        res.end('Invalid Date');
        return;
    }
    
    console.log('Request time: '+hours+':'+minutes+' ('+reqTime+')');
    
    const now = new Date();
    const nowHours = now.getHours();
    const nowMinutes = now.getMinutes();
    //add a minute to account for any delay in transmission or server differences
    let rangeUpperMinutes = nowMinutes + 1;
    let rangeUpperHours = nowHours;
    if( rangeUpperMinutes >= 60 ){
        rangeUpperMinutes = 0;
        rangeUpperHours += 1;
        if( rangeUpperHours >= 24 ){
            rangeUpperHours = 0;
        }
    }
    //subtract a minute for server difference the other way
    let rangeLowerMinutes = nowMinutes - 1;
    let rangeLowerHours = nowHours;
    if( rangeLowerMinutes < 0 ){
        rangeLowerMinutes = 59;
        rangeLowerHours -= 1;
        if( rangeLowerHours < 0 ){
            rangeLowerHours = 23;
        }
    }
    console.log('Server lower: '+rangeLowerHours+':'+rangeLowerMinutes);
    console.log('Server upper: '+rangeUpperHours+':'+rangeUpperMinutes);
    
    let valid_request = false;
    if( hours >= rangeLowerHours && minutes >= rangeLowerMinutes && hours <= rangeUpperHours && minutes <= rangeUpperMinutes ){
        valid_request = true;
    }
    
    if( !valid_request ){
        console.log('Delayed request - not processing');
        res.writeHead(401, {'Content-Type': 'text/plain'});
        res.end('Invalid');
        return;
    }
    
    
    let remoteUrl = "";
    
    let update = false;
    let toggle = false;
    
    let newValue = '0';
    
    switch( path ){
        case '/read':
            console.log('Read boolean status');
            break;
        case '/readimmediate':
            console.log('Read boolean status');
            boolFile = 'immediate_shutdown.bool';
            break;
        case '/toggle':
            console.log('Toggle');
            toggle = true;
            update = true;
            break;
        case '/set':
            console.log('Set');
            if( typeof query.state == "undefined" || undefined == query.state ){
                res.writeHead(401, {'Content-Type': 'text/plain'});
                res.end('Error: No new state provided');
                return;
            }
            newValue = '1'==query.state ? '1':'0';
            
            update = true;
            break;
        case '/setimmediate':
            console.log('Set Immediate');
            if( typeof query.state == "undefined" || undefined == query.state ){
                res.writeHead(401, {'Content-Type': 'text/plain'});
                res.end('Error: No new state provided');
                return;
            }
            boolFile = 'immediate_shutdown.bool';
            newValue = '1'==query.state ? '1':'0';
            
            update = true;
            break;
        default:
            console.log('invalid path');
            res.writeHead(401, {'Content-Type': 'text/plain'});
            res.end('Invalid');
            return;
            break;
    }
    
    const contents = fs.readFileSync(boolPath + boolFile, 'utf8').trim();
    console.log('File contents: '+contents);
    console.log( typeof contents );
    let curValue = '1'==contents ? '1' : '0';
    console.log('Current State: '+newValue);
    
    if( toggle ){
        newValue = '1'==curValue ? '0':'1';
    }
    
    if( update && curValue !== newValue ){
        //update the file
        const result = fs.writeFileSync(boolPath + boolFile, newValue+"\r\n");
    }
    
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end(newValue);
}).listen(8202);
