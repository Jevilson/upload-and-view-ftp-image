const express = require('express');
const fileUpload = require('express-fileupload');
const ftp = require('ftp');
require('dotenv').config()


const sizeBToReadableFormat = (sizeB) => {
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    let counter = 0;
    
    while (sizeB >= 1024) {
        sizeB /= 1024;
        counter++;
    }
    
    return `${sizeB.toFixed(2)} ${sizes[counter]}`;
};


const ftpConfig = {
    host: process.env.FTP_HOST,
    user: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
    port: process.env.FTP_PORT
};


const app = express();
app.use(fileUpload());

app.get('/', (req, res) => {
    res.send({error: false, version: 1.0, message: "Have a good time!"});
})

app.post('/upload', (req, res) => {
    if (!req.files) return res.status(400).send({ error: true});

    const file = req.files.image;
    const filename = Date.now() + file.name;
    const replaceName = filename.replace(/\s/g, '')

    let ftp_client = new ftp();
    ftp_client.on('ready', () => {
        ftp_client.put(file.data, replaceName, (err) => {
            if (err) return res.status(500).send(err);

            ftp_client.end();

            const file_link = `${process.env.URL_API}:${process.env.PORT_API}/image/${replaceName}`;
            return res.send({ error: false, file_name: replaceName, file_link, size: sizeBToReadableFormat(req.files.image.size), encoding: req.files.image.encoding, mimetype: req.files.image.mimetype });
        });
    });
    ftp_client.connect(ftpConfig);
});

app.get('/image/:filename', (req, res) => {
    const client = new ftp();
    client.on('ready', () => {
        client.list((err, list) => {
            if (err) {
                throw err;
            } else {
                list.forEach(file => {
                    if (file.name === req.params.filename) {
                        client.get(file.name, (err, stream) => {
                            if (err) {
                                throw err;
                            } else {
                                stream.pipe(res);
                            }
                        });
                    }
                });
            }
        });
    });
    client.connect(ftpConfig);
});

app.listen(process.env.PORT_API, () => {
    console.log('Server started on port ' + process.env.PORT_API);
});