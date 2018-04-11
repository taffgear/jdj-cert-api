"use strict"

const fs            = require('fs');
const path          = require('path');
const bb            = require('bluebird');
const express       = require("express");
const basicAuth     = require('express-basic-auth');
const cors          = require('cors');
const multer        = require('multer');
const bodyParser    = require("body-parser");
const crypto        = require('crypto');
const moment        = require('moment');
const nconf         = require('nconf');
const sql 		      = bb.promisifyAll(require("mssql"));
const Redis         = require('ioredis');
const get           = require('lodash/get');

const handlers      = require('./handlers');

const cnf           = nconf.argv().env().file({ file: path.resolve(__dirname + '/config.json') });

get_insts(cnf).then(setup).then(run).catch(console.log);

const user      = cnf.get('auth:username') || null;
const pass      = cnf.get('auth:password') || null;
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

    }).tap(insts => {
        return insts.redis.get('jdj:settings').then(result => {
          insts.settings = (result ? JSON.parse(result) : {});

          return insts;
        });
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
   })
   .catch(e => {
     console.log(e);
     return null;
   });
}

function setup(insts)
{
    const updateSettings = (req, res, next) => {
        const watchDir = req.body.watch_dir;

        insts.settings.watch_dir  = (watchDir.length && watchDir.substr(-1) !== '/' ? watchDir + '/' : watchDir);
        insts.settings.approved   = get(req, 'body.approved', null);
        insts.settings.unapproved = get(req, 'body.unapproved', null);
        insts.settings.expired    = get(req, 'body.expired', null);
        
        req.body.watch_dir = watchDir;

        next();
    };

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

    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const sWatchDir = get(insts.settings, 'watch_dir');

        if (sWatchDir && fs.existsSync(sWatchDir))
            cb(null, sWatchDir);
        else
          cb(null, cnf.get('watchdir'));
      },
      filename: (req, file, cb) => {
        cb(null, file.originalname);
      }
    });

    const upload =  multer({ storage });

    insts.app.use(bodyParser.json({ limit: '50mb' }));
    insts.app.use(bodyParser.urlencoded({ extended: true }));

    insts.app.use((req, res, next) => {
      req.mssql     = insts.mssql;
      req.redis     = insts.redis;
      req.settings  = insts.settings;
      req.upload    = upload;

      next();
    });

    insts.app.get("/stock/find/:itemno", validate, handlers.stock.find);
    insts.app.get("/stock/findin", validate, handlers.stock.findIn);
    insts.app.put("/stock", validate, handlers.stock.update);
    insts.app.get("/stock/approved/:limit", validate, handlers.stock.approved);
    insts.app.get("/stock/unapproved/:limit", validate, handlers.stock.unapproved);
    insts.app.get("/stock/expired/:limit", validate, handlers.stock.expired);
    insts.app.get("/contdoc/find/:itemno", validate, handlers.contdoc.find);
    insts.app.post("/contdoc", validate, handlers.contdoc.create);
    insts.app.get("/contitem/status/:date", validate, handlers.contitem);
    insts.app.post("/files", validate, upload.fields([{ name: "documents" }]), handlers.files.upload);
    insts.app.get("/logs", validate, handlers.logs);
    insts.app.get("/settings", validate, handlers.settings.get);
    insts.app.put("/settings", validate, updateSettings, handlers.settings.update );
    insts.app.use(handlers.error);

    return insts;
}

function run(insts)
{
    insts.app.listen(cnf.get('bind:port') || 3000, () => {
        console.log("Listening on port %s...", cnf.get('bind:port'));
    });
}
