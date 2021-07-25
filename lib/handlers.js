const config = require('./config');
const _data = require('./data');
const helpers = require('./helpers');

// Request Handlers
const handlers = {
    // Ping: check whether the web app is up and running
    ping: (data, callback) => {
        callback(200, {message: 'pong'});
    },
    // Users handler
    users: (data, callback) => {
        if(config.userMethods.includes(data.method)) {
            handlers._users[data.method](data, callback);
        } else {
            callback(405, {error: data.method.toUpperCase()+' method not allowed on route /'+data.path});
        }
    },
    // Container for user submethods
    _users: {
        get: (data, callback) => {
            const phone = (typeof(data.query.phone) == 'string' && data.query.phone.trim().length == 10) ? data.query.phone : false;
            if(phone) {
                const headerTokenId = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                handlers._tokens.verifyToken(headerTokenId, phone, (tokenIsValid) => {
                    if(tokenIsValid) {
                        _data.read('users', phone, (err, data) => {
                            if(!err && data) {
                                delete data.passwordHash;
                                callback(200, {user: data});
                            } else {
                                callback(404, {error: 'User not found.'})
                            }
                        });
                    } else {
                        callback(403, {error: 'Unauthorized.'});
                    }
                });
            } else {
                callback(400, {error: 'Invalid phone number.'})
            }
        },
        post: (data, callback) => {
            // Validation of the data payload
            const firstName = (typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0) ? data.payload.firstName.trim() : false;
            const lastName = (typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0) ? data.payload.lastName.trim() : false;
            const password = (typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0) ? data.payload.password.trim() : false;
            const phone = (typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length == 10) ? data.payload.phone.trim() : false;
            const tosAgreement = (typeof(data.payload.tosAgreement) === 'boolean' && data.payload.tosAgreement == true) ? true : false;
        
            if(firstName && lastName && password && phone && tosAgreement) {
                _data.read('users', phone, (err, data) => {
                    if(err) {
                        const passwordHash = helpers.hash(password);
                        if(passwordHash) {
                            const user = {
                                firstName,
                                lastName,
                                passwordHash,
                                phone,
                                tosAgreement
                            };
                    
                            _data.create('users', phone, user, (err) => {
                                if(!err) {
                                    callback(200, {success: 'User created successfully.'});
                                } else {
                                    console.log(err);
                                    callback(500, {error: 'Could not create new user.'})
                                }
                            });
                        } else {
                            callback(500, {error: 'Error hashing password.'});
                        }
                    } else {
                        callback(400, {error: 'User with such phone number already exists.'});
                    }
                });
            } else {
                callback(400, {error: 'Missing required fields.'});
            }
        },
        put: (data, callback) => {
            const phone = (typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length == 10) ? data.payload.phone.trim() : false;
            if(phone) {
                const firstName = (typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0) ? data.payload.firstName.trim() : false;
                const lastName = (typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0) ? data.payload.lastName.trim() : false;
                const password = (typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0) ? data.payload.password.trim() : false;
                if(firstName || lastName || password) {
                    const headerTokenId = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                    handlers._tokens.verifyToken(headerTokenId, phone, (tokenIsValid) => {
                        if(tokenIsValid) {
                            _data.read('users', phone, (err, userData) => {
                                if(!err && data) {
                                    if(firstName) {
                                        userData.firstName = firstName;
                                    }
                                    if(lastName) {
                                        userData.lastName = lastName;
                                    }
                                    if(password) {
                                        userData.passwordHash = helpers.hash(password);
                                    }
                                } else {
                                    callback(400, {error: 'Cannot update user that does not exist.'});
                                }
                                _data.update('users', phone, userData, (err) => {
                                    if(!err) {
                                        callback(200, {success: 'User updated successfully.'})
                                    } else {
                                        console.log(err);
                                        callback(500, {error: 'Could not update user.'})
                                    }
                                });
                            });
                        } else {
                            callback(403, {error: 'Unauthorized.'});
                        }
                    });
                } else {
                    callback(400, {error: 'Missing fields to update.'})
                }
            } else {
                callback(400, {error: 'Valid phone number required.'})
            }
        },
        delete: (data, callback) => {
            const phone = (typeof(data.query.phone) == 'string' && data.query.phone.length == 10) ? data.query.phone : false;
            if(phone) {
                const headerTokenId = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                handlers._tokens.verifyToken(headerTokenId, phone, (tokenIsValid) => {
                    if(tokenIsValid) {
                        _data.read('users', phone, (err, userData) => {
                            if(!err && userData) {
                                _data.delete('users', phone, (err) => {
                                    if(!err) {
                                        const userChecks = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];
                                        if (userChecks.length > 0) {
                                            let deleteErrors = false;
                                            userData.checks.forEach((checkId, index) => {
                                                _data.delete('checks', checkId, (err) => {
                                                    if(err) {
                                                        deleteErrors = true;
                                                    }
                                                    console.log(deleteErrors, index);
                                                    if(userChecks.length-1 === index) {
                                                        if(!deleteErrors) {
                                                            callback(200, {success: 'User deleted successfully along with their checks.'});
                                                        } else {
                                                            callback(500, {error: "Something went wrong while deleting user checks."});
                                                        }
                                                    }
                                                });
                                            });
                                        } else {
                                            callback(200, {success: 'User deleted successfully.'});
                                        }
                                    } else {
                                        callback(500, {error: 'Could not delete user.'})
                                    }
                                });
                            } else {
                                callback(400, {error: 'Cannot delete user that does not exist.'})
                            }
                        });
                    } else {
                        callback(403, {error: 'Unauthorized.'});
                    }
                });
            } else {
                callback(400, {error: 'Valid phone number required.'})
            }
        }
    },
    // Tokens handler
    tokens: (data, callback) => {
        if(config.userMethods.includes(data.method)) {
            handlers._tokens[data.method](data, callback);
        } else {
            callback(405, {error: data.method.toUpperCase()+' method not allowed on route /'+data.path});
        }
    },
    _tokens: {
        get: (data, callback) => {
            const tokenId = (typeof(data.query.tokenId) == 'string' && data.query.tokenId.trim().length == 24) ? data.query.tokenId : false;
            if(tokenId) {
                _data.read('tokens', tokenId, (err, data) => {
                    if(!err && data) {
                        callback(200, {token: data});
                    } else {
                        callback(404, {error: 'Token not found.'});
                    }
                });
            } else {
                callback(400, {error: 'Invalid token id.'});
            }
        },
        post: (data, callback) => {
            const password = (typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0) ? data.payload.password.trim() : false;
            const phone = (typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length == 10) ? data.payload.phone.trim() : false;
            if (phone && password) {
                _data.read('users', phone, (err, data) => {
                    if(!err && data) {
                        const passwordHash = helpers.hash(password);
                        if(passwordHash === data.passwordHash) {
                            // Once we have a match, create token for user
                            const tokenId = helpers.createRandomString(12);
                            const expiresIn = Date.now() + 60*60*1000;
                            const token = {
                                tokenId,
                                phone,
                                expiresIn
                            }
                            _data.create('tokens', tokenId, token, (err) => {
                                if(!err) {
                                    callback(200, {success: 'Token created successfully.'});
                                } else {
                                    callback(500, {error: 'Could not create token.'});
                                }
                            });
                        } else {
                            callback(401, {error: 'Bad credentials.'});
                        }

                    } else {
                        callback(400, {error: 'Could not find user.'})
                    }
                });
            } else {
                callback(400, {error: 'Missing required fields.'});
            }
        },
        put: (data, callback) => {
            const tokenId = (typeof(data.payload.tokenId) == 'string' && data.payload.tokenId.trim().length == 24) ? data.payload.tokenId : false;
            const extend = typeof(data.payload.extend) == 'boolean' ? data.payload.extend : false;
            if(tokenId && extend) {
                _data.read('tokens', tokenId, (err, tokenData) => {
                    if(!err && tokenData) {
                        if(Date.now() < tokenData.expiresIn) {
                            tokenData.expiresIn = Date.now() + 60*60*1000;
                            _data.update('tokens', tokenId, tokenData, (err) => {
                                if(!err) {
                                    callback(200, {success: 'Token updated successfully.'})
                                } else {
                                    console.log(err);
                                    callback(500, {error: 'Could not update token.'})
                                }
                            });
                        } else {
                            callback(400, {error: 'Token has already expired.'});
                        }
                    } else {
                        callback(400, {error: 'Token does not exist.'});
                    }
                });
            } else {
                callback(400, {error: 'Missing or invalid required fields to update token.'});
            }
        },
        delete: (data, callback) => {
            const tokenId = (typeof(data.query.tokenId) == 'string' && data.query.tokenId.trim().length == 24) ? data.query.tokenId : false;
            if(tokenId) {
                _data.read('tokens', tokenId, (err, data) => {
                    if(!err && data) {
                        _data.delete('tokens', tokenId, (err) => {
                            if(!err) {
                                callback(200, {success: 'Token deleted successfully.'});
                            } else {
                                callback(500, {error: 'Could not delete token.'})
                            }
                        });
                    } else {
                        callback(400, {error: 'Cannot delete token that does not exist.'})
                    }
                });
            } else {
                callback(400, {error: 'Valid phone number required.'})
            }
        },
        verifyToken: (tokenId, phone, callback) => {
            _data.read('tokens', tokenId, (err, data) => {
                if(!err && data) {
                    if((data.phone == phone && data.expiresIn > Date.now())) {
                        callback(true);
                    } else {
                        callback(false);
                    }
                } else {
                    callback(false);
                }
                // callback((!err && data) 
                // && (data.phone == phone && data.expiresIn > Date.now()));
            });
        }
    },
    // Checks handler
    checks: (data, callback) => {
        if(config.userMethods.includes(data.method)) {
            handlers._checks[data.method](data, callback);
        } else {
            callback(405, {error: data.method.toUpperCase()+' method not allowed on route /'+data.path});
        }
    },
    // Container for check submethods
    _checks: {
        get: (data, callback) => {
            const id = typeof(data.query.id) == 'string' && data.query.id.trim().length == 24 ? data.query.id.trim() : false;
            if(id) {
                _data.read('checks', id, (err, checkData) => {
                    if(!err && checkData) {
                        const headerTokenId = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                        handlers._tokens.verifyToken(headerTokenId, checkData.phone, (tokenIsValid) => {
                            if(tokenIsValid) {
                                callback(200, {check: checkData});
                            } else {
                                callback(403, {error: 'Unauthorized.'});
                            }
                        });
                    } else {
                        callback(404, {error: 'Check not found.'});
                    }
                });
            } else {
                callback(400, {error: 'Missing required fields.'})
            }
        },
        post: (data, callback) => {
            const protocol = (typeof(data.payload.protocol) === 'string' && ['http', 'https'].includes(data.payload.protocol)) ? data.payload.protocol : false;
            const url = (typeof(data.payload.url) === 'string' && data.payload.url.trim().length > 0) ? data.payload.url.trim() : false;
            const method = (typeof(data.payload.method) === 'string' && ['get', 'post', 'put', 'delete'].includes(data.payload.method)) ? data.payload.method : false;
            const successCodes = typeof(data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
            const timeoutSeconds = (typeof(data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5) ? data.payload.timeoutSeconds : false;

            if(protocol && url && method && successCodes && timeoutSeconds) {
                const headerTokenId = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                _data.read('tokens', headerTokenId, (err, tokenData) => {
                    if(!err && tokenData) {
                        const phone = tokenData.phone;
                        _data.read('users', phone, (err, userData) => {
                            if(!err && userData) {
                                let userChecks = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];
                                if (userChecks.length < config.maxChecks) {
                                    const checkId = helpers.createRandomString(12);
                                    const check = {
                                        id: checkId,
                                        phone,
                                        protocol, 
                                        url,
                                        method,
                                        successCodes,
                                        timeoutSeconds
                                    }
                                    _data.create('checks', checkId, check, (err) => {
                                        if(!err) {
                                            userData.checks = [...userChecks, checkId];
                                            _data.update('users', phone, userData, (err) => {
                                                if(!err) {
                                                    callback(200, {success: `Check added (Current number of checks: ${userData.checks.length}).`, data: check});
                                                } else {
                                                    callback(500, {error: 'Could not update user with new check.'});
                                                }
                                            });
                                        } else {
                                            callback(500, {error: 'Could not create check.'});
                                        }
                                    });
                                } else {
                                    callback(400, {error: `User cannot exceed maximum number of checks (${config.maxChecks}).`});
                                }
                            } else {
                                callback(403, {error: 'Unauthorized.'});
                            }
                        });
                    } else {
                        callback(403, {error: 'Unauthorized.'});
                    }
                });
            } else {
                callback(400, {error: 'Missing required fields.'});
            }
        },
        put: (data, callback) => {
            const id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 24 ? data.payload.id.trim() : false;

            if(id) {
                const protocol = (typeof(data.payload.protocol) === 'string' && ['http', 'https'].includes(data.payload.protocol)) ? data.payload.protocol : false;
                const url = (typeof(data.payload.url) === 'string' && data.payload.url.trim().length > 0) ? data.payload.url.trim() : false;
                const method = (typeof(data.payload.method) === 'string' && ['get', 'post', 'put', 'delete'].includes(data.payload.method)) ? data.payload.method : false;
                const successCodes = typeof(data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
                const timeoutSeconds = (typeof(data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5) ? data.payload.timeoutSeconds : false;
                
                if(protocol || url || method || successCodes || timeoutSeconds) {
                    _data.read('checks', id, (err, checkData) => {
                        if(!err && checkData) {
                            const headerTokenId = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                            handlers._tokens.verifyToken(headerTokenId, checkData.phone, (tokenIsValid) => {
                                if(tokenIsValid) {
                                    if(protocol) {
                                        checkData.protocol = protocol;
                                    }
                                    if(url) {
                                        checkData.url = url;
                                    }
                                    if(method) {
                                        checkData.method = method;
                                    }
                                    if(timeoutSeconds) {
                                        checkData.timeoutSeconds = timeoutSeconds;
                                    }
                                    if(successCodes) {
                                        checkData.successCodes = successCodes;
                                    }
                                    _data.update('checks', id, checkData, (err) => {
                                        if(!err) {
                                            callback(200, {success: 'Check updated successfullly.'})
                                        } else {
                                            console.log(err);
                                            callback(500, {error: 'Could not update check.'});
                                        }
                                    });
                                } else {
                                    callback(403, {error: 'Unauthorized.'});
                                }
                            });
                        } else {
                            callback(404, {error: 'Check not found.'});
                        }
                    });
                } else {
                    callback(400, {error: "Missing fields to update check."});
                }
            } else {
                callback(400, {error: "Missing required fields."});
            }
        },
        delete: (data, callback) => {
            const id = typeof(data.query.id) == 'string' && data.query.id.trim().length == 24 ? data.query.id.trim() : false;

            if(id) {
                _data.read('checks', id, (err, checkData) => {
                    if (!err && checkData) {
                        const headerTokenId = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                        handlers._tokens.verifyToken(headerTokenId, checkData.phone, (tokenIsValid) => {
                            if(tokenIsValid) {
                                    _data.delete('checks', id, (err) => {
                                        if(!err) {
                                            _data.read('users', checkData.phone, (err, userData) => {
                                                if(!err && userData) {
                                                    let userChecks = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];
                                                    if(userChecks.length !== 0) {
                                                        userData.checks = userChecks.filter(check => check != id);
                                                        _data.update('users', checkData.phone, userData, (err) => {
                                                            if (!err) {
                                                                callback(200, {success: "Check deleted successfully."});
                                                            } else {
                                                                callback(500, {error: "Could not update checks on the user."});
                                                            }
                                                        });
                                                    } else {
                                                        callback(500, {error: "User did not have any checks saved (did not remove check for user)."});
                                                    }
                                                } else {
                                                    callback(500, {error: "Could not find user who created check (did not remove check for user)."});
                                                }
                                            });
                                        } else {
                                            console.log(err);
                                            callback(500, {error: "Could not delete check."});
                                        }
                                    });
                            } else {
                                callback(403, {error: "Unauthorized."});
                            }
                        });
                    } else {
                        callback(404, {error: "Check not found."});
                    }
                });
            } else {
                callback(400, {error: "Missing required field."});
            }
        }
    },
    // Catch all / Not found handler
    notFound: (data, callback) => {
        callback(404);
    }
};

module.exports = handlers;