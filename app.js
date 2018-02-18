"use strict"

const path          = require('path');
const bb            = require('bluebird');
const express       = require("express");
const basicAuth     = require('express-basic-auth');
const cors          = require('cors');
const multer        = require('multer');
const bodyParser    = require("body-parser");
const rateLimit     = require('express-rate-limit');
const crypto        = require('crypto');
const moment        = require('moment');
const nconf         = require('nconf');
const sql 		      = bb.promisifyAll(require("mssql"));
const Redis         = require('ioredis');

const handlers      = require('./handlers');

const cnf     = nconf.argv().env().file({ file: path.resolve(__dirname + '/config.json') });
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, cnf.get('watchdir'))
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
})

const upload  = multer({ storage });

get_insts(cnf).then(setup).then(run).catch(console.log);

const rateLimitOptions = {
    windowMs    : cnf.get('ratelimit:window') * 1000 || 15*60*1000, // 15 minutes
    max         : cnf.get('ratelimit:max') || 100, // limit each IP to x requests per windowMs
    delayMs     : 0, // disable delaying - full speed until the max limit is reached
    headers     : true,
    statusCode  : 429,
    message     : 'Too many requests, please try again later.',
    handler     : (req, res, next) => {
        if (rateLimitOptions.headers) {
            const ts = moment().add(Math.ceil(rateLimitOptions.windowMs / 1000), 'seconds');

            res.setHeader('Retry-After', ts.toString());
        }

        res.format({
            html: function(){
                res.status(rateLimitOptions.statusCode).end(rateLimitOptions.message);
            },
            json: function(){
                res.status(rateLimitOptions.statusCode).json({ message: rateLimitOptions.message });
            }
        });
    }
};

const user      = cnf.get('auth:username') || null;
const pass      = cnf.get('auth:password') || null;
const limiter   = new rateLimit(rateLimitOptions);
const validate  = (req, res, next) => {
    if (cnf.get('auth:secret')) {
        // get signature.
        const retrievedSignature = req.headers["x-signature"];

        // recalculate signature.
        const computedSignature = crypto.createHmac("sha256", cnf.get('auth:secret')).update(JSON.stringify(req.body)).digest("hex");

        // compare signatures.
        if (computedSignature !== retrievedSignature)
            return res.status(403).send('X-Signature validation failed.')
    }

    next();
};

function get_insts(cnf)
{
    return bb.props({
        app     : express(),
        mssql   : getMssqlConn(),
        redis   : new Redis()

    });
}

function getMssqlConn()
{
  return sql.connect({
    user		  : cnf.get('sql:user'),
    password	: cnf.get('sql:password'),
    server 		: cnf.get('sql:server'),
    database	: cnf.get('sql:database')
  }).then((conn) => {
    console.log('connected to database: %s', cnf.get('sql:database'));
    return conn;
   });
}

function setup(insts)
{
    insts.app.use(cors({
      origin: '*',
      credentials: true,
      optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
    }));

    if (user && pass) {
        insts.app.use(basicAuth({
            users: { [user]: pass },
            unauthorizedResponse: 'No valid credentials provided'
        }));
    }

    insts.app.use(bodyParser.json({ limit: '50mb' }));
    insts.app.use(bodyParser.urlencoded({ extended: true }));
    insts.app.use(limiter);

    insts.app.use((req, res, next) => {
      req.mssql   = insts.mssql;
      req.upload  = upload;
      req.redis   = insts.redis;

      next();
    });

    insts.app.get("/stock/find/:itemno", validate, handlers.stock.find);
    insts.app.put("/stock", validate, handlers.stock.update);
    insts.app.get("/stock/approved", validate, handlers.stock.approved);
    insts.app.get("/stock/unapproved", validate, handlers.stock.unapproved);
    insts.app.get("/stock/expired", validate, handlers.stock.expired);
    insts.app.get("/contdoc/find/:itemno", validate, handlers.contdoc.find);
    insts.app.post("/contdoc", validate, handlers.contdoc.create);
    insts.app.post("/files", validate, upload.fields([{ name: "documents" }]), handlers.files.upload);
    insts.app.get("/logs", validate, handlers.logs);

    insts.app.use(handlers.error);

    return insts;
}

function run(insts)
{
    insts.app.listen(cnf.get('bind:port') || 3000, () => {
        console.log("Listening on port %s...", cnf.get('bind:port'));
    });
}
