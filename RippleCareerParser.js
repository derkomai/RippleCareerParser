const jsdom = require("jsdom");
const { JSDOM } = jsdom;
var https = require('https');
var fs = require('fs');

var url = 'https://www.ripple.com/company/careers/all-jobs';

var colors = {'reset': '\x1b[0m', 
              'blue': '\x1b[34m', 
              'green': '\x1b[32m', 
              'yellow': '\x1b[33m', 
              'blink': '\x1b[5m'};


function findMatchingClosingBracket(string, firstPos){

    var found = false;
    var pos = firstPos;
    var i = 1;

    while(!found) {

        openPos = string.indexOf('[', pos+1);
        closePos = string.indexOf(']', pos+1);

        if (openPos == -1 && closePos == -1) {
            return -1;
        } else if (openPos == -1 || (openPos != -1 && (openPos > closePos))) {
            i--;
            pos = closePos;
        } else if (closePos == -1 || closePos != -1 && (openPos < closePos)) {
            i++;
            pos = openPos;
        }

        if (i === 0) {
            found = true;
        }
    }

    return pos;
}
    
    
function processData(dom) {

    var jobs = {};

    for(var i = 0; i < dom.window.document.scripts.length; i++){

        if(dom.window.document.scripts[i].type.toLowerCase() == 'text/javascript') {
            if(dom.window.document.scripts[i].text.includes('ghjb_json')) {

                var text = dom.window.document.scripts[i].text;
                start = text.indexOf('ghjb_json');
                start = text.indexOf('[', start);
                end = findMatchingClosingBracket(text, start) + 1;
                text = text.substring(start, end);
                var json = JSON.parse(text);

                for(i=0; i<json.length; i++) {

                    for (j=0; j<json[i]['departments'].length; j++) {

                        if(!(json[i]['departments'][j]['name'] in jobs)) {
                            jobs[json[i]['departments'][j]['name']] = [];
                        }

                        jobs[json[i]['departments'][j]['name']].push({
                            'title': json[i]['title'],
                            'absolute_url': json[i]['absolute_url'],
                            'id': json[i]['id'],
                            'location': json[i]['location'],
                            'updated_at': json[i]['updated_at']
                        });
                    }
                }

                var lastJobIDs = [];
                var lastJobIDsFileExists = false;

                if (fs.existsSync('lastJobIDs.json')) {
                    var rawdata = fs.readFileSync('lastJobIDs.json');
                    lastJobIDs = JSON.parse(rawdata);
                    lastJobIDsFileExists = true;
                }

                var jobIDs = [];

                Object.keys(jobs).sort().forEach(function (department) {
                    console.log(colors['blue'] + department);
                    console.log('-'.repeat(department.length))
                    
                    jobs[department].forEach(function (job)  {
                        
                        jobIDs.push(job['id']);

                        var color = colors['reset'];

                        if(job['location']['name'] == 'Remote'){
                            color += colors['green'];
                        }

                        if(lastJobIDsFileExists && !(lastJobIDs.includes(job['id']))){
                            color += colors['blink'] + colors['yellow'];
                        }

                        console.log(color + '    ' + job['title'].trim() + ' (' + job['location']['name'] + ')');
                    });
                    console.log(colors['reset']);
                });

                fs.writeFile('lastJobIDs.json', JSON.stringify(jobIDs, null, 2), 'utf8', function(err) {
                    if(err) {
                        return console.log(err);
                    }
                });
            }
        }
    }
};


https.get(url, res => {
    res.setEncoding("utf8");
    let body = "";
    res.on("data", data => {
        body += data;
    });
    res.on("end", () => {
        processData(new JSDOM(body));
    });
})