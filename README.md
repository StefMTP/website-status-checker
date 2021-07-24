## Data usage

    _data.create('test', 'testfile', {'data': 'this is a test to check the file is ok writing some shit'}, (err) => {
        if (err) {
            console.log(err);
        }
    });

    _data.update('test', 'testfile', {'data': 'awdlhawjdhawe', 'foo': 'bar'}, (err) => {
        if(err) {
            console.log(err);
        };
    });

    _data.read('test', 'testfile', (err, data) => {
        if(err) {
            throw new Error(err);
        }
        console.log(data);
    });

    _data.delete('test', 'testfile', (err) => {
        if(err) {
            console.log(err);
        }
    });