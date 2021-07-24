const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

// This lib container holds methods that write and edit the files that we hold in the .data directory, in different subfolders that will play the role of tables and the files inside the roles of records.
const lib = {
    baseDir: path.join(__dirname, './../.data/'),
    read: (dir, file, callback) => {
        fs.readFile(lib.baseDir+dir+'/'+file+'.json', 'utf-8', (err, data) => {
            if(!err && data) {
                callback(false, helpers.parseJSON(data));
            } else {
                callback(err, data);
            }
        });
    },
    create: (dir, file, data, callback) => {
        fs.open(lib.baseDir+dir+'/'+file+'.json', 'wx', (err, fd) => {
            if(err || !fd) {
                callback(`Could not create file with name ${file}, it may already exist.`);
            }
    
            const dataString = JSON.stringify(data);
            fs.writeFile(fd, dataString, (err) => {
                if (err) {
                    callback('Error writing new file.');
                }
                fs.close(fd, (err) => {
                    if (err) {
                        callback('Error closing new file.');
                    }
                    callback(false);
                });
            });
        });
    },
    update: (dir, file, data, callback) => {
        fs.open(lib.baseDir+dir+'/'+file+'.json', 'r+', (err, fd) => {
            if(err || !fd) {
                callback(`Could not open the file with name ${file} for update.`);
            }
            const dataString = JSON.stringify(data);
            fs.ftruncate(fd, (err) => {
                if(err) {
                    callback('Error truncating the file.');
                }
                fs.writeFile(fd, dataString, (err) => {
                    if(err) {
                        callback('Error writing to the file.');
                    }
                    fs.close(fd, (err) => {
                        if(err) {
                            callback('Error closing the file.')
                        }
                        callback(false);
                    });
                });
            });
        });
    },
    delete: (dir, file, callback) => {
        fs.unlink(lib.baseDir+dir+'/'+file+'.json', (err) => {
            callback(err);
        })
    }
};


module.exports = lib;

